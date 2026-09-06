import { Metadata } from "next";
import { LicensingWorkspace } from "@/components/licensing/LicensingWorkspace";

export const metadata: Metadata = {
  title: "Institutional Licensing & Domain Control — FacultyOS",
  description:
    "Monetization and university domain allowlist management for platform administrators.",
};

export default function LicensingPage() {
  return <LicensingWorkspace />;
}
