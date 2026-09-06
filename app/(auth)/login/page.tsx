"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  BookOpen,
  FileCheck,
  BarChart3,
  Building2,
  Sparkles,
  Key,
} from "lucide-react";

/* ─── Data ─────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: BookOpen,
    title: "Outcome-Based Course Design",
    desc: "Bloom's taxonomy mapping, CO–PO sparsity enforcement, and taught-vs-planned drift detection.",
  },
  {
    icon: FileCheck,
    title: "Triple-Layer Deduplication",
    desc: "Cosine + Jaccard + Skill-Signature detection catches conceptual duplicates across all historical papers.",
  },
  {
    icon: BarChart3,
    title: "Double-Blind Grading & Arbitration",
    desc: "VLM-powered script evaluation with per-region confidence routing and Δ discrepancy arbitration.",
  },
];

const CAMPUS_ROLES = [
  {
    label: "Junior Faculty",
    role: "Examiner · E1",
    email: "junior@ause.edu",
    accent: "#3b82f6",
    dotClass: "bg-blue-500",
  },
  {
    label: "Senior Faculty",
    role: "Arbitrator · E2/E3",
    email: "senior@ause.edu",
    accent: "#f59e0b",
    dotClass: "bg-amber-500",
  },
  {
    label: "Dept. Chair",
    role: "Academic Lead",
    email: "chair@ause.edu",
    accent: "#8b5cf6",
    dotClass: "bg-violet-500",
  },
];

const PROVIDER_ROLES = [
  {
    label: "Platform Operator",
    role: "Developer / Super-Admin",
    email: "admin@facultyos.io",
    accent: "#a855f7",
    dotClass: "bg-purple-500",
    desc: "Global licensing, domain allowlisting & monetization",
  },
];

const METRICS = [
  { value: "99.4%", label: "Grading Reliability" },
  { value: "768-d", label: "Semantic Vectors" },
  { value: "FERPA", label: "Anonymized" },
];

/* ─── Component ─────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [portalPersona, setPortalPersona] = React.useState<"university" | "provider">("university");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isProvider =
        portalPersona === "provider" ||
        email.endsWith("@facultyos.io") ||
        email.startsWith("admin@facultyos");

      const supabase = createClient();
      let { error } = await supabase.auth.signInWithPassword({ email, password });

      // Auto-provision demo accounts via server admin API if not existing (bypasses Supabase 429 rate limits)
      if (error && (email.endsWith("@ause.edu") || email.endsWith("@facultyos.edu") || email.endsWith("@facultyos.io"))) {
        try {
          const provRes = await fetch("/api/auth/provision-demo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, isProvider }),
          });
          const provData = await provRes.json();
          if (provData.success) {
            const retryLogin = await supabase.auth.signInWithPassword({ email, password });
            error = retryLogin.error;
          }
        } catch {
          // fallback to original error
        }
      }

      if (error) { toast.error(error.message || "Failed to sign in"); return; }

      if (isProvider) {
        toast.success("Welcome, Platform Operator. Service Provider console active.");
        router.push("/admin/licensing");
      } else {
        toast.success("Welcome back to your campus workspace.");
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: { email: string; label: string; [key: string]: any }) => {
    setSelectedRole(role.email);
    setEmail(role.email);
    setPassword("DemoFaculty123!");
    toast.info(`${role.label} credentials loaded`);
  };

  return (
    <>
      {/* Page-level styles for elements that can't easily be expressed with Tailwind alone */}
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
        .role-btn { transition: all 0.15s cubic-bezier(0.22,1,0.36,1); }
        .role-btn:hover:not(.role-selected) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .feature-row { transition: transform 0.2s ease; }
        .feature-row:hover { transform: translateX(4px); }
        .left-panel-border {
          background: linear-gradient(to bottom, #6366f1, #4f46e5 40%, transparent);
        }
      `}</style>

      <div className="min-h-screen flex bg-white dark:bg-[#0d0d10]">

        {/* ══════════════════════════════════════════════════════
            LEFT PANEL — Institutional brand showcase
        ══════════════════════════════════════════════════════ */}
        <div
          className="auth-left-panel hidden lg:flex w-[54%] xl:w-[56%] flex-col relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, #09090d 0%, #0f0f1a 60%, #0a0a14 100%)" }}
        >
          {/* Left edge accent bar */}
          <div
            className="left-panel-border absolute top-0 left-0 bottom-0 w-[3px] opacity-70"
          />

          {/* Right divider */}
          <div className="absolute top-0 right-0 bottom-0 w-px"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(99,102,241,0.15) 20%, rgba(99,102,241,0.08) 80%, transparent)" }}
          />

          {/* Subtle noise / grain texture */}
          <div
            className="absolute inset-0 opacity-[0.022]"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
              backgroundSize: "180px 180px",
            }}
          />

          {/* Faint grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 40%, transparent 100%)",
            }}
          />

          <div className="relative flex flex-col h-full px-14 xl:px-16 py-11 xl:py-13">

            {/* Logo */}
            <div className="auth-stagger-1 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                <GraduationCap className="h-[18px] w-[18px] text-white" />
              </div>
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

            {/* Main hero */}
            <div className="my-auto space-y-9">
              {/* Eyebrow + heading */}
              <div className="auth-stagger-2 space-y-4">
                <p
                  className="text-[10.5px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: "#6366f1" }}
                >
                  Intelligent Academic Processing & Evaluation Architecture
                </p>
                <h1
                  className="font-bold leading-[1.12] tracking-tight"
                  style={{
                    fontSize: "clamp(2rem, 3.2vw, 2.9rem)",
                    color: "#f1f5f9",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Where rigorous<br />
                  academic standards<br />
                  <span style={{ color: "#c7d2fe" }}>meet modern tooling.</span>
                </h1>
                <p
                  className="text-[14px] leading-[1.7] max-w-[390px]"
                  style={{ color: "#64748b" }}
                >
                  A unified platform for outcome-based course design, collision-proof
                  question authoring, and double-blind grading — built for institutional accountability.
                </p>
              </div>

              {/* Feature list */}
              <div className="auth-stagger-3 space-y-[1px]">
                {/* Animated line separator */}
                <div
                  className="auth-line-grow h-px mb-5"
                  style={{ background: "linear-gradient(to right, rgba(99,102,241,0.4), transparent)" }}
                />
                <div className="space-y-4">
                  {FEATURES.map((f, i) => (
                    <div key={i} className="feature-row flex gap-4 items-start group">
                      <div
                        className="mt-0.5 p-1.5 rounded-md shrink-0"
                        style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
                      >
                        <f.icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[13.5px] font-semibold text-white/90 leading-snug">
                          {f.title}
                        </p>
                        <p className="text-[12px] leading-[1.65] mt-0.5" style={{ color: "#475569" }}>
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom metrics */}
            <div
              className="auth-stagger-4 pt-6 mt-auto"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-8">
                {METRICS.map((m, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                    )}
                    <div className="metric-item">
                      <p
                        className="text-[19px] font-bold tabular-nums tracking-tight"
                        style={{ color: "#e2e8f0" }}
                      >
                        {m.value}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "#475569" }}>{m.label}</p>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            RIGHT PANEL — Authentication form
        ══════════════════════════════════════════════════════ */}
        <div className="auth-right-panel flex-1 flex flex-col justify-center items-center px-8 sm:px-12 py-14 bg-white dark:bg-[#0d0d10] relative">

          {/* Very subtle radial bg wash for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.04) 0%, transparent 100%)",
            }}
          />

          {/* Mobile logo */}
          <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-zinc-900 dark:text-white tracking-tight">FacultyOS</span>
          </div>

          <div className="relative w-full max-w-[360px] space-y-7">

            {/* Persona Switcher Tabs */}
            <div className="auth-stagger-1 p-1 rounded-xl bg-zinc-100 dark:bg-white/[0.05] border border-border/50 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setPortalPersona("university");
                  setSelectedRole(null);
                  setEmail("");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  portalPersona === "university"
                    ? "bg-white dark:bg-[#181820] text-zinc-900 dark:text-white shadow-sm border border-border/40"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>University Faculty</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPortalPersona("provider");
                  setSelectedRole("admin@facultyos.io");
                  setEmail("admin@facultyos.io");
                  setPassword("DemoFaculty123!");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  portalPersona === "provider"
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-500/25"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Platform Operator</span>
              </button>
            </div>

            {/* Heading block */}
            <div className="auth-stagger-1 space-y-1.5">
              <h2
                className="font-bold tracking-tight text-zinc-900 dark:text-white"
                style={{ fontSize: "24px", letterSpacing: "-0.025em" }}
              >
                {portalPersona === "provider"
                  ? "Platform Operator Console"
                  : "University Sign In"}
              </h2>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">
                {portalPersona === "provider"
                  ? "Master operator console for university licensing, domain gating, and monetization."
                  : "Sign in with your authorized institutional email (e.g. @ause.edu)."}
              </p>
            </div>

            {/* Demo role selector */}
            <div className="auth-stagger-2 space-y-2.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "#94a3b8" }}
              >
                {portalPersona === "provider"
                  ? "Operator Fast-Login"
                  : "Quick Demo Campus Access"}
              </p>

              {portalPersona === "university" ? (
                <div className="grid grid-cols-3 gap-2">
                  {CAMPUS_ROLES.map((r) => {
                    const isSelected = selectedRole === r.email;
                    return (
                      <button
                        key={r.email}
                        type="button"
                        onClick={() => handleDemoLogin(r)}
                        className={`role-btn ${isSelected ? "role-selected" : ""} flex flex-col gap-1.5 p-2.5 rounded-xl border text-left outline-none transition-all`}
                        style={{
                          background: isSelected ? `${r.accent}08` : "transparent",
                          borderColor: isSelected ? `${r.accent}50` : "rgba(226,232,240,1)",
                          boxShadow: isSelected ? `0 0 0 1px ${r.accent}30` : "none",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: r.accent }}
                          />
                          <span className="text-[11.5px] font-semibold text-zinc-800 dark:text-zinc-200 leading-none">
                            {r.label}
                          </span>
                        </div>
                        <span className="text-[10px] leading-tight pl-3" style={{ color: "#94a3b8" }}>
                          {r.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {PROVIDER_ROLES.map((r) => {
                    const isSelected = selectedRole === r.email;
                    return (
                      <button
                        key={r.email}
                        type="button"
                        onClick={() => handleDemoLogin(r)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-left outline-none hover:bg-purple-500/15 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white">
                            <Key className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{r.label}</span>
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-[9.5px] font-mono text-purple-300 uppercase">
                                Super-Admin
                              </span>
                            </div>
                            <div className="text-[11px] text-purple-200/70">
                              {r.email} · Master Provider Console
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-purple-300">
                          Use →
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="auth-stagger-3 flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.06]" />
              <span className="text-[11px] text-zinc-400 dark:text-zinc-600 whitespace-nowrap">
                or sign in with email
              </span>
              <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.06]" />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="auth-stagger-4 space-y-4">

              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Email address
                </Label>
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
                    onChange={(e) => { setEmail(e.target.value); setSelectedRole(null); }}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="field-input w-full h-[42px] pl-[38px] pr-3.5 text-[13.5px] rounded-xl border outline-none transition-all duration-150
                      bg-white text-zinc-900 border-zinc-200 placeholder-zinc-400
                      dark:bg-[#141418] dark:text-white dark:border-white/10 dark:placeholder-zinc-600"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-[11.5px] font-medium transition-colors duration-150"
                    style={{ color: "#6366f1" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#4f46e5")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#6366f1")}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className="h-[15px] w-[15px] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: focusedField === "password" ? "#6366f1" : "#94a3b8", transition: "color 0.15s" }}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="field-input w-full h-[42px] pl-[38px] pr-10 rounded-xl border outline-none transition-all duration-150 font-mono tracking-[0.18em]
                      bg-white text-zinc-900 border-zinc-200 placeholder-zinc-400
                      dark:bg-[#141418] dark:text-white dark:border-white/10 dark:placeholder-zinc-600"
                    style={{ fontSize: "13.5px", letterSpacing: password ? "0.18em" : "normal" }}
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
                disabled={loading}
                className="submit-btn w-full h-[42px] flex items-center justify-center gap-2 text-[13.5px] font-semibold rounded-xl text-white mt-1 disabled:opacity-55 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to FacultyOS</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Register link */}
            <p className="auth-stagger-5 text-center text-[12.5px] text-zinc-500 dark:text-zinc-400">
              New to FacultyOS?{" "}
              <Link
                href="/signup"
                className="font-semibold transition-colors duration-150"
                style={{ color: "#6366f1" }}
              >
                Create an account
              </Link>
            </p>

            {/* Trust footer */}
            <div
              className="auth-stagger-6 flex items-center justify-center gap-2 pt-3"
              style={{ borderTop: "1px solid rgba(226,232,240,0.6)" }}
            >
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
              <span className="text-[11px]" style={{ color: "#94a3b8" }}>
                FERPA-compliant · Double-blind grading protocol
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
