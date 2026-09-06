"use client";

import * as React from "react";
import {
  Building2,
  Globe,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Institution, LicenseTier } from "@/lib/licensing/types";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function calculateActiveDuration(dateStr: string): string {
  try {
    const start = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Scheduled in ${Math.abs(diffDays)} days`;
    }
    if (diffDays === 0) return "Active today";
    if (diffDays < 30) return `${diffDays} days active`;
    const months = Math.floor(diffDays / 30.4);
    if (months < 12) return `${months} mo${months > 1 ? "s" : ""} active`;
    const years = (diffDays / 365).toFixed(1);
    return `${years} yrs active`;
  } catch {
    return "Active";
  }
}

export function LicensingWorkspace() {
  const [institutions, setInstitutions] = React.useState<Institution[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterTier, setFilterTier] = React.useState<string>("all");

  // Onboard modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formDomain, setFormDomain] = React.useState("");
  const [formTier, setFormTier] = React.useState<LicenseTier>("enterprise");
  const [formSeats, setFormSeats] = React.useState("100");
  const [formActiveFrom, setFormActiveFrom] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [formContact, setFormContact] = React.useState("");
  const [formAcv, setFormAcv] = React.useState("36000");

  // Domain Sandbox tester state
  const [testEmail, setTestEmail] = React.useState("dean@ause.edu");
  const [testResult, setTestResult] = React.useState<any>(null);
  const [testing, setTesting] = React.useState(false);

  // Fetch institutions
  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/provider/institutions");
      const json = await res.json();
      if (json.institutions) {
        setInstitutions(json.institutions);
      }
    } catch (err) {
      toast.error("Failed to load institutions");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadInstitutions();
  }, []);

  // Handle Onboard submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDomain.trim()) {
      toast.error("Please provide university name and domain");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/provider/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          domain: formDomain.trim().replace(/^@/, ""),
          tier: formTier,
          max_seats: parseInt(formSeats) || 50,
          active_from: new Date(formActiveFrom).toISOString(),
          billing_contact: formContact.trim(),
          annual_contract_value: parseFloat(formAcv) || 24000,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create institution");
      }

      toast.success(
        `University '${data.institution.name}' licensed successfully!`
      );
      setModalOpen(false);
      // Reset form
      setFormName("");
      setFormDomain("");
      setFormContact("");
      loadInstitutions();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Domain Toggle
  const handleToggleDomain = async (domain: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/provider/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, is_active: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Domain @${domain} is now ${!currentActive ? "Active" : "Suspended"}`
        );
        loadInstitutions();
      }
    } catch {
      toast.error("Failed to update domain status");
    }
  };

  // Test domain in Sandbox
  const runDomainTest = async () => {
    if (!testEmail.trim()) return;
    setTesting(true);
    try {
      const res = await fetch("/api/auth/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail.trim() }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ allowed: false, reason: "Verification check failed" });
    } finally {
      setTesting(false);
    }
  };

  // Filtered institutions
  const filtered = institutions.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.domains.some((d) =>
        d.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesTier = filterTier === "all" || inst.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  // Aggregated KPIs
  const totalUniversities = institutions.length;
  const activeDomainsCount = institutions.reduce(
    (acc, i) => acc + i.domains.length,
    0
  );
  const totalSeats = institutions.reduce((acc, i) => acc + i.max_seats, 0);
  const enrolledSeats = institutions.reduce(
    (acc, i) => acc + (i.enrolled_seats || 0),
    0
  );
  const totalArr = institutions.reduce(
    (acc, i) => acc + (i.annual_contract_value || 0),
    0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="bg-indigo-500/10 text-indigo-400 border-indigo-500/25 px-2 py-0.5 text-xs font-semibold"
            >
              Platform Owner Console
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live License Gate Active
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Institutional Licensing & Domain Access
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monetization engine: gate university registrations behind authorized
            domains, active contract dates, and seat quotas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadInstitutions}
            className="border-border/60 text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-1.5 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Onboard University License
          </Button>
        </div>
      </div>

      {/* ─── Executive KPI Ribbon ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Campuses */}
        <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Active Universities
            </span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {totalUniversities}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              100% active
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Institutional enterprise contracts
          </div>
        </div>

        {/* Card 2: Authorized Domains */}
        <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Allowed Domains
            </span>
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {activeDomainsCount}
            </span>
            <span className="text-xs text-indigo-400 font-mono">
              e.g. @ause.edu
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Gated signup domain white-list
          </div>
        </div>

        {/* Card 3: Seat Allocation */}
        <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Faculty Seats Utilized
            </span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {enrolledSeats}
            </span>
            <span className="text-xs text-muted-foreground">
              / {totalSeats} seats
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-secondary/50 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all"
              style={{
                width: `${totalSeats ? Math.min(100, Math.round((enrolledSeats / totalSeats) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Card 4: Platform ARR */}
        <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Contracted ARR
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              ${(totalArr / 1000).toFixed(0)}k
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              Annual Recurring
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Institutional subscription revenue
          </div>
        </div>
      </div>

      {/* ─── Filter & Search Bar ────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search university or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground">Tier:</span>
          {["all", "enterprise", "standard", "pilot"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`text-xs px-2.5 py-1 rounded-md capitalize transition-colors ${
                filterTier === t
                  ? "bg-indigo-600 text-white font-medium shadow-sm"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Active Universities Table ──────────────────── */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40 backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Active Licensed Universities & Eligibility Timeline
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Only faculty holding email addresses under these authorized
              domains are permitted to create accounts.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {filtered.length} Universities Listed
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/30 text-muted-foreground border-b border-border/40 font-medium">
              <tr>
                <th className="py-3 px-4">University / Campus</th>
                <th className="py-3 px-4">Allowed Email Domain</th>
                <th className="py-3 px-4">Active Since</th>
                <th className="py-3 px-4">Seat Quota</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((inst) => (
                <tr
                  key={inst.id}
                  className="hover:bg-accent/20 transition-colors group"
                >
                  {/* University Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0">
                        {inst.slug.toUpperCase().slice(0, 3)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {inst.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span>{inst.billing_contact || "Active Tenant"}</span>
                          <span>•</span>
                          <span>
                            Expires {formatDate(inst.license_end)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Domain Badges */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {inst.domains.map((dom) => (
                        <span
                          key={dom}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[11px]"
                        >
                          <Globe className="w-3 h-3 text-indigo-400" />@{dom}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Active Since Timeline */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {formatDate(inst.active_from)}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {calculateActiveDuration(inst.active_from)}
                      </span>
                    </div>
                  </td>

                  {/* Seat Quota */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 w-28">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-foreground font-semibold tabular-nums">
                          {inst.enrolled_seats || 0} / {inst.max_seats}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round(
                            ((inst.enrolled_seats || 0) / inst.max_seats) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-secondary/50 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-indigo-400 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, ((inst.enrolled_seats || 0) / inst.max_seats) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="py-3.5 px-4">
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize px-2 py-0.5 ${
                        inst.tier === "enterprise"
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                          : inst.tier === "standard"
                          ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {inst.tier}
                    </Badge>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        inst.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          inst.status === "active"
                            ? "bg-emerald-400"
                            : "bg-rose-400"
                        }`}
                      />
                      {inst.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTestEmail(`faculty@${inst.domains[0] || "test.edu"}`);
                          toast.info(`Populated simulator with @${inst.domains[0]}`);
                        }}
                        className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                      >
                        Test Gate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggleDomain(
                            inst.domains[0],
                            inst.status === "active"
                          )
                        }
                        className="text-[11px] h-7 px-2 border-border/60 hover:bg-secondary/60"
                      >
                        {inst.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No universities found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Live Signup Gate Simulator Sandbox ─────────── */}
      <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-950/10 backdrop-blur-sm relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-foreground">
                Domain Eligibility Simulator & Gate Tester
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Test any faculty email to preview real-time gate validation at{" "}
              <code className="text-indigo-300 font-mono">/signup</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 max-w-md w-full">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="e.g. prof.smith@ause.edu"
              className="flex-1 px-3 py-1.5 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <Button
              size="sm"
              onClick={runDomainTest}
              disabled={testing}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs shrink-0"
            >
              {testing ? "Checking..." : "Test Gate"}
            </Button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div className="mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-3 transition-all animate-in fade-in duration-200"
            style={{
              borderColor: testResult.allowed
                ? "rgba(16, 185, 129, 0.3)"
                : "rgba(244, 63, 94, 0.3)",
              background: testResult.allowed
                ? "rgba(16, 185, 129, 0.05)"
                : "rgba(244, 63, 94, 0.05)",
            }}
          >
            {testResult.allowed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold flex items-center gap-2">
                <span
                  className={
                    testResult.allowed ? "text-emerald-400" : "text-rose-400"
                  }
                >
                  {testResult.allowed
                    ? "✓ REGISTRATION ALLOWED"
                    : "❌ REGISTRATION BLOCKED"}
                </span>
                <span className="font-mono text-muted-foreground">
                  (@{testResult.domain})
                </span>
              </div>
              {testResult.allowed && testResult.institution ? (
                <p className="text-foreground/90 mt-1">
                  Active Member: <strong>{testResult.institution.name}</strong>{" "}
                  (Tier: {testResult.institution.tier.toUpperCase()}) · Active
                  since {formatDate(testResult.institution.active_from)} ·{" "}
                  {testResult.institution.seats_remaining} seats remaining.
                </p>
              ) : (
                <p className="text-rose-300 mt-1">
                  {testResult.reason ||
                    "This domain is not registered under an active university subscription."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Onboard University License Modal ──────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#121217] border border-border/60 rounded-2xl p-6 max-w-xl w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Onboard Licensed University
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Register institutional domain and subscription terms
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  University Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. American University of Science & Engineering"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Allowed Email Domain *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="ause.edu"
                      value={formDomain}
                      onChange={(e) => setFormDomain(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    License Tier
                  </label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as LicenseTier)}
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="enterprise">Enterprise (Unlimited Features)</option>
                    <option value="standard">Standard (OBE + Authoring)</option>
                    <option value="pilot">Pilot / Trial (30-day evaluation)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Active From Date (Since when active) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formActiveFrom}
                    onChange={(e) => setFormActiveFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Maximum Faculty Seats
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="5000"
                    value={formSeats}
                    onChange={(e) => setFormSeats(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Primary Billing / Dean Email
                  </label>
                  <input
                    type="email"
                    placeholder="provost@ause.edu"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Annual Contract Value ($ ARR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <input
                      type="number"
                      value={formAcv}
                      onChange={(e) => setFormAcv(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-border/60 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 shadow-md shadow-indigo-500/20"
                >
                  {submitting ? "Saving..." : "Issue Institutional License"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
