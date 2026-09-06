import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Institution,
  DomainVerificationResult,
  CreateInstitutionInput,
} from "./types";

// Helper: Safely get Supabase admin client (bypasses RLS) with server client fallback
function getSupabaseClient() {
  try {
    return createAdminClient();
  } catch {
    return createClient();
  }
}

// Resilient in-memory fallback store initialized with AUST, MIT, Stanford
const DEMO_INSTITUTIONS: Institution[] = [
  {
    id: "inst-aust-001",
    name: "Ahsanullah University of Science and Technology",
    slug: "aust",
    tier: "enterprise",
    status: "active",
    max_seats: 150,
    enrolled_seats: 42,
    active_from: "2024-01-10T00:00:00.000Z",
    license_end: "2027-01-10T00:00:00.000Z",
    billing_contact: "provost@aust.edu",
    annual_contract_value: 48000,
    domains: ["aust.edu"],
    created_at: "2024-01-10T00:00:00.000Z",
  },
  {
    id: "inst-mit-002",
    name: "Massachusetts Institute of Technology",
    slug: "mit",
    tier: "enterprise",
    status: "active",
    max_seats: 300,
    enrolled_seats: 184,
    active_from: "2023-09-01T00:00:00.000Z",
    license_end: "2026-09-01T00:00:00.000Z",
    billing_contact: "academic-it@mit.edu",
    annual_contract_value: 72000,
    domains: ["mit.edu"],
    created_at: "2023-09-01T00:00:00.000Z",
  },
  {
    id: "inst-stanford-003",
    name: "Stanford University",
    slug: "stanford",
    tier: "enterprise",
    status: "active",
    max_seats: 200,
    enrolled_seats: 89,
    active_from: "2024-03-15T00:00:00.000Z",
    license_end: "2026-03-15T00:00:00.000Z",
    billing_contact: "dean-eng@stanford.edu",
    annual_contract_value: 60000,
    domains: ["stanford.edu"],
    created_at: "2024-03-15T00:00:00.000Z",
  },
];

// In-process mutable store for demo / local persistence
let memoryInstitutions: Institution[] = [...DEMO_INSTITUTIONS];

// Helper: Normalize domain string (strips '@', whitespace, converts to lowercase)
export function normalizeDomain(input: string): string {
  if (!input) return "";
  let clean = input.trim().toLowerCase();
  if (clean.includes("@")) {
    clean = clean.split("@").pop() || "";
  }
  return clean.replace(/^@/, "").trim();
}

/**
 * Fetch all institutions with active domains and subscription metrics
 */
export async function getInstitutions(): Promise<Institution[]> {
  try {
    const supabase = getSupabaseClient();
    const { data: dbInsts, error: instError } = await supabase
      .from("institutions")
      .select("*, institution_domains(domain, is_active)")
      .order("created_at", { ascending: false });

    if (!instError && dbInsts && dbInsts.length > 0) {
      const mapped: Institution[] = dbInsts.map((item: any) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        tier: item.tier,
        status: item.status,
        max_seats: item.max_seats,
        enrolled_seats: item.enrolled_seats || 0,
        active_from: item.active_from,
        license_end: item.license_end,
        billing_contact: item.billing_contact || "",
        annual_contract_value: item.annual_contract_value || 0,
        domains: (item.institution_domains || [])
          .filter((d: any) => d.is_active)
          .map((d: any) => d.domain),
        created_at: item.created_at,
      }));

      // Merge with memoryInstitutions deduplicating by both ID and slug
      const existingKeys = new Set([
        ...mapped.map((m) => m.id),
        ...mapped.map((m) => m.slug.toLowerCase()),
      ]);
      const additionalMem = memoryInstitutions.filter(
        (m) => !existingKeys.has(m.id) && !existingKeys.has(m.slug.toLowerCase())
      );
      const combined = [...mapped, ...additionalMem];
      memoryInstitutions = combined;
      return combined;
    }
  } catch (err) {
    console.error("[Licensing] getInstitutions error:", err);
  }

  return memoryInstitutions;
}

/**
 * Verify whether an email address or domain has an active institutional license
 */
