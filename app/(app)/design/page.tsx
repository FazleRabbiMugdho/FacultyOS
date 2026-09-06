"use client";

import * as React from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { OutcomesTab } from "@/components/design/OutcomesTab";
import { NewCourseDialog } from "@/components/design/NewCourseDialog";
import { type Course } from "@/lib/design/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  Sparkles,
  BookOpen,
  Grid,
  TrendingUp,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

export default function DesignPage() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("outcomes");

  // Fetch all courses
  const fetchCourses = React.useCallback(async () => {
    try {
      const res = await fetch("/api/design/courses");
      const data = await res.json();
      if (res.ok && data.courses) {
        setCourses(data.courses);
        if (data.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data.courses[0].id);
        }
      }
    } catch (err: any) {
      console.error("[Fetch courses failed]:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const handleCourseCreated = (newCourse: Course) => {
    setCourses((prev) => [newCourse, ...prev]);
    setSelectedCourseId(newCourse.id);
  };

  const handleSeedDefaultCourse = async () => {
    try {
      const res = await fetch("/api/design/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "CS301",
          title: "Advanced Algorithms & Complexity",
          credit_hours: 3,
          description: "Department of Computer Science & Engineering · Core 3rd Year",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create default course");
      }

      toast.success("Demo course CS301 created successfully!");
      handleCourseCreated(data.course);
    } catch (err: any) {
      toast.error(err.message || "Failed to seed demo course");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Page Header */}
      <PageHeader
        title="Course Design & Blueprint Engine"
        description="OBE Curriculum Architecture: Transform raw syllabi into Bloom's Course Outcomes, construct the sparse CO–PO correlation matrix, and synthesize outcome-drift-aware blueprints."
        badgeText="Track A Active"
        badgeVariant="default"
        icon={<Compass className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-3">
            {courses.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                  Course:
                </span>
                <Select
                  value={selectedCourse?.id || ""}
                  onValueChange={(val) => setSelectedCourseId(val)}
                >
                  <SelectTrigger className="w-[180px] sm:w-[220px] rounded-xl text-xs font-medium h-9 bg-card border-border/80">
                    <GraduationCap className="h-3.5 w-3.5 text-primary mr-1.5 shrink-0" />
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs rounded-lg font-medium">
                        <span className="font-mono font-bold text-primary mr-1.5">
                          {c.code}
                        </span>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <NewCourseDialog onCourseCreated={handleCourseCreated} />
          </div>
        }
      />

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading curriculum workspace...</p>
        </div>
      )}

      {/* Zero courses empty state */}
      {!loading && courses.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center space-y-5 glass-panel">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-foreground">
              No Courses Created Yet
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create an academic course to unlock AI-powered syllabus outcome extraction, CO–PO correlation matrix, and drift-aware blueprints.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={handleSeedDefaultCourse}
              variant="outline"
              className="rounded-xl gap-2 text-xs"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Quick-Start with CS301 (Demo Course)
            </Button>
            <NewCourseDialog
              onCourseCreated={handleCourseCreated}
              trigger={
                <Button className="rounded-xl gap-2 text-xs">
                  <Plus className="h-4 w-4" />
                  Create Custom Course
                </Button>
              }
            />
          </div>
        </div>
      )}

      {/* Main Course Content with 3 Lifecycle Tabs */}
      {!loading && selectedCourse && (
        <div className="space-y-6">
          {/* Active Course Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-mono font-bold text-sm border border-primary/20">
                {selectedCourse.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">
                    {selectedCourse.title}
                  </h2>
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {selectedCourse.credit_hours} Credits
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedCourse.description || "Outcome-Based Education Curriculum Plan"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                Active Track: <strong className="text-foreground">Track A (Design)</strong>
              </span>
            </div>
          </div>

          {/* 3 Core Tabs: Outcomes · CO-PO Matrix · Blueprint & Drift */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-lg rounded-2xl p-1 bg-muted/60 border border-border/50">
              <TabsTrigger
                value="outcomes"
                className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                1. Outcomes
              </TabsTrigger>
              <TabsTrigger
                value="co-po"
                className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5"
              >
                <Grid className="h-3.5 w-3.5" />
                2. CO–PO Matrix
              </TabsTrigger>
              <TabsTrigger
                value="blueprint"
                className="rounded-xl text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                3. Blueprint & Drift
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Outcomes Tab (Prompt A1 Feature) */}
            <TabsContent value="outcomes" className="space-y-6 focus-visible:outline-none">
              <OutcomesTab course={selectedCourse} />
            </TabsContent>

            {/* Tab 2: CO-PO Matrix Tab (Prompt A2 Standby) */}
            <TabsContent value="co-po" className="space-y-6 focus-visible:outline-none">
              <EmptyState
                icon={<Grid className="h-7 w-7 text-primary" />}
                title="CO–PO Correlation Matrix Workspace (Feature A2)"
                description={`Construct the sparse 1–3 correlation matrix mapping ${selectedCourse.code} Course Outcomes against institutional Program Outcomes (POs).`}
                actionLabel="Ready for Feature A2"
              />
            </TabsContent>

            {/* Tab 3: Blueprint & Drift Tab (Prompt A3 Standby) */}
            <TabsContent value="blueprint" className="space-y-6 focus-visible:outline-none">
              <EmptyState
                icon={<TrendingUp className="h-7 w-7 text-primary" />}
                title="Drift-Aware Exam Blueprint Workspace (Feature A3)"
                description={`Ingest lecture slides/notes via RAG and synthesize exam weight distributions reweighted by what was actually taught vs planned.`}
                actionLabel="Ready for Feature A3"
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
