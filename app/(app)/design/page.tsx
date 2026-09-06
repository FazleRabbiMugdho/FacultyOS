import * as React from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Compass, Sparkles, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DesignPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Design & Blueprint"
        description="Extract measurable Bloom's Course Outcomes from raw syllabus, construct the CO–PO correlation matrix, and build a drift-aware exam blueprint."
        badgeText="Track A"
        badgeVariant="default"
        icon={<Compass className="h-5 w-5" />}
        actions={
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            New Course
          </Button>
        }
      />

      <EmptyState
        icon={<BookOpen className="h-7 w-7 text-primary" />}
        title="Track A: Course Design & OBE Workspace"
        description="Foundation is frozen and ready. Track A will build the Outcomes Tab, CO–PO Matrix Heatmap, and RAG Ingestion + Outcome-Drift-Aware Exam Blueprint here."
        actionLabel="Ready for Track A Implementation"
      />
    </div>
  );
}
