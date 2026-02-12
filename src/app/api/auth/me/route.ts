import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = getSessionUser(request);
  return NextResponse.json({ user });
}
