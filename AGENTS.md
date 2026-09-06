# FacultyOS (IAPEA) — Agent & Developer Collaboration Playbook

> **Intelligent Academic Processing & Evaluation Architecture (IAPEA)**  
> AI Co-Pilot for University Faculty: **Design the Course → Author the Exam → Grade Fairly.**

This document defines the strict architectural boundaries, table ownership, file isolation, API contracts, and design guidelines that allow multiple developers and AI agents to work **completely in parallel without merge conflicts or blocking dependencies**.

---

## 1. Multi-Track Architecture & Zero-Conflict Boundaries

The application is structured into **3 independent parallel tracks** built on top of a frozen foundation (Wave 0).

```
                         ┌──────────────────────────────────────────────┐
                         │           FacultyOS (Next.js 14 App)         │
                         │                                              │
  Faculty ──browser──▶   │  UI (Precision-Glass + Modern Minimalism)    │
                         │   /design          /questions      /grading  │
                         │   (Track A)        (Track B)       (Track C) │
                         │      │                 │              │      │
                         │      ▼                 ▼              ▼      │
                         │  Route Handlers  (app/api/**) + Zod Schemas  │
                         └──────┬─────────────────┬──────────────┬──────┘
                                │                 │              │
                   ┌────────────▼────┐    ┌───────▼───────┐ ┌────▼─────────────┐
                   │ Gemini 1.5      │    │ Gemini embed  │ │ OpenRouter VLM   │
                   │ text/JSON       │    │ text-embed-004│ │ Claude3.5 / GPT4o│
                   └─────────────────┘    └───────┬───────┘ └──────────────────┘
                                │                 │              │
                         ┌──────▼─────────────────▼──────────────▼──────┐
                         │                  Supabase                    │
                         │   Postgres + RLS │ pgvector │ Auth │ Storage │
                         └──────────────────────────────────────────────┘
```

---

## 2. Strict Ownership Maps (Merge Conflict Prevention)

### 📁 File Ownership Matrix
Each track has **exclusive write access** to its designated folders. **Never edit files outside your track.**

| Track / Role | Exclusive Write Directories | Forbidden Edits |
|---|---|---|
| **Wave 0 (Frozen)** | `app/layout.tsx`, `app/(app)/layout.tsx`, `components/ui/`, `components/shell/`, `lib/supabase/`, `lib/ai/`, `lib/utils.ts`, `supabase/migrations/` | Tracks must not alter unless coordinating Wave 2 integration |
| **Track A (Design)** | `app/(app)/design/`<br>`app/api/design/`<br>`lib/design/`<br>`components/design/` | Track B & C folders |
| **Track B (Author)** | `app/(app)/questions/`<br>`app/api/questions/`<br>`lib/questions/`<br>`components/questions/` | Track A & C folders |
| **Track C (Grade)** | `app/(app)/grading/`<br>`app/api/grading/`<br>`lib/grading/`<br>`components/grading/` | Track A & B folders |
| **Wave 2 (Integration)** | `app/(app)/dashboard/page.tsx`, `DEMO_SCRIPT.md`, Cross-track handoff CTAs | Individual track internal logic |

---

### 🗄️ Database Table Ownership Matrix
Tracks may **read from any table**, but can **write only to their owned tables**.

| Track | Write Access (Exclusive) | Read Access | Seed Independence Strategy |
|---|---|---|---|
| **Track A — Design** | `courses`<br>`course_outcomes`<br>`co_po_mappings`<br>`documents`<br>`doc_chunks`<br>`blueprints`<br>`blueprint_topics` | `program_outcomes` | Seeds sample syllabus & course |
| **Track B — Author** | `questions`<br>`question_dedup_flags`<br>`rubrics` | `courses`<br>`course_outcomes`<br>`blueprints`<br>`blueprint_topics`<br>`doc_chunks` | Seeds 1 mock blueprint + 2 historical questions for dedup testing |
| **Track C — Grade** | `exam_scripts`<br>`grading_assignments`<br>`grades`<br>`arbitrations`<br>`reliability_metrics`<br>`examiner_bias_profiles` | `questions`<br>`rubrics`<br>`profiles` | Seeds 1 mock question + published rubric + sample script images |
| **Wave 2 — Feedback** | `co_performance` | `grades`<br>`arbitrations`<br>`questions`<br>`course_outcomes` | Requires grades to compute CO failure flags |

---

## 3. Parallel Track Specification & Implementation Playbook

### 📐 Track A — Course Design & Blueprint Engine
* **Landing Route**: `app/(app)/design/page.tsx`
* **Core Tabs**: Outcomes Tab · CO–PO Matrix · Blueprint & Drift Tab

