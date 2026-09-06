# FacultyOS Demo Script

## Demo Setup

1. Sign in with the seeded junior faculty account.
2. Open `/api/health/ai` and confirm the configured provider status.
3. Use the seeded CS301 course where available. The UI falls back to seeded academic artifacts if a live provider or database row is unavailable.

## 1. Design The Course

**Problem:** Course design is often copied from prose syllabi and disconnected from what was actually taught.

**Input:** Open Course Design, select CS301, paste the sample syllabus, and generate outcomes.

**What the AI does:** It produces measurable Course Outcomes with Revised Bloom levels and constrained action verbs. Open the CO-PO Matrix to show sparse 1-3 correlations. In Blueprint, seed the lecture corpus and generate the drift-aware blueprint.

**Useful result:** Point out the planned-versus-actual weights and the under-taught topic that is automatically down-weighted. Click **Generate Questions with this Blueprint** to demonstrate the live handoff.

## 2. Author The Exam

**Problem:** Faculty must balance marks and cognitive demand while avoiding repeated questions from previous years.

**Input:** Keep the handed-off course and blueprint, set total marks to 50 and the lower/higher-order ratio to 40/60, then generate.

**What the AI does:** It allocates questions against blueprint weights, maps them to COs, and generates normalized skill signatures. Run Deduplication and expand the Bayes example.

**Useful result:** Show semantic, lexical, and skill scores separately. Emphasize **Same skill, different disguise** when surface wording differs. Open Rubrics, verify the criteria sum, and publish the ECF-aware rubric. Click **Grade in Track C**.

## 3. Grade Fairly

**Problem:** Handwritten grading is tiring, opaque, and inconsistent between examiners.

**Input:** Upload a handwritten answer image against the published rubric.

**What the AI does:** The VLM grades the image directly, awards criterion-level partial credit, applies ECF, and returns confidence for each answer region.

**Useful result:** Show the total and the exact low-confidence regions requiring review. In Double-Blind, submit different E1 and E2 scores. Show the delta, disagreement type, and rubric heatmap, then resolve as E3. In Reliability, compute Kappa, MAD, bias, and examiner calibration.

## 4. Close The Loop

Return to Course Design and open Outcomes. Each CO now shows attainment, sample count, and one of:

- `ok`
- `review teaching`
- `review mapping`

Open the evidence link for a flagged outcome. Explain that grading evidence now validates the original OBE design, creating a Design -> Author -> Grade -> Redesign loop.

## Judge Close

Faculty remains the final authority at every step. Each stage visibly presents the problem, faculty input, AI action, and a persisted result that becomes the next stage's contract.
