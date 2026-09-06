"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { type Course } from "@/lib/design/types";

interface NewCourseDialogProps {
  onCourseCreated: (course: Course) => void;
  trigger?: React.ReactNode;
}

export function NewCourseDialog({
  onCourseCreated,
  trigger,
}: NewCourseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [creditHours, setCreditHours] = React.useState(3);
  const [description, setDescription] = React.useState("");

  const resetForm = () => {
    setCode("");
    setTitle("");
    setCreditHours(3);
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      toast.error("Please provide both course code and title");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/design/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          title: title.trim(),
          credit_hours: Number(creditHours),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create course");
      }

      toast.success(`Course ${data.course.code} created successfully!`);
      onCourseCreated(data.course);
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            New Course
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-2xl border-border/80 glass-panel">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
              <BookOpen className="h-4 w-4" />
              Course Definition
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              Create New Course
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the academic course entity to begin OBE outcome extraction and syllabus blueprinting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label htmlFor="code" className="text-xs font-semibold">
                  Course Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="CS301"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="rounded-xl uppercase font-mono tracking-wider font-medium"
                  required
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="credit" className="text-xs font-semibold">
                  Credit Hours
                </Label>
                <Input
                  id="credit"
                  type="number"
                  min={1}
                  max={6}
                  value={creditHours}
                  onChange={(e) => setCreditHours(Number(e.target.value))}
                  className="rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold">
                Course Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Advanced Algorithms & Data Structures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs font-semibold">
                Description / Department (Optional)
              </Label>
              <Textarea
                id="desc"
                placeholder="Department of Computer Science & Engineering · Core 3rd Year"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl resize-none h-20 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl gap-2 min-w-[110px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Course"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