#### Feature A1: Syllabus $\rightarrow$ OBE Course Outcomes (`POST /api/design/outcomes`)
* **Task**: Parse raw syllabus text / uploaded PDF, call `generateJSON` with Zod schema to extract 4–8 measurable Course Outcomes.
* **Constraints**: Must map to Revised Bloom's Taxonomy (Levels 1–6) with precise action verbs (e.g., Level 1–2: Remember/Understand, Level 3: Apply, Level 4–6: Analyze/Evaluate/Create).
* **UI**: Editable card list with color-scaled Bloom badges (`bloom1` through `bloom6`), inline edit/delete.

#### Feature A2: CO–PO Mapping Matrix (`POST /api/design/co-po`)
* **Task**: Generate correlation matrix (COs × POs) on a 1–3 weight scale (`1` = recall, `2` = application, `3` = analysis/design).
* **Constraints**: Explicitly prevent dense matrices (enforce sparsity; map only genuine correlations).
* **UI**: Interactive heatmap grid with accent-opacity saturation scales, click-to-edit weight (0/1/2/3) with optimistic UI updates.

#### Feature A3: RAG Ingestion + Drift-Aware Exam Blueprint (`POST /api/design/blueprint`)
* **Task**: Ingest slides/past papers $\rightarrow$ `chunkText` $\rightarrow$ `embedBatch` $\rightarrow$ insert `doc_chunks` with `vector(768)`. Retrieve topic volumes via `match_chunks` RPC.
* **⭐ Differentiator (Outcome Drift)**: Compute `planned_weight` (syllabus schedule) vs `actual_weight` (material actually delivered based on chunk volume + `taught_at` timestamps). Store `drift = actual - planned`.
* **UI**: Weighted progress bar + topic distribution table (sums to 100%), drift indicators (up/down arrows), and toggle: *"Weight by: Planned Syllabus / Actually Taught"*.

---

### ✍️ Track B — Question Paper & Deduplication Engine
* **Landing Route**: `app/(app)/questions/page.tsx`
* **Core Tabs**: Generate Paper · Deduplication · Rubrics

#### Feature B1: Blueprint-Constrained Question Generator (`POST /api/questions/generate`)
* **Task**: Read `blueprint_topics` and `course_outcomes`, generate balanced question paper satisfying total marks and cognitive balance ratio (e.g., 40% lower-order / 60% higher-order).
* **⭐ Differentiator (Skill Signature)**: For every generated and historical question, generate a `skill_signature` (e.g. *"apply Bayes' theorem to 2-variable posterior"*) + `skill_tags[]` and store vector embeddings.
* **UI**: Grouped module view with marks and Bloom badges, target vs actual cognitive ratio bar.

#### Feature B2: Triple-Layer Deduplication Engine (`POST /api/questions/dedup`)
* **Task**: For each question, compare against historical exams across 3 layers:
  1. **Layer 1 (Semantic)**: Cosine similarity via `match_questions` RPC ($\ge 0.82 \rightarrow$ `rejected`, $0.70\text{--}0.82 \rightarrow$ `review`).
  2. **Layer 2 (Lexical)**: Tokenized Jaccard similarity in TypeScript ($\ge 0.60 \rightarrow$ `rejected`).
  3. **⭐ Layer 3 (Conceptual / Skill-Signature)**: Compares `skill_signature` embeddings and `skill_tags`. Flags questions with identical cognitive tasks disguised in different numbers/wording (*"Same skill, different disguise"*).
* **UI**: Side-by-side comparison drawer, three score bars with threshold markers, and action buttons to Keep / Reject / Regenerate.

#### Feature B3: Analytic Rubric Generator (`POST /api/questions/rubric`)
* **Task**: Auto-generate granular criteria for each question with total marks auto-validation, explicit partial-credit rules, and **Error-Carried-Forward (ECF)** non-penalty rules.
* **UI**: Criteria cards, max-marks badges, rubric publish button (marks rubric ready for Track C).
* **API for Track C**: `GET /api/questions/rubric?question_id=`.

---

### ⚖️ Track C — Grading, Double-Blind & Reliability
* **Landing Route**: `app/(app)/grading/page.tsx`
* **Core Tabs**: AI Grade · Double-Blind · Reliability & Fairness

#### Feature C1: Multimodal AI Script Grading with Surgical HITL (`POST /api/grading/ai`)
* **Task**: Upload handwritten exam script image (masked student ID for anonymity), evaluate image-native via OpenRouter Claude 3.5 Sonnet / GPT-4o against rubric.
* **⭐ Differentiator (Confidence-Per-Region)**: VLM returns per-step/line `region_confidences`.
* **HITL Routing**: If confidence $< 0.85$, highlight only the ambiguous lines/steps in amber/red rather than sending the entire paper for manual review. Human can accept or override scores.

#### Feature C2: Double-Blind Two-Examiner Marking & Discrepancy Arbitration (`POST /api/grading/submit`)
* **Task**: Split view (script image on left, interactive rubric on right). Examiner E1 and E2 grade blindly without seeing each other's scores.
* **Arbitration**: Compute deviation $\Delta = \frac{|s_1 - s_2|}{\text{total}} \times 100\%$. If $\Delta \le 10\%$, average scores; if $\Delta > 10\%$, flag for Senior Arbitrator (E3).
* **⭐ Differentiator (Disagreement Classifier)**: Classify the root cause into `partial_credit`, `conceptual`, `ecf`, or `mixed` with a rubric difference heatmap highlighting disputed criteria.

