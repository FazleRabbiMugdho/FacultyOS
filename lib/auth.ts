import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  full_name: string | null;
  role: "admin" | "senior" | "junior";
  created_at: string;
}

export async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Fallback profile for development / demo mode
    return {
      id: user.id,
      full_name: user.user_metadata?.full_name || "Faculty Member",
      role: (user.user_metadata?.role as "admin" | "senior" | "junior") || "junior",
      created_at: new Date().toISOString(),
    };
  }

  return profile as Profile;
}
