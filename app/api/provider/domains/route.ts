import { NextResponse } from "next/server";
import { toggleDomainStatus } from "@/lib/licensing";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { domain, is_active } = body;

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      );
    }

    await toggleDomainStatus(domain, Boolean(is_active));

    return NextResponse.json({
      success: true,
      domain,
      is_active: Boolean(is_active),
      message: `Domain @${domain} status updated to ${is_active ? "active" : "suspended"}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update domain status" },
      { status: 500 }
    );
  }
}
