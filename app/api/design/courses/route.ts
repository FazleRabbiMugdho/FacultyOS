import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateCourseSchema } from "@/lib/design/schemas";

async function getSupabase() {
  try {
    return createClient();
  } catch {
    return createAdminClient();
  }
}

export async function GET() {
  try {
    const supabase = await getSupabase();
    const { data: courses, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/design/courses error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ courses: courses || [] });
  } catch (err: any) {
    console.error("[GET /api/design/courses error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await getSupabase();
    const { data: userData } = await supabase.auth.getUser();

    const insertPayload = {
      code: parsed.data.code.toUpperCase(),
      title: parsed.data.title,
      description: parsed.data.description || null,
      credit_hours: parsed.data.credit_hours,
      owner: userData?.user?.id || null,
    };

    const { data: course, error } = await supabase
      .from("courses")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[POST /api/design/courses error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ course }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/design/courses error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create course" },
      { status: 500 }
    );
  }
}
