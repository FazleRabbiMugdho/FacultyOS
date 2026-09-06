"use client";

import * as React from "react";
import { QuestionItem, Rubric } from "@/lib/questions/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Printer, FileText, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface RubricExportModalProps {
  question: QuestionItem;
  rubric: Rubric;
}

export function RubricExportModal({ question, rubric }: RubricExportModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Generate formatted markdown scheme
  const markdownScheme = React.useMemo(() => {
    let md = `# OFFICIAL MARKING SCHEME & ANALYTIC RUBRIC\n`;
    md += `**Question:** ${question.text}\n`;
    md += `**Total Marks:** ${question.marks} | **Bloom's Level:** L${question.bloom_level} | **Outcome:** ${question.co_code || "CO1"}\n`;
    if (question.skill_signature) {
      md += `**Cognitive Skill Tested:** ${question.skill_signature}\n`;
    }
    md += `\n---\n\n`;
    md += `### EVALUATION CRITERIA (WITH ERROR-CARRIED-FORWARD PROTECTION)\n\n`;

    rubric.criteria.forEach((c, idx) => {
      md += `#### Criterion ${idx + 1}: ${c.label} [Max: ${c.max_marks} marks]\n`;
      if (c.keywords && c.keywords.length > 0) {
        md += `- **Required Concepts/Keywords:** ${c.keywords.join(", ")}\n`;
      }
      md += `- **Partial Credit Rule:** ${c.partial_credit_rule}\n`;
      md += `- **Error-Carried-Forward (ECF) Rule:** ${c.ecf_rule}\n`;
      if (c.guidance) {
        md += `- **Examiner Notes:** ${c.guidance}\n`;
      }
      md += `\n`;
    });

    if (rubric.rationale) {
      md += `---\n**Pedagogical Rationale:** ${rubric.rationale}\n`;
    }

    return md;
  }, [question, rubric]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownScheme);
    setCopied(true);
    toast.success("Marking scheme copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Export Scheme
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Official Marking Guide & ECF Key
            </DialogTitle>
            <Badge variant="glass" className="text-xs">
              {question.marks} Total Marks
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Exportable grading key with Error-Carried-Forward rules for human & AI examiners.
          </DialogDescription>
        </DialogHeader>

        {/* Printable/Copyable Content Preview */}
        <div className="p-4 rounded-lg bg-muted/40 border border-border/60 font-mono text-xs space-y-3 whitespace-pre-wrap select-all leading-relaxed max-h-[50vh] overflow-y-auto">
          {markdownScheme}
        </div>

        {/* Modal Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" /> Print Scheme
          </Button>

          <Button
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs bg-primary text-primary-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-300" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Markdown
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
