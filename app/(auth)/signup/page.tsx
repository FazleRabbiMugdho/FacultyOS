"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Loader2,
  Users,
  Award,
  Settings,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/shell/BrandLogo";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

/* ─── Helpers ────────────────────────────────────────────────── */
function formatActiveSince(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/* ─── Data ───────────────────────────────────────────────────── */
const ROLE_DEFINITIONS = [
  {
    id: "junior",
    label: "Junior Faculty",
    sublabel: "Examiner · E1",
    desc: "Drafts question papers and performs first-blind script evaluation.",
    icon: Users,
    accent: "#3b82f6",
  },
  {
    id: "senior",
    label: "Senior Faculty",
    sublabel: "Arbitrator · E2/E3",
    desc: "Performs second-blind marking, rubric sign-off, and discrepancy arbitration.",
    icon: Award,
    accent: "#f59e0b",
  },
  {
    id: "admin",
    label: "Dean / Admin",
    sublabel: "Program Chair",
    desc: "Manages ABET/OBE alignment, faculty calibration, and reliability analytics.",
    icon: Settings,
    accent: "#8b5cf6",
  },
];

/* ─── Component ─────────────────────────────────────────────── */
export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [role, setRole] = React.useState<"junior" | "senior" | "admin">("junior");
  const [loading, setLoading] = React.useState(false);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);

  // Live domain license verification state
  const [domainStatus, setDomainStatus] = React.useState<{
    checking: boolean;
    allowed: boolean | null;
    domain: string;
    institution?: {
      name: string;
      tier: string;
      active_from: string;
      seats_remaining: number;
    };
    reason?: string;
  } | null>(null);

  // Debounced domain verification
  React.useEffect(() => {
    if (!email || !email.includes("@") || !email.includes(".")) {
      setDomainStatus(null);
      return;
    }

    const domainPart = email.split("@")[1]?.trim();
    if (!domainPart || !domainPart.includes(".")) {
      setDomainStatus(null);
      return;
    }

    setDomainStatus((prev) => ({
      checking: true,
      allowed: prev?.domain === domainPart ? prev.allowed : null,
      domain: domainPart,
      institution: prev?.domain === domainPart ? prev.institution : undefined,
    }));

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/verify-domain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setDomainStatus({
          checking: false,
          allowed: Boolean(data.allowed),
          domain: data.domain || domainPart,
          institution: data.institution,
          reason: data.reason,
        });
      } catch {
        setDomainStatus({
          checking: false,
          allowed: false,
          domain: domainPart,
          reason: "Unable to verify domain license at this moment.",
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [email]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (domainStatus && domainStatus.allowed === false) {
      toast.error(domainStatus.reason || "This university domain is not licensed for FacultyOS.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) { toast.error(error.message || "Failed to create account"); return; }
      toast.success("Account created. Welcome to FacultyOS.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const activeRole = ROLE_DEFINITIONS.find((r) => r.id === role)!;

  return (
    <>
      <style>{`
        .field-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .submit-btn:not(:disabled):hover {
          box-shadow: 0 8px 24px -4px rgba(99,102,241,0.45);
          transform: translateY(-1px);
        }
        .submit-btn:not(:disabled):active {
          transform: translateY(0);
          box-shadow: none;
        }
        .submit-btn { transition: all 0.18s cubic-bezier(0.22,1,0.36,1); }
        .role-card { transition: all 0.18s cubic-bezier(0.22,1,0.36,1); }
        .left-panel-border {
          background: linear-gradient(to bottom, #6366f1, #4f46e5 40%, transparent);
        }
      `}</style>

      {/* Top Floating Theme Switcher */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 flex items-center gap-2">
        <ThemeToggle variant="button" className="shadow-lg shadow-black/5" />
      </div>

      <div className="min-h-screen flex bg-white dark:bg-[#0d0d10]">

        {/* ══════════════════════════════════════════════════════
            LEFT PANEL
        ══════════════════════════════════════════════════════ */}
        <div
          className="auth-left-panel hidden lg:flex w-[54%] xl:w-[56%] flex-col relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, #09090d 0%, #0f0f1a 60%, #0a0a14 100%)" }}
        >
          <div className="left-panel-border absolute top-0 left-0 bottom-0 w-[3px] opacity-70" />
          <div
            className="absolute top-0 right-0 bottom-0 w-px"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(99,102,241,0.15) 20%, rgba(99,102,241,0.08) 80%, transparent)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.022]"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
              backgroundSize: "180px 180px",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
            }}
          />

          <div className="relative flex flex-col h-full px-14 xl:px-16 py-11">

            {/* Logo */}
            <div className="auth-stagger-1 flex items-center gap-3">
              <BrandLogo className="h-9 w-9" />
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-semibold tracking-tight text-white">FacultyOS</span>
                <span
                  className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)" }}
                >
                  IAPEA
                </span>
              </div>
            </div>

            {/* Hero */}
            <div className="my-auto space-y-9">
              <div className="auth-stagger-2 space-y-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#6366f1" }}>
                  Faculty Onboarding Portal
                </p>
                <h1
                  className="font-bold leading-[1.12] tracking-tight"
                  style={{ fontSize: "clamp(2rem, 3.2vw, 2.9rem)", color: "#f1f5f9", letterSpacing: "-0.02em" }}
                >
                  Join your<br />
                  institution's academic<br />
                  <span style={{ color: "#c7d2fe" }}>evaluation platform.</span>
                </h1>
                <p className="text-[14px] leading-[1.7] max-w-[390px]" style={{ color: "#64748b" }}>
                  Set up your faculty profile with the role that reflects your position.
                  Permissions and access are governed by your institutional designation.
                </p>
              </div>

              {/* Animated line */}
              <div
                className="auth-line-grow h-px"
                style={{ background: "linear-gradient(to right, rgba(99,102,241,0.4), transparent)" }}
              />

              {/* Role definitions */}
              <div className="auth-stagger-3 space-y-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#334155" }}>
                  Institutional roles
                </p>
                {ROLE_DEFINITIONS.map((r) => {
                  const Icon = r.icon;
                  const isActive = role === r.id;
                  return (
                    <div
                      key={r.id}
                      className="role-card flex gap-3.5 p-3.5 rounded-xl"
                      style={{
                        background: isActive ? `${r.accent}09` : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isActive ? `${r.accent}30` : "rgba(255,255,255,0.05)"}`,
                      }}
                    >
                      <div
                        className="p-1.5 rounded-lg shrink-0 mt-0.5"
                        style={{ background: `${r.accent}14`, color: r.accent }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold leading-snug" style={{ color: isActive ? "#e2e8f0" : "#94a3b8" }}>
                          {r.label}{" "}
                          <span className="font-normal text-[11px]" style={{ color: "#475569" }}>{r.sublabel}</span>
                        </p>
                        <p className="text-[11.5px] leading-relaxed mt-0.5" style={{ color: "#475569" }}>
                          {r.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div
              className="auth-stagger-4 pt-6 mt-auto flex items-center gap-2.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <ShieldCheck className="h-[15px] w-[15px] shrink-0" style={{ color: "#10b981" }} />
              <span className="text-[11px] font-mono" style={{ color: "#475569" }}>
                Role-Based Access Control (RBAC) · FERPA Compliant
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            RIGHT PANEL — Registration form
        ══════════════════════════════════════════════════════ */}
        <div className="auth-right-panel flex-1 flex flex-col justify-center items-center px-8 sm:px-12 py-14 bg-white dark:bg-[#0d0d10] relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.04) 0%, transparent 100%)" }}
          />

          {/* Mobile logo */}
          <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2.5">
            <BrandLogo className="h-8 w-8" />
            <span className="text-[14px] font-semibold text-zinc-900 dark:text-white tracking-tight">FacultyOS</span>
          </div>

          <div className="relative w-full max-w-[360px] space-y-6">

            {/* Heading */}
            <div className="auth-stagger-1 space-y-1.5">
              <h2
                className="font-bold tracking-tight text-zinc-900 dark:text-white"
                style={{ fontSize: "26px", letterSpacing: "-0.025em" }}
              >
                Create account
              </h2>
              <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400 leading-snug">
                Register with your institutional details.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} className="auth-stagger-2 space-y-4">

              {/* Full name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
                  Full name
                </Label>
                <div className="relative">
                  <User
                    className="h-[15px] w-[15px] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: focusedField === "fullName" ? "#6366f1" : "#94a3b8", transition: "color 0.15s" }}
                  />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Prof. Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setFocusedField("fullName")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="field-input w-full h-[42px] pl-[38px] pr-3.5 text-[13.5px] rounded-xl border outline-none transition-all duration-150
                      bg-white text-zinc-900 border-zinc-200 placeholder-zinc-400
                      dark:bg-[#141418] dark:text-white dark:border-white/10 dark:placeholder-zinc-600"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
                    University email
                  </Label>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                    Gated institutional domain
                  </span>
                </div>
                <div className="relative">
                  <Mail
                    className="h-[15px] w-[15px] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: focusedField === "email" ? "#6366f1" : "#94a3b8", transition: "color 0.15s" }}
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="field-input w-full h-[42px] pl-[38px] pr-3.5 text-[13.5px] rounded-xl border outline-none transition-all duration-150
                      bg-white text-zinc-900 border-zinc-200 placeholder-zinc-400
                      dark:bg-[#141418] dark:text-white dark:border-white/10 dark:placeholder-zinc-600"
                  />
                </div>

                {/* Live Domain Verification Banner */}
                {domainStatus && (
                  <div className="transition-all duration-200 pt-0.5">
                    {domainStatus.checking ? (
                      <div className="flex items-center gap-1.5 text-[11.5px] text-indigo-400 py-1 pl-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                        <span>Verifying institutional license for @{domainStatus.domain}…</span>
                      </div>
                    ) : domainStatus.allowed === true && domainStatus.institution ? (
                      <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11.5px] space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Active Academic License</span>
                        </div>
                        <div className="font-medium text-white pl-5">
                          {domainStatus.institution.name}
                        </div>
                        <div className="text-[10.5px] text-emerald-200/80 pl-5 flex items-center gap-2">
                          <span>Active since {formatActiveSince(domainStatus.institution.active_from)}</span>
                          <span>•</span>
                          <span className="uppercase font-semibold text-emerald-300">
                            {domainStatus.institution.tier} Tier
                          </span>
                        </div>
                      </div>
                    ) : domainStatus.allowed === false ? (
                      <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[11.5px] space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Institutional License Required</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-snug pl-5">
                          {domainStatus.reason ||
                            `Domain @${domainStatus.domain} is not currently authorized for FacultyOS registration.`}
                        </p>
                        <div className="pl-5 pt-0.5">
                          <Link
                            href="/admin/licensing"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
                          >
                            <span>Platform Provider: Add domain @{domainStatus.domain} →</span>
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Quick Test Chips for Demonstration */}
                <div className="flex items-center gap-1.5 pt-1 text-[10.5px] text-zinc-500 dark:text-zinc-400">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400">Demo:</span>
                  <button
                    type="button"
                    onClick={() => setEmail("prof.smith@ause.edu")}
                    className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-[10.5px] transition-colors border border-emerald-500/20"
                  >
                    prof@ause.edu (Licensed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmail("user@gmail.com")}
                    className="px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono text-[10.5px] transition-colors border border-rose-500/20"
                  >
                    user@gmail.com (Blocked)
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
                  Institutional role
                </Label>
                <Select value={role} onValueChange={(val: any) => setRole(val)}>
                  <SelectTrigger
                    id="role"
                    className="h-[42px] text-[13.5px] rounded-xl border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141418] focus:ring-1 focus:ring-indigo-500"
                  >
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior" className="text-[13px]">
                      Junior Faculty — Examiner (E1)
                    </SelectItem>
                    <SelectItem value="senior" className="text-[13px]">
                      Senior Faculty — Arbitrator (E2/E3)
                    </SelectItem>
                    <SelectItem value="admin" className="text-[13px]">
                      Dean / Admin — Program Chair
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11.5px] leading-relaxed pl-1" style={{ color: "#94a3b8" }}>
                  {activeRole.desc}
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    className="h-[15px] w-[15px] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: focusedField === "password" ? "#6366f1" : "#94a3b8", transition: "color 0.15s" }}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="field-input w-full h-[42px] pl-[38px] pr-10 rounded-xl border outline-none transition-all duration-150
                      bg-white text-zinc-900 border-zinc-200 placeholder-zinc-400
                      dark:bg-[#141418] dark:text-white dark:border-white/10 dark:placeholder-zinc-600"
                    style={{ fontSize: "13.5px", fontFamily: password ? "monospace" : undefined, letterSpacing: password ? "0.16em" : "normal" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors duration-150"
                    style={{ color: "#94a3b8" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#6366f1")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || domainStatus?.allowed === false}
                className={`submit-btn w-full h-[42px] flex items-center justify-center gap-2 text-[13.5px] font-semibold rounded-xl text-white mt-1 transition-all ${
                  domainStatus?.allowed === false
                    ? "opacity-50 cursor-not-allowed bg-zinc-700 hover:transform-none"
                    : "disabled:opacity-55 disabled:cursor-not-allowed"
                }`}
                style={
                  domainStatus?.allowed === false
                    ? { background: "#3f3f46" }
                    : { background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating account…</span>
                  </>
                ) : domainStatus?.allowed === false ? (
                  <>
                    <Lock className="h-4 w-4 text-zinc-400" />
                    <span>Institutional License Required</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Sign in link */}
            <p className="auth-stagger-3 text-center text-[12.5px] text-zinc-500 dark:text-zinc-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold transition-colors duration-150"
                style={{ color: "#6366f1" }}
              >
                Sign in
              </Link>
            </p>

            {/* Platform Operator Gateway Notice */}
            <div className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-center text-[11.5px] text-zinc-400">
              <span>Platform Developer or Service Provider? </span>
              <Link
                href="/login"
                className="font-semibold text-purple-400 hover:text-purple-300 underline underline-offset-2"
              >
                Operator Portal Access →
              </Link>
            </div>

            {/* Trust footer */}
            <div
              className="auth-stagger-4 flex items-center justify-center gap-2 pt-3"
              style={{ borderTop: "1px solid rgba(226,232,240,0.6)" }}
            >
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
              <span className="text-[11px]" style={{ color: "#94a3b8" }}>
                FERPA-compliant · Role-based access control
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
