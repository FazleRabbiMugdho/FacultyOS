import * as React from "react";
import { QuestionItem, BloomLevelNames, BloomLevel } from "@/lib/questions/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Edit3,
  Check,
  Trash2,
  Copy,
  Clock,
  Tag,
  Target,
  FileCode2,
} from "lucide-react";

interface QuestionCardProps {
  question: QuestionItem;
  index: number;
  onUpdate: (updated: QuestionItem) => void;
  onDelete: (id?: string) => void;
  onDuplicate: (question: QuestionItem) => void;
}

export function QuestionCard({
  question,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(question.text);
  const [editMarks, setEditMarks] = React.useState(question.marks);
  const [editBloom, setEditBloom] = React.useState<BloomLevel>(question.bloom_level);
  const [editSkill, setEditSkill] = React.useState(question.skill_signature);

  const bloomMeta = BloomLevelNames[question.bloom_level] || BloomLevelNames[3];

  const handleSave = () => {
    onUpdate({
      ...question,
      text: editText,
      marks: Number(editMarks),
      bloom_level: editBloom,
      skill_signature: editSkill,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(question.text);
    setEditMarks(question.marks);
    setEditBloom(question.bloom_level);
    setEditSkill(question.skill_signature);
    setIsEditing(false);
  };

  return (
    <div className="group relative rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 backdrop-blur-sm">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
            Q{index + 1}
          </span>

          {/* Marks Badge */}
          <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-foreground">
            {question.marks} Marks
          </Badge>

          {/* Bloom Badge */}
          <Badge variant={bloomMeta.variant} className="text-xs">
            {bloomMeta.name}
          </Badge>

          {/* CO Badge */}
          <Badge variant="secondary" className="text-xs">
            {question.co_code}
          </Badge>

          {/* Time Badge */}
          {question.estimated_minutes && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              ~{question.estimated_minutes} min
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={handleSave}
              >
                <Check className="h-3.5 w-3.5" />
                Done
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditing(true)}
                title="Edit Question"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onDuplicate(question)}
                title="Duplicate Question"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                onClick={() => onDelete(question.id)}
                title="Delete Question"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Question Body */}
      {isEditing ? (
        <div className="space-y-3 animate-fade-in">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Question Statement</label>
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[100px] text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Marks</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={editMarks}
                onChange={(e) => setEditMarks(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Bloom&apos;s Level</label>
              <Select
                value={String(editBloom)}
                onValueChange={(val) => setEditBloom(Number(val) as BloomLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">L1: Remember</SelectItem>
                  <SelectItem value="2">L2: Understand</SelectItem>
                  <SelectItem value="3">L3: Apply</SelectItem>
                  <SelectItem value="4">L4: Analyze</SelectItem>
                  <SelectItem value="5">L5: Evaluate</SelectItem>
                  <SelectItem value="6">L6: Create</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Skill Signature</label>
              <Input
                value={editSkill}
                onChange={(e) => setEditSkill(e.target.value)}
                placeholder="Core skill tested"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium">
            {question.text}
          </p>

          {/* ⭐ Differentiator: Skill Signature Pill */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-2.5 flex items-start gap-2 text-xs">
            <Target className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                <span>Skill Signature:</span>
                <span className="font-normal text-foreground">{question.skill_signature}</span>
              </div>
              {question.skill_tags && question.skill_tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {question.skill_tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
