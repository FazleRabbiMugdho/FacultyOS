import * as React from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Scale, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GradingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Grading, Double-Blind & Reliability"
        description="Multimodal AI evaluation of handwritten student scripts with confidence-per-region HITL, double-blind arbitration, and Cohen's Kappa fairness analytics."
        badgeText="Track C"
        badgeVariant="success"
        icon={<Scale className="h-5 w-5" />}
        actions={
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Exam Scripts
          </Button>
        }
      />

      <EmptyState
        icon={<Scale className="h-7 w-7 text-primary" />}
        title="Track C: Multimodal Grading & Fairness Dashboard"
        description="Foundation is frozen and ready. Track C will build the Image-Native Vision Grading with Surgical Region HITL, Double-Blind Two-Examiner Split View + Δ Arbitration, and Reliability Dashboard here."
        actionLabel="Ready for Track C Implementation"
      />
    </div>
  );
}