#### Feature C3: Reliability & Examiner Bias Calibration (`POST /api/grading/reliability`)
* **Task**: Compute Cohen's Kappa ($\kappa$), Mean Absolute Difference (MAD), and Bias between AI vs. Human and E1 vs. E2.
* **⭐ Differentiator (Examiner Bias Calibration)**: Track individual examiner leniency/harshness offsets over time in `examiner_bias_profiles` and provide an **"Apply calibration"** toggle to preview normalized scoring.

---

### 🔄 Wave 2 — Final Integration & Self-Correcting Feedback Loop

#### Feature M1: Journey Stitching & Stage Hand-offs
* Update Dashboard to reflect dynamic lifecycle progress: Course Design $\rightarrow$ Question Authoring $\rightarrow$ Grading.
* Add handoff CTAs:
  * Blueprint generated $\rightarrow$ *"Generate Questions with this Blueprint"*
  * Rubric published $\rightarrow$ *"Grade Submissions with this Rubric"*

#### Feature M2: Self-Correcting CO Feedback Loop (`POST /api/design/co-feedback`)
* Join `grades` $\rightarrow$ `questions` $\rightarrow$ `course_outcomes`.
* Compute average student performance per CO across graded scripts.
* Logic:
  * Low score + rushed/skipped in drift data $\rightarrow$ `flag='review_teaching'` (under-taught topic).
  * Low score + questions weakly aligned $\rightarrow$ `flag='review_mapping'` (mis-mapped outcome).
  * Otherwise $\rightarrow$ `flag='ok'`.
* Display live performance badges on Track A Outcomes tab.

---

## 4. UI/UX Design System Rules (Precision-Glass Minimalism)

1. **Hierarchy & Tone**: Modern minimal engineering register (Linear, Raycast, Vercel). High-contrast data surfaces with ambient glass accents.
2. **Glassmorphism Discipline**:
   * **Allowed on**: Sticky headers, dashboard hero, floating action toolbars, modal drawers, and floating script review tags.
   * **Forbidden on**: Complex tables, matrix cells, and split-view grading canvases (maintain 100% solid contrast for legibility).
3. **Color Palette**:
   * Base: Neutral Zinc/Slate (`slate-950` dark / `slate-50` light).
   * Accent: Electric Indigo (`hsl(var(--primary))`).
   * Semantic Status: Emerald (Clear/Pass), Amber (Review/Drift/ECF), Rose (Rejected/Discrepancy).
4. **Typography**: Inter / Geist sans. Always use `tabular-nums` on scores, percentages, and marks.
5. **AI Assistive Badges**: Every AI output must display a confidence badge (e.g., `[✨ AI Generated · 94% Confidence]`).

---

## 5. Shared AI Client Usage Examples

```typescript
import { generateText, generateJSON, embed, embedBatch, gradeImage } from "@/lib/ai";
import { z } from "zod";

// 1. Structured JSON with Zod Schema Validation
const OutcomesSchema = z.object({
  outcomes: z.array(
    z.object({
      code: z.string(),
      statement: z.string(),
      bloom_level: z.number().min(1).max(6),
      action_verbs: z.array(z.string()),
    })
  ),
});
const result = await generateJSON("Extract COs from syllabus...", OutcomesSchema);

// 2. Generating 768-dim Vector Embeddings
const vector = await embed("Solve single-source shortest path using Dijkstra");

// 3. Multimodal Vision Grading (Claude 3.5 / GPT-4o)
const GradeSchema = z.object({
  total_score: z.number(),
  confidence: z.number(),
  per_criterion: z.array(z.object({ label: z.string(), awarded: z.number(), reason: z.string() })),
  region_confidences: z.array(z.object({ region_label: z.string(), confidence: z.number(), note: z.string() })),
});
const evaluation = await gradeImage({
  imageUrl: "https://.../script.jpg",
  prompt: "Grade this student handwritten answer against rubric...",
  schema: GradeSchema,
});
```

---

## 6. Git Workflow & Verification Checklist

1. **Branching**:
   * Track A: `feat/track-a`
   * Track B: `feat/track-b`
   * Track C: `feat/track-c`
   * Wave 2 Merge: `chore/integration`
2. **Pre-Push Build Verification**:
   * Always verify that `npx next build` passes with zero errors before pushing or merging.
3. **Commit Messages**:
   * `feat(track-a): syllabus-to-OBE course outcomes engine`
   * `feat(track-b): triple-layer dedup (cosine + jaccard + skill-signature)`
   * `feat(track-c): multimodal AI grading with per-region confidence HITL`
