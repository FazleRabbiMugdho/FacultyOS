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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  User,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [role, setRole] = React.useState<"junior" | "senior" | "admin">("junior");
  const [loading, setLoading] = React.useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (error) {
        toast.error(error.message || "Failed to create account");
        return;
      }

      toast.success("Account created successfully! Welcome to FacultyOS.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
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
                  IAPEA Registration
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Intelligent Academic Processing & Evaluation Architecture
              </p>
            </div>
          </div>
        </div>

        {/* Center Hero */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>University Faculty Onboarding</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight font-heading">
              Join the Next-Gen <br />
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Higher-Education Architecture.
              </span>
            </h1>
            <p className="text-sm text-slate-300/90 leading-relaxed max-w-xl">
              Equip your academic department with rigorous Outcome-Based Education (OBE) course design, duplicate-proof question papers, and double-blind grading arbitration.
            </p>
          </div>

          {/* Role Responsibilities Summary Card */}
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm space-y-1">
              <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/30">
                Junior Faculty
              </Badge>
              <p className="text-[11px] text-slate-300 font-semibold">Examiner (E1)</p>
              <p className="text-[10px] text-slate-400 leading-tight">
                First-blind script evaluation & question paper drafting.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm space-y-1">
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">
                Senior Faculty
              </Badge>
              <p className="text-[11px] text-slate-300 font-semibold">Examiner (E2/E3)</p>
              <p className="text-[10px] text-slate-400 leading-tight">
                Second-blind marking, rubric sign-off & Δ arbitration.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm space-y-1">
              <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/30">
                Dean / Admin
              </Badge>
              <p className="text-[11px] text-slate-300 font-semibold">Program Chair</p>
              <p className="text-[10px] text-slate-400 leading-tight">
                ABET/OBE alignment, faculty calibration & reliability.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-mono">Role-Based Access Control (RBAC) Enforced</span>
          </div>
          <span className="text-[11px] text-slate-500">v2.0 Architecture</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Registration Form (5 cols)                                  */}
      {/* ========================================================================= */}
      <div className="col-span-1 lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative overflow-hidden">
        {/* Subtle mobile header */}
        <div className="lg:hidden mb-6 text-center space-y-1.5">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg mb-1">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
            Join FacultyOS
          </h2>
          <p className="text-xs text-muted-foreground">
            Register for university academic evaluation
          </p>
        </div>

        <div className="w-full max-w-md space-y-5 animate-fade-in">
          <div className="space-y-1">
            <Badge variant="glass" className="text-xs font-mono mb-1 text-primary gap-1 py-0.5">
              <UserCheck className="h-3 w-3" /> Faculty Onboarding
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Create Account
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter your professional details to establish your institutional profile.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="fullName" className="text-xs font-semibold">
                Full Name
              </Label>
              <div className="relative">
                <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="Prof. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="pl-9 h-10 text-xs bg-background/90 border-border/80 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold">
                University Email
              </Label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="faculty@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 h-10 text-xs bg-background/90 border-border/80 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="role" className="text-xs font-semibold">
                Institutional Role
              </Label>
              <Select value={role} onValueChange={(val: any) => setRole(val)}>
                <SelectTrigger id="role" className="h-10 text-xs bg-background/90 border-border/80">
                  <SelectValue placeholder="Select faculty role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior" className="text-xs">
                    Junior Faculty (Examiner E1)
                  </SelectItem>
                  <SelectItem value="senior" className="text-xs">
                    Senior Faculty / Chair (Examiner E2 / E3 Arbitrator)
                  </SelectItem>
                  <SelectItem value="admin" className="text-xs">
                    Department Admin (Dean / Program Head)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-semibold">
                Password
              </Label>
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
              className="w-full h-10 gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg mt-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <span>Complete Institutional Registration</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground pt-1">
              Already have an institutional account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </form>

          <div className="pt-3 border-t border-border/60 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>FERPA & Double-Blind Protocol Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
