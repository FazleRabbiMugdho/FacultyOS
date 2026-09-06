import * as React from "react";
import { DedupFlagResult } from "@/lib/questions/dedup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Printer, Copy, Check, Award, FileCheck } from "lucide-react";
import { toast } from "sonner";

interface DedupCertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flags: DedupFlagResult[];
  courseCode: string;
  courseTitle: string;
  examTitle: string;
}

export function DedupCertificateModal({
  open,
  onOpenChange,
  flags,
  courseCode,
  courseTitle,
  examTitle,
}: DedupCertificateModalProps) {
  const [copied, setCopied] = React.useState(false);

  const clearCount = flags.filter((f) => f.status === "clear").length;
  const reviewCount = flags.filter((f) => f.status === "review").length;
  const rejectedCount = flags.filter((f) => f.status === "rejected").length;
  const originalityScore = flags.length > 0 ? Math.round((clearCount / flags.length) * 100) : 100;

  const handleCopy = () => {
    const text = `FACULTYS OS (IAPEA) — ORIGINALITY & DEDUPLICATION AUDIT CERTIFICATE
Exam: ${examTitle} (${courseCode} - ${courseTitle})
Date: ${new Date().toLocaleDateString()}
Originality Score: ${originalityScore}%
Total Questions Audited: ${flags.length}
Clear: ${clearCount} | Needs Review: ${reviewCount} | Rejected: ${rejectedCount}
Verified against historical question vectors with Cosine, Jaccard, and Skill-Signature analysis.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Certificate text copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Institutional Deduplication & Originality Certificate
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 space-y-6 shadow-inner text-foreground">
          <div className="text-center space-y-1 border-b border-border/60 pb-4">
            <Badge variant="success" className="gap-1 mb-2 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Triple-Layer Audit Passed
            </Badge>
            <h3 className="text-lg font-bold uppercase tracking-wider">
              Examination Paper Originality Verification
            </h3>
            <p className="text-xs text-muted-foreground">
              {courseCode} - {courseTitle} · {examTitle}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="text-2xl font-bold text-emerald-500 tabular-nums">
                {originalityScore}%
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">Originality Index</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {flags.length}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">Audited Questions</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="text-2xl font-bold text-primary tabular-nums">
                3 Layers
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">Semantic/Lexical/Skill</div>
            </div>
          </div>

          <div className="text-xs space-y-2 text-muted-foreground leading-relaxed border-t border-border/60 pt-4">
            <p>
              This certificate affirms that the authored examination paper has been evaluated against historical institutional question banks using <strong>IAPEA Triple-Layer Deduplication Engine</strong>:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Layer 1: Dense 768-dim semantic cosine similarity ($&lt;0.82$)</li>
              <li>Layer 2: Lexical Jaccard token overlap ($&lt;0.60$)</li>
              <li>Layer 3: Conceptual skill-signature task alignment verification</li>
            </ul>
          </div>

          <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-border/60">
            <span>Verified by: FacultyOS / IAPEA Co-Pilot</span>
            <span>Date: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy Certificate"}
          </Button>
          <Button size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            Print Certificate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
