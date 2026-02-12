import { NextResponse } from "next/server";
import { AuthError, createLoginResponse, verifyCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "username and password are required" },
        { status: 400 }
      );
    }

    const user = await verifyCredentials(username, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return createLoginResponse(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
