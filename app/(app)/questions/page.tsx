import * as React from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { FileQuestion, Sparkles, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuestionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Authoring & Deduplication"
        description="Generate blueprint-constrained question papers with cognitive balance ratios, run triple-layer deduplication, and build analytic partial-credit rubrics."
        badgeText="Track B"
        badgeVariant="warning"
        icon={<FileQuestion className="h-5 w-5" />}
        actions={
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Paper
          </Button>
        }
      />

      <EmptyState
        icon={<Sliders className="h-7 w-7 text-primary" />}
        title="Track B: Question Paper & Dedup Engine"
        description="Foundation is frozen and ready. Track B will build the Blueprint-Constrained Generator, Triple-Layer Dedup Engine (Cosine + Jaccard + Skill Signature), and Analytic Rubric Creator here."
        actionLabel="Ready for Track B Implementation"
      />
    </div>
  );
}
