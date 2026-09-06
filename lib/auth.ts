import { createClient } from "@/lib/supabase/server";
import { verifyEmailDomain, normalizeDomain } from "@/lib/licensing";

export type AccountType = "university_user" | "service_provider";

export interface Profile {
  id: string;
  email?: string;
  full_name: string | null;
  role: "admin" | "senior" | "junior";
  account_type: AccountType;
  institution_id?: string | null;
  institution_name?: string | null;
  institution_domain?: string | null;
  institution_tier?: string | null;
  is_super_admin: boolean;
  created_at: string;
}

/**
 * Checks whether an account is a Service Provider / Developer / Super-Admin
 * rather than a campus-specific university user.
 */
export function isServiceProvider(
  email?: string | null,
  isSuperAdmin?: boolean | null
): boolean {
  if (isSuperAdmin) return true;
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  return (
    cleanEmail.endsWith("@facultyos.io") ||
    cleanEmail.endsWith("@facultyos.internal") ||
    cleanEmail.startsWith("admin@facultyos.") ||
    cleanEmail.startsWith("dev@facultyos.") ||
    cleanEmail === "admin@facultyos.io" ||
    cleanEmail === "provider@facultyos.io"
  );
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

  const email = user.email || "";
  const meta = user.user_metadata || {};
  const isSuper =
    meta.is_super_admin === true ||
    meta.account_type === "service_provider" ||
    isServiceProvider(email);

  const supabase = createClient();
  let dbProfile: any = null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, institutions(name, slug, tier)")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data) {
      dbProfile = data;
    }
  } catch {
    // Database table or join fallback
  }

  // Determine Persona & University Tenancy
  if (isSuper || dbProfile?.is_super_admin) {
    return {
      id: user.id,
      email,
      full_name: dbProfile?.full_name || meta.full_name || "Platform Operator",
      role: "admin",
      account_type: "service_provider",
      institution_name: "FacultyOS Core Platform (Service Provider)",
      institution_domain: "facultyos.io",
      institution_tier: "enterprise",
      is_super_admin: true,
      created_at: dbProfile?.created_at || new Date().toISOString(),
    };
  }

  // For university users, resolve institution from email domain
  const domain = normalizeDomain(email);
  let instName = dbProfile?.institutions?.name || null;
  let instTier = dbProfile?.institutions?.tier || null;

  if (!instName && domain) {
    // Look up in licensing catalog
    try {
      const verification = await verifyEmailDomain(domain);
      if (verification.allowed && verification.institution) {
        instName = verification.institution.name;
        instTier = verification.institution.tier;
      }
    } catch {
      // fallback
    }
  }

  // Default campus fallback if testing without explicit domain
  if (!instName) {
    instName = "American University of Science & Engineering";
    instTier = "enterprise";
  }

  return {
    id: user.id,
    email,
    full_name: dbProfile?.full_name || meta.full_name || "Faculty Member",
    role: (dbProfile?.role || meta.role || "senior") as "admin" | "senior" | "junior",
    account_type: "university_user",
    institution_id: dbProfile?.institution_id || "inst-ause-001",
    institution_name: instName,
    institution_domain: domain || "ause.edu",
    institution_tier: instTier || "enterprise",
    is_super_admin: false,
    created_at: dbProfile?.created_at || new Date().toISOString(),
  };
}
