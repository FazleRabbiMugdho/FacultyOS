"use client";

import * as React from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenerateTab } from "@/components/questions/GenerateTab";
import { EmptyState } from "@/components/shell/EmptyState";
import { FileQuestion, Sparkles, Sliders, ShieldAlert, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function QuestionsPage() {
  const [activeTab, setActiveTab] = React.useState<string>("generate");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Page Header */}
      <PageHeader
        title="Question Authoring & Deduplication"
        description="Author blueprint-constrained question papers, enforce cognitive balance ratios (Bloom's Taxonomy), and audit papers across triple-layer deduplication."
        badgeText="Track B Engine"
        badgeVariant="warning"
        icon={<FileQuestion className="h-5 w-5" />}
      />

      {/* Track B Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-6"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/60 backdrop-blur-sm">
            <TabsTrigger
              value="generate"
              className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs font-semibold px-4 py-2"
            >
              <Sliders className="h-4 w-4 text-primary" />
              1. Generate Paper
            </TabsTrigger>
            <TabsTrigger
              value="dedup"
              className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs font-semibold px-4 py-2"
            >
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              2. Deduplication (3-Layer)
            </TabsTrigger>
            <TabsTrigger
              value="rubrics"
              className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs font-semibold px-4 py-2"
            >
              <ListChecks className="h-4 w-4 text-emerald-500" />
              3. Analytic Rubrics (ECF)
            </TabsTrigger>
          </TabsList>

          <Badge variant="glass" className="hidden sm:inline-flex text-xs gap-1.5 py-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            ⭐ Skill-Signature Layer Active
          </Badge>
        </div>

        {/* Tab 1: Generate Paper (Track B1) */}
        <TabsContent value="generate" className="mt-0 focus-visible:outline-none">
          <GenerateTab />
        </TabsContent>

        {/* Tab 2: Triple-Layer Deduplication (Track B2 Placeholder) */}
        <TabsContent value="dedup" className="mt-0 focus-visible:outline-none">
          <EmptyState
            icon={<ShieldAlert className="h-7 w-7 text-amber-500" />}
            title="Triple-Layer Deduplication Engine"
            description="Track B2 will audit questions across Semantic Cosine, Lexical Jaccard, and Conceptual Skill-Signature comparisons to catch repeats disguised in different wording."
            actionLabel="Ready for Track B2 Implementation"
          />
        </TabsContent>

        {/* Tab 3: Analytic Rubrics (Track B3 Placeholder) */}
        <TabsContent value="rubrics" className="mt-0 focus-visible:outline-none">
          <EmptyState
            icon={<ListChecks className="h-7 w-7 text-emerald-500" />}
            title="Analytic Rubric Generator with Error-Carried-Forward (ECF)"
            description="Track B3 will auto-generate multi-criteria marking rubrics with partial-credit formulas and ECF non-penalty rules for downstream Track C grading."
            actionLabel="Ready for Track B3 Implementation"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
