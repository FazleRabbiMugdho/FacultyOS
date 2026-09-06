import { NextResponse } from "next/server";
import { verifyEmailDomain } from "@/lib/licensing";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email || body?.domain;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        {
          allowed: false,
          domain: "",
          reason: "Please provide an email or domain to verify.",
        },
        { status: 400 }
      );
    }

    const result = await verifyEmailDomain(email);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Domain verification error:", error);
    return NextResponse.json(
      {
        allowed: false,
        domain: "",
        reason: error?.message || "Internal server error during verification.",
      },
      { status: 500 }
    );
  }
}
