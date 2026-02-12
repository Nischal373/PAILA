import { NextResponse } from "next/server";
import { AuthError, createLoginResponse, registerUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
      displayName?: unknown;
    };

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : undefined;

    if (!username || !password) {
      return NextResponse.json(
        { error: "username and password are required" },
        { status: 400 }
      );
    }

    const user = await registerUser({ username, password, displayName });
    return createLoginResponse(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
