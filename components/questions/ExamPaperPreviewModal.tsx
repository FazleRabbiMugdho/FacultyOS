import * as React from "react";
import { QuestionItem } from "@/lib/questions/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Copy, Check, FileDown, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface ExamPaperPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuestionItem[];
  courseCode: string;
  courseTitle: string;
  examTitle: string;
  totalMarks: number;
  durationMinutes: number;
}

export function ExamPaperPreviewModal({
  open,
  onOpenChange,
  questions,
  courseCode,
  courseTitle,
  examTitle,
  totalMarks,
  durationMinutes,
}: ExamPaperPreviewModalProps) {
  const [copied, setCopied] = React.useState(false);

  // Group by Module
  const moduleGroups = React.useMemo(() => {
    const map = new Map<string, QuestionItem[]>();
    for (const q of questions) {
      const existing = map.get(q.module) || [];
      existing.push(q);
      map.set(q.module, existing);
    }
    return Array.from(map.entries());
  }, [questions]);

  const generateMarkdown = () => {
    let md = `# ${examTitle.toUpperCase()}\n`;
    md += `**Course:** ${courseCode} - ${courseTitle}\n`;
    md += `**Total Marks:** ${totalMarks} Marks | **Duration:** ${durationMinutes} Minutes\n`;
    md += `**Instructions:** Answer all questions. Clearly state all assumptions.\n\n---\n\n`;

    let qCount = 1;
    for (const [moduleName, qList] of moduleGroups) {
      md += `### ${moduleName.toUpperCase()}\n\n`;
      for (const q of qList) {
        md += `**Q${qCount}.** ${q.text}  \n`;
        md += `*[${q.marks} Marks | ${q.co_code} | Bloom Level ${q.bloom_level}]*\n\n`;
        qCount++;
      }
    }
    return md;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    toast.success("Exam paper copied to clipboard in Markdown format");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Examination Paper Preview
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Printable Paper Canvas */}
        <div className="rounded-xl border border-border/80 bg-background p-8 font-serif shadow-inner space-y-6 text-foreground print:border-none print:shadow-none print:p-0">
          {/* Institutional Exam Header */}
          <div className="text-center space-y-1.5 border-b-2 border-foreground pb-4">
            <h2 className="text-xl font-bold tracking-wide uppercase">
              DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
            </h2>
            <h3 className="text-lg font-semibold">{examTitle}</h3>
            <div className="flex flex-wrap items-center justify-between text-xs pt-2 font-sans font-medium text-muted-foreground">
              <span><strong>Course Code:</strong> {courseCode}</span>
              <span><strong>Course Title:</strong> {courseTitle}</span>
              <span><strong>Time Allowed:</strong> {durationMinutes} Mins</span>
              <span><strong>Max. Marks:</strong> {totalMarks}</span>
            </div>
            <p className="text-[11px] font-sans text-muted-foreground pt-1 italic">
              Instructions: Answer all questions. Figures to the right indicate full marks.
            </p>
          </div>

          {/* Questions Grouped by Module */}
          <div className="space-y-6 text-sm">
            {moduleGroups.map(([moduleName, qList], mIdx) => (
              <div key={mIdx} className="space-y-4">
                <div className="text-xs font-bold font-sans uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                  {moduleName}
                </div>
                <div className="space-y-4">
                  {qList.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <p className="leading-relaxed">
                          <span className="font-bold font-sans mr-2">
                            Q{questions.indexOf(q) + 1}.
                          </span>
                          {q.text}
                        </p>
                        <div className="text-[11px] font-sans text-muted-foreground">
                          [Target Outcome: {q.co_code} · Skill: {q.skill_signature}]
                        </div>
                      </div>
                      <div className="font-bold font-sans text-xs whitespace-nowrap pt-0.5">
                        [{q.marks}]
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-xs text-muted-foreground pt-6 border-t border-border/60 italic font-sans">
            — END OF QUESTION PAPER —
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <div className="text-xs text-muted-foreground">
            {questions.length} Questions · Total {totalMarks} Marks
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Markdown"}
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
