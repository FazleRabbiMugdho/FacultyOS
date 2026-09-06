import { createClient } from "@/lib/supabase/server";
import {
  Institution,
  DomainVerificationResult,
  CreateInstitutionInput,
} from "./types";

// Resilient in-memory fallback store initialized with AUSE, MIT, Stanford
// Ensures immediate functionality during demos and local testing
const DEMO_INSTITUTIONS: Institution[] = [
  {
    id: "inst-ause-001",
    name: "American University of Science & Engineering",
    slug: "ause",
    tier: "enterprise",
    status: "active",
    max_seats: 150,
    enrolled_seats: 42,
    active_from: "2024-01-10T00:00:00.000Z",
    license_end: "2027-01-10T00:00:00.000Z",
    billing_contact: "provost@ause.edu",
    annual_contract_value: 48000,
    domains: ["ause.edu"],
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
    const supabase = createClient();
    const { data: dbInsts, error: instError } = await supabase
      .from("institutions")
      .select("*, institution_domains(domain, is_active)");

    if (!instError && dbInsts && dbInsts.length > 0) {
      return dbInsts.map((item: any) => ({
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
    }
  } catch {
    // Fall back to memory store on connection or schema error
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
    const supabase = createClient();
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
          seats_remaining: maxSeats - enrolled,
          max_seats: maxSeats,
          enrolled_seats: enrolled,
        },
      };
    }
  } catch {
    // Supabase unavailable, check in-memory catalog
  }

  // In-memory catalog lookup
  const matched = memoryInstitutions.find((inst) =>
    inst.domains.some((d) => d.toLowerCase() === domain)
  );

  if (!matched) {
    return {
      allowed: false,
      domain,
      reason: `Institutional domain @${domain} is not currently licensed. FacultyOS requires an active institutional partnership.`,
    };
  }

  if (matched.status !== "active" && matched.status !== "trial") {
    return {
      allowed: false,
      domain,
      reason: `License for ${matched.name} is currently ${matched.status}.`,
    };
  }

  const remaining = Math.max(0, matched.max_seats - matched.enrolled_seats);
  if (remaining <= 0) {
    return {
      allowed: false,
      domain,
      reason: `Institutional license seat limit reached (${matched.max_seats} allocated seats).`,
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
 * Onboard a new institution with authorized domain (Provider End)
 */
export async function createInstitution(
  input: CreateInstitutionInput
): Promise<Institution> {
  const cleanDomain = normalizeDomain(input.domain);
  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `inst-${Date.now()}`;

  const activeFrom = input.active_from || new Date().toISOString();
  const licenseEnd =
    input.license_end ||
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  // Try saving to Supabase if available
  try {
    const supabase = createClient();
    const { data: newInst, error: instError } = await supabase
      .from("institutions")
      .insert({
        name: input.name,
        slug,
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

    if (!instError && newInst) {
      if (cleanDomain) {
        await supabase.from("institution_domains").insert({
          institution_id: newInst.id,
          domain: cleanDomain,
          is_active: true,
        });
      }

      return {
        id: newInst.id,
        name: newInst.name,
        slug: newInst.slug,
        tier: newInst.tier,
        status: newInst.status,
        max_seats: newInst.max_seats,
        enrolled_seats: 0,
        active_from: newInst.active_from,
        license_end: newInst.license_end,
        billing_contact: newInst.billing_contact || "",
        annual_contract_value: newInst.annual_contract_value || 0,
        domains: cleanDomain ? [cleanDomain] : [],
        created_at: newInst.created_at,
      };
    }
  } catch {
    // Fall back to memory store
  }

  // Memory store addition
  const newInst: Institution = {
    id: `inst-${Date.now()}`,
    name: input.name,
    slug,
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

  memoryInstitutions = [newInst, ...memoryInstitutions];
  return newInst;
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
    const supabase = createClient();
    await supabase
      .from("institution_domains")
      .update({ is_active: isActive })
      .eq("domain", clean);
  } catch {
    // fallback
  }

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