export async function verifyEmailDomain(
  emailOrDomain: string
): Promise<DomainVerificationResult> {
  const domain = normalizeDomain(emailOrDomain);

  if (!domain || !domain.includes(".")) {
    return {
      allowed: false,
      domain,
      reason: "Please enter a valid institutional email address (e.g. name@university.edu).",
    };
  }

  // Check Supabase first if available
  try {
    const supabase = getSupabaseClient();
    const { data: domainRecord, error: domainError } = await supabase
      .from("institution_domains")
      .select("*, institutions(*)")
      .eq("domain", domain)
      .eq("is_active", true)
      .maybeSingle();

    if (!domainError && domainRecord && domainRecord.institutions) {
      const inst = domainRecord.institutions;
      if (inst.status !== "active" && inst.status !== "trial") {
        return {
          allowed: false,
          domain,
          reason: `License for ${inst.name} is currently ${inst.status}. Please contact university administration.`,
        };
      }

      const enrolled = inst.enrolled_seats || 0;
      const maxSeats = inst.max_seats || 100;
      if (enrolled >= maxSeats) {
        return {
          allowed: false,
          domain,
          reason: `The license for ${inst.name} has reached its capacity (${maxSeats} seats). Please request additional seats.`,
        };
      }

      return {
        allowed: true,
        domain,
        institution: {
          id: inst.id,
          name: inst.name,
          slug: inst.slug,
          tier: inst.tier,
          status: inst.status,
          active_from: inst.active_from,
          seats_remaining: Math.max(0, maxSeats - enrolled),
          max_seats: maxSeats,
          enrolled_seats: enrolled,
        },
      };
    }
  } catch {
    // Fall back to memory check
  }

  // In-memory verification fallback
  const matched = memoryInstitutions.find((inst) =>
    inst.domains.map((d) => d.toLowerCase()).includes(domain)
  );

  if (!matched) {
    return {
      allowed: false,
      domain,
      reason: `Institutional domain @${domain} is not currently licensed. Contact your academic IT department or platform sales.`,
    };
  }

  if (matched.status !== "active" && matched.status !== "trial") {
    return {
      allowed: false,
      domain,
      reason: `The license for ${matched.name} is currently ${matched.status}. Please contact support.`,
    };
  }

  const remaining = Math.max(0, matched.max_seats - matched.enrolled_seats);
  if (remaining <= 0) {
    return {
      allowed: false,
      domain,
      reason: `The license for ${matched.name} has reached its capacity (${matched.max_seats} seats).`,
    };
  }

  return {
    allowed: true,
    domain,
    institution: {
      id: matched.id,
      name: matched.name,
      slug: matched.slug,
      tier: matched.tier,
      status: matched.status,
      active_from: matched.active_from,
      seats_remaining: remaining,
      max_seats: matched.max_seats,
      enrolled_seats: matched.enrolled_seats,
    },
  };
}

/**
 * Onboard a new institution or add a domain to an existing institution (Provider End)
 */
