import { NextResponse } from "next/server";
import { createLogoutResponse } from "@/lib/auth";

export async function POST() {
  try {
    return createLogoutResponse();
  } catch {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
