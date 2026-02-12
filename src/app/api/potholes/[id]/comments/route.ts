import { NextResponse } from "next/server";
import { AuthError, requireAuthenticatedUser } from "@/lib/auth";
import { addPotholeComment, getPotholeComments } from "@/lib/potholeStore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await getPotholeComments(id);
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Unable to fetch comments" },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuthenticatedUser(request);
    const body = (await request.json()) as { body?: unknown; text?: unknown };
    const text =
      typeof body.body === "string"
        ? body.body.trim()
        : typeof body.text === "string"
          ? body.text.trim()
          : "";

    if (!text) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const comment = await addPotholeComment({
      potholeId: id,
      author: user.displayName || user.username,
      body: text,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: (error as Error).message ?? "Unable to add comment" },
      { status: 400 }
    );
  }
}
