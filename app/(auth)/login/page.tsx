"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  BookOpenCheck,
  ShieldAlert,
  Scale,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  Layers,
  Sparkle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<"junior" | "senior" | "admin" | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      let { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If invalid credentials on a demo email, auto-create and sign in
      if (error && email.endsWith("@facultyos.edu")) {
        const role = email.split("@")[0] as "junior" | "senior" | "admin";
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: `${role.charAt(0).toUpperCase() + role.slice(1)} Faculty`,
              role: role || "junior",
            },
          },
        });

        if (!signUpError) {
          const res = await supabase.auth.signInWithPassword({ email, password });
          error = res.error;
        }
      }

      if (error) {
        toast.error(error.message || "Failed to sign in");
        return;
      }

      toast.success("Signed in successfully! Welcome to FacultyOS.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: "junior" | "senior" | "admin") => {
    setSelectedRole(role);
    setEmail(`${role}@facultyos.edu`);
    setPassword("DemoFaculty123!");
    toast.info(`Loaded ${role.toUpperCase()} credentials`);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background selection:bg-primary/20">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: Deep Visual Showcase & Academic Platform Branding (7 cols)    */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 overflow-hidden border-r border-border/40">
        {/* Ambient background glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/25 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-[110px] pointer-events-none" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_80%,transparent_100%)] opacity-30 pointer-events-none" />

        {/* Top Branding Header */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/30 ring-1 ring-white/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-heading">
                  FacultyOS
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary bg-primary/10 px-2 py-0.5">
                  IAPEA Core v2.0
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Intelligent Academic Processing & Evaluation Architecture
              </p>
            </div>
          </div>
        </div>

        {/* Center Hero & 3-Track Feature Pillars */}
        <div className="relative z-10 my-auto py-8 space-y-7">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>Higher-Education Academic Co-Pilot</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight font-heading">
              Design the Course. <br />
              Author the Exam. <br />
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Grade with Surgical Fairness.
              </span>
            </h1>
            <p className="text-sm text-slate-300/90 leading-relaxed max-w-xl">
              End-to-end university workflow engine aligning Outcome-Based Education (OBE) with vector deduplication and multimodal double-blind arbitration.
            </p>
          </div>

          {/* 3 Core Track Highlights */}
          <div className="grid grid-cols-1 gap-3.5 max-w-xl">
            {/* Track A Pillar */}
            <div className="group p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all duration-200 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <BookOpenCheck className="h-4 w-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Track A: Course Design & Outcome-Drift
                    </span>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                      Bloom L1–L6
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Syllabus RAG ingestion, OBE outcome generation, sparsity-enforced CO-PO matrix, and taught vs planned drift analysis.
                  </p>
                </div>
              </div>
            </div>

            {/* Track B Pillar */}
            <div className="group p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all duration-200 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Track B: Question Dedup & ECF Rubrics
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      3-Layer Dedup
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    pgvector cosine + Jaccard + ⭐ Skill-Signature <em>"same skill, different disguise"</em> detector with Error-Carried-Forward (ECF) rubrics.
                  </p>
                </div>
              </div>
            </div>

            {/* Track C Pillar */}
            <div className="group p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all duration-200 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <Scale className="h-4 w-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Track C: Multimodal Grading & Arbitration
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                      Cohen's κ Calibration
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Image-native VLM script grading, surgical confidence-per-region (&lt;0.85 HITL), double-blind Δ discrepancy routing, and bias calibration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Metrics & Institutional Trust */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <div>
              <span className="font-bold text-white block text-sm">99.4%</span>
              <span className="text-slate-500">Grading Reliability</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="font-bold text-white block text-sm">768-dim</span>
              <span className="text-slate-500">Vector Embeddings</span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="font-bold text-white block text-sm">100% Blind</span>
              <span className="text-slate-500">FERPA Anonymization</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>RLS Active</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Precision-Glass Authentication Form & Role Sandbox (5 cols) */}
      {/* ========================================================================= */}
      <div className="col-span-1 lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative overflow-hidden">
        {/* Subtle mobile header */}
        <div className="lg:hidden mb-8 text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-1">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            FacultyOS <span className="text-xs font-normal text-primary border border-primary/30 rounded-full px-2 py-0.5 ml-1 font-mono">IAPEA</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Intelligent Academic Processing & Evaluation Architecture
          </p>
        </div>

        <div className="w-full max-w-md space-y-6 animate-fade-in">
          {/* Header Title inside card container */}
          <div className="space-y-1.5">
            <Badge variant="glass" className="text-xs font-mono mb-1 text-primary gap-1 py-0.5">
              <Lock className="h-3 w-3" /> Institutional Portal
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Faculty Sign In
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your university credentials or select a pre-configured role to simulate double-blind academic evaluation.
            </p>
          </div>

          {/* Quick Demo Sandbox Roles */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Quick Role Simulation:
              </span>
              <span className="text-[10px] text-muted-foreground italic">
                Click to autofill
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Junior Role */}
              <button
                type="button"
                onClick={() => handleDemoLogin("junior")}
                className={`p-2 rounded-lg border text-left transition-all duration-200 text-xs flex flex-col justify-between ${
                  selectedRole === "junior"
                    ? "bg-primary/10 border-primary ring-1 ring-primary shadow-xs"
                    : "bg-background hover:bg-muted/70 border-border/60"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-[11px] text-foreground">Junior</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-blue-500 border-blue-500/30">
                    E1
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-1">
                  First Examiner
                </span>
              </button>

              {/* Senior Role */}
              <button
                type="button"
                onClick={() => handleDemoLogin("senior")}
                className={`p-2 rounded-lg border text-left transition-all duration-200 text-xs flex flex-col justify-between ${
                  selectedRole === "senior"
                    ? "bg-primary/10 border-primary ring-1 ring-primary shadow-xs"
                    : "bg-background hover:bg-muted/70 border-border/60"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-[11px] text-foreground">Senior</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-500 border-amber-500/30">
                    E2/E3
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-1">
                  Arbitrator
                </span>
              </button>

              {/* Admin Role */}
              <button
                type="button"
                onClick={() => handleDemoLogin("admin")}
                className={`p-2 rounded-lg border text-left transition-all duration-200 text-xs flex flex-col justify-between ${
                  selectedRole === "admin"
                    ? "bg-primary/10 border-primary ring-1 ring-primary shadow-xs"
                    : "bg-background hover:bg-muted/70 border-border/60"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-[11px] text-foreground">Dean</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-purple-500 border-purple-500/30">
                    Admin
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground line-clamp-1">
                  Full Access
                </span>
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                Institutional Email
              </Label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="faculty@university.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedRole(null);
                  }}
                  required
                  className="pl-9 h-10 text-xs bg-background/90 border-border/80 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Password
                </Label>
                <span className="text-[11px] text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-9 pr-10 h-10 text-xs bg-background/90 border-border/80 focus-visible:ring-primary font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <span>Sign In to Academic Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground pt-1">
              New faculty member or institutional lead?{" "}
              <Link href="/signup" className="text-primary font-semibold hover:underline">
                Create an account
              </Link>
            </div>
          </form>

          {/* Security & Protocol Notice */}
          <div className="pt-4 border-t border-border/60 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>FERPA & Double-Blind Protocol Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
