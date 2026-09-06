import { createClient } from "@/lib/supabase/server";

export async function getRoutineActor(requireScheduler = false) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, profile: null, error: "Unauthorized", status: 401 } as const;
  const profileResult = await supabase.from("profiles").select("id, full_name, role").eq("id", user.id).maybeSingle();
  const profile = profileResult.data ?? { id: user.id, full_name: user.user_metadata?.full_name ?? user.email, role: user.user_metadata?.role ?? "junior" };
  if (requireScheduler && !["admin", "senior"].includes(profile.role)) return { supabase, user, profile, error: "Admin or senior role required", status: 403 } as const;
  return { supabase, user, profile, error: null, status: 200 } as const;
}
