import { NextResponse } from "next/server";
import { updatePotholeStatus } from "@/lib/potholeStore";
import type { PotholeStatus } from "@/lib/potholeTypes";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const status = body.status as PotholeStatus;
    if (!status || !["reported", "scheduled", "in_progress", "fixed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const fixedTime = body.fixedTime as string | undefined;
    const { id } = await params;
    const updated = await updatePotholeStatus(id, status, fixedTime);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Unable to update status" },
      { status: 400 }
    );
  }
}
