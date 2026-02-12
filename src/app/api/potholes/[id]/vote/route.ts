import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import type { VoteDirection } from "@/lib/potholeTypes";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const direction = body.direction as VoteDirection;
    if (!direction || !["up", "down"].includes(direction)) {
      return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
    }
    const { id } = await params;
    const supabaseAdmin = getSupabaseAdmin();
    const store = await cookies();
    let voterId = store.get("paila_voter_id")?.value;

    if (!voterId) {
      voterId = crypto.randomUUID();
    }

    const value = direction === "up" ? 1 : -1;
    const voteRecord = { pothole_id: id, voter_id: voterId, value };
    const { error: voteError } = await supabaseAdmin
      .from("pothole_votes")
      .insert(voteRecord as never);

    if (voteError) {
      if (voteError.code === "23505") {
        const response = NextResponse.json(
          { error: "You already voted on this report." },
          { status: 409 }
        );
        if (!store.get("paila_voter_id")) {
          response.cookies.set("paila_voter_id", voterId, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
          });
        }
        return response;
      }

      return NextResponse.json(
        { error: voteError.message },
        { status: 500 }
      );
    }

    const { data: current, error: currentError } = await supabaseAdmin
      .from("potholes")
      .select("upvotes, downvotes")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { error: currentError?.message ?? "Pothole not found" },
        { status: 404 }
      );
    }

    const currentRow = current as unknown as {
      upvotes: number;
      downvotes: number;
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("potholes")
      .update({
        upvotes: currentRow.upvotes + (value === 1 ? 1 : 0),
        downvotes: currentRow.downvotes + (value === -1 ? 1 : 0),
      } as never)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    const response = NextResponse.json(updated);
    if (!store.get("paila_voter_id")) {
      response.cookies.set("paila_voter_id", voterId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Vote failed" },
      { status: 400 }
    );
  }
}
