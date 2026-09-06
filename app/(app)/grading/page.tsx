import * as React from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Scale } from "lucide-react";
import { GradingWorkspace } from "@/components/grading/GradingWorkspace";

export default function GradingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Grading, Double-Blind & Reliability"
        description="Multimodal AI evaluation of handwritten student scripts with confidence-per-region HITL, double-blind arbitration, and Cohen's Kappa fairness analytics."
        badgeText="Track C"
        badgeVariant="success"
        icon={<Scale className="h-5 w-5" />}
      />
      <GradingWorkspace />
    </div>
  );
}