export async function createInstitution(
  input: CreateInstitutionInput
): Promise<Institution> {
  const cleanDomain = normalizeDomain(input.domain);
  const baseSlug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `inst-${Date.now()}`;

  const activeFrom = input.active_from || new Date().toISOString();
  const licenseEnd =
    input.license_end ||
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  let createdInst: Institution | null = null;

  try {
    const supabase = getSupabaseClient();

    // 1. Check if institution already exists by slug or name
    const { data: existingInst } = await supabase
      .from("institutions")
      .select("*, institution_domains(domain, is_active)")
      .or(`slug.eq.${baseSlug},name.ilike.${input.name.trim()}`)
      .maybeSingle();

    let instId = "";
    let instRecord: any = null;

    if (existingInst) {
      // Update existing institution terms
      const { data: updated, error: updError } = await supabase
        .from("institutions")
        .update({
          tier: input.tier || existingInst.tier || "standard",
          status: "active",
          max_seats: input.max_seats || existingInst.max_seats || 50,
          billing_contact: input.billing_contact || existingInst.billing_contact,
          annual_contract_value:
            input.annual_contract_value || existingInst.annual_contract_value,
        })
        .eq("id", existingInst.id)
        .select()
        .single();

      if (updError) {
        console.error("[Licensing] Error updating institution:", updError);
      }
      instRecord = updated || existingInst;
      instId = instRecord.id;
    } else {
      // Create new institution with unique slug
      let uniqueSlug = baseSlug;
      const { data: slugCheck } = await supabase
        .from("institutions")
        .select("id")
        .eq("slug", uniqueSlug)
        .maybeSingle();

      if (slugCheck) {
        uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
      }

      const { data: inserted, error: insError } = await supabase
        .from("institutions")
        .insert({
          name: input.name.trim(),
          slug: uniqueSlug,
          tier: input.tier || "standard",
          status: "active",
          max_seats: input.max_seats || 50,
          active_from: activeFrom,
          license_end: licenseEnd,
          billing_contact: input.billing_contact || null,
          annual_contract_value: input.annual_contract_value || 24000,
        })
        .select()
        .single();

      if (insError) {
        console.error("[Licensing] Error inserting institution:", insError);
        throw new Error(insError.message);
      }
      instRecord = inserted;
      instId = instRecord.id;
    }

    // 2. Add or activate the domain in institution_domains
    if (instId && cleanDomain) {
      const { error: domErr } = await supabase
        .from("institution_domains")
        .upsert(
          {
            institution_id: instId,
            domain: cleanDomain,
            is_active: true,
          },
          { onConflict: "domain" }
        );

      if (domErr) {
        console.error("[Licensing] Error upserting domain:", domErr);
      }
    }

    // 3. Query all active domains for this institution to construct complete record
    const { data: domainsData } = await supabase
      .from("institution_domains")
      .select("domain")
      .eq("institution_id", instId)
      .eq("is_active", true);

    const activeDomains = (domainsData || []).map((d: any) => d.domain);
    if (cleanDomain && !activeDomains.includes(cleanDomain)) {
      activeDomains.push(cleanDomain);
    }

    createdInst = {
      id: instRecord.id,
      name: instRecord.name,
      slug: instRecord.slug,
      tier: instRecord.tier,
      status: instRecord.status,
      max_seats: instRecord.max_seats,
      enrolled_seats: instRecord.enrolled_seats || 0,
      active_from: instRecord.active_from,
      license_end: instRecord.license_end,
      billing_contact: instRecord.billing_contact || "",
      annual_contract_value: instRecord.annual_contract_value || 0,
      domains: activeDomains,
      created_at: instRecord.created_at,
    };
  } catch (dbErr: any) {
    console.error("[Licensing] Database write error, using fallback:", dbErr);
  }

  // If DB write failed or offline, construct local institution
  if (!createdInst) {
    const existingMem = memoryInstitutions.find(
      (m) =>
        m.slug === baseSlug ||
        m.name.toLowerCase() === input.name.trim().toLowerCase()
    );

    if (existingMem) {
      const updatedDomains = cleanDomain
        ? Array.from(new Set([...existingMem.domains, cleanDomain]))
        : existingMem.domains;
      createdInst = {
        ...existingMem,
        domains: updatedDomains,
        max_seats: input.max_seats || existingMem.max_seats,
        tier: input.tier || existingMem.tier,
      };
    } else {
      createdInst = {
        id: `inst-${Date.now()}`,
        name: input.name.trim(),
        slug: baseSlug,
        tier: input.tier || "standard",
        status: "active",
        max_seats: input.max_seats || 50,
        enrolled_seats: 0,
        active_from: activeFrom,
        license_end: licenseEnd,
        billing_contact: input.billing_contact || "",
        annual_contract_value: input.annual_contract_value || 24000,
        domains: cleanDomain ? [cleanDomain] : [],
        created_at: new Date().toISOString(),
      };
    }
  }

  // Update in-memory store
  const existingMemIdx = memoryInstitutions.findIndex(
    (i) => i.id === createdInst!.id || i.slug === createdInst!.slug
  );
  if (existingMemIdx >= 0) {
    memoryInstitutions[existingMemIdx] = createdInst;
  } else {
    memoryInstitutions = [createdInst, ...memoryInstitutions];
  }

  return createdInst;
}

/**
 * Toggle domain status (active vs suspended)
 */
export async function toggleDomainStatus(
  domain: string,
  isActive: boolean
): Promise<boolean> {
  const clean = normalizeDomain(domain);
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("institution_domains")
      .update({ is_active: isActive })
      .eq("domain", clean);

    if (error) {
      console.error("[Licensing] Error toggling domain status:", error);
    }
  } catch (err) {
    console.error("[Licensing] Exception in toggleDomainStatus:", err);
  }

  // Update memory store
  memoryInstitutions = memoryInstitutions.map((inst) => {
    if (inst.domains.includes(clean)) {
      if (isActive) {
        return inst;
      } else {
        return {
          ...inst,
          domains: inst.domains.filter((d) => d !== clean),
        };
      }
    }
    return inst;
  });

  return true;
}
