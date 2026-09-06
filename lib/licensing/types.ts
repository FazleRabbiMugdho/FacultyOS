export type LicenseTier = "pilot" | "standard" | "enterprise";
export type LicenseStatus = "active" | "trial" | "suspended" | "expired";

export interface Institution {
  id: string;
  name: string;
  slug: string;
  tier: LicenseTier;
  status: LicenseStatus;
  max_seats: number;
  enrolled_seats: number;
  active_from: string; // ISO timestamp or YYYY-MM-DD
  license_end: string;
  billing_contact: string;
  annual_contract_value: number;
  domains: string[]; // e.g. ["ause.edu"]
  created_at: string;
}

export interface DomainRecord {
  id: string;
  institution_id: string;
  domain: string;
  is_active: boolean;
  created_at: string;
}

export interface DomainVerificationResult {
  allowed: boolean;
  domain: string;
  institution?: {
    id: string;
    name: string;
    slug: string;
    tier: LicenseTier;
    status: LicenseStatus;
    active_from: string;
    seats_remaining: number;
    max_seats: number;
    enrolled_seats: number;
  };
  reason?: string;
}

export interface CreateInstitutionInput {
  name: string;
  domain: string;
  tier?: LicenseTier;
  max_seats?: number;
  active_from?: string;
  license_end?: string;
  billing_contact?: string;
  annual_contract_value?: number;
}
