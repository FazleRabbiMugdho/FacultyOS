import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, password, isProvider } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Use admin API to create or update the user with email confirmed (bypasses rate limits)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: isProvider ? "Platform Operator" : "Dr. Eleanor Vance",
        role: isProvider ? "service_provider" : "senior",
        account_type: isProvider ? "service_provider" : "university_user",
        is_super_admin: isProvider,
      },
    });

    if (error) {
      // If user already exists, update password and confirm email
      if (error.message.includes("already been registered")) {
        const { data: usersData } = await admin.auth.admin.listUsers();
        const existing = usersData?.users?.find((u) => u.email === email);
        if (existing) {
          await admin.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
            user_metadata: {
              full_name: isProvider ? "Platform Operator" : "Dr. Eleanor Vance",
              role: isProvider ? "service_provider" : "senior",
              account_type: isProvider ? "service_provider" : "university_user",
              is_super_admin: isProvider,
            },
          });
          return NextResponse.json({ success: true, userId: existing.id });
        }
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId: data.user.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
