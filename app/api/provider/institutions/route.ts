import { NextResponse } from "next/server";
import { getInstitutions, createInstitution } from "@/lib/licensing";

export async function GET() {
  try {
    const institutions = await getInstitutions();
    return NextResponse.json({
      success: true,
      institutions,
      total_count: institutions.length,
      active_count: institutions.filter((i) => i.status === "active").length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch institutions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.name || !body?.domain) {
      return NextResponse.json(
        { success: false, error: "Institution name and domain are required." },
        { status: 400 }
      );
    }

    const created = await createInstitution({
      name: body.name,
      domain: body.domain,
      tier: body.tier || "enterprise",
      max_seats: body.max_seats ? parseInt(body.max_seats) : 50,
      active_from: body.active_from || new Date().toISOString(),
      license_end: body.license_end,
      billing_contact: body.billing_contact || "",
      annual_contract_value: body.annual_contract_value
        ? parseFloat(body.annual_contract_value)
        : 24000,
    });

    return NextResponse.json({
      success: true,
      institution: created,
      message: `Institution '${created.name}' with domain '${body.domain}' registered successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create institution" },
      { status: 500 }
    );
  }
}
