import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText, embedBatch } from "@/lib/ai";

async function getSupabase() {
  try {
    return createClient();
  } catch {
    return createAdminClient();
  }
}

const DEMO_DOCUMENTS = [
  {
    type: "slides",
    title: "Lecture Notes & Slides: Module 1 & 2 (Divide & Conquer, DP on Trees, Network Flows)",
    planned_at: "2026-09-01T09:00:00Z",
    taught_at: "2026-09-02T10:30:00Z", // Delivered on schedule with extensive coverage
    content: `Module 1: Asymptotic Analysis, Recurrences & Amortization
- Master Theorem: Three master cases, Akra-Bazzi generalization for uneven splits.
- Amortized analysis: Accounting and Potential method proofs for dynamic arrays and splay trees.
- Recursion tree method: Evaluating T(n) = 2T(n/2) + O(n log n).

Module 2: Advanced Dynamic Programming & Network Flows
- Dynamic Programming on Trees: Independent set on trees, optimal binary search trees.
- Bitmask Dynamic Programming: Traveling Salesperson Problem in O(n^2 * 2^n) time complexity.
- Max-Flow Min-Cut Theorem: Ford-Fulkerson algorithm, Edmonds-Karp with BFS augmenting paths.
- Bipartite Matching: Hopcroft-Karp reduction from max flow, residual graph analysis.
- Min-Cut Applications: Image segmentation, project selection problem reductions.`,
  },
  {
    type: "slides",
    title: "Lecture Notes & Slides: Module 3 (Randomized Algorithms & Probabilistic Analysis)",
    planned_at: "2026-09-10T09:00:00Z",
    taught_at: "2026-09-11T11:00:00Z", // Delivered on schedule with standard coverage
    content: `Module 3: Randomized Algorithms & Data Structures
- Las Vegas vs Monte Carlo Paradigms: Expected polynomial runtime with deterministic correctness vs bounded error probability.
- Randomized Quicksort: Expected comparisons proof using indicator random variables.
- Skip Lists: Forward pointers, probabilistic balancing, O(log n) search/insert with high probability.
- Bloom Filters: Hash function independence, false positive probability calculation, bit array saturation.
- Chernoff Bounds and tail inequalities for randomized load balancing.`,
  },
  {
    type: "slides",
    title: "Lecture Outline: Module 4 (Intractability & Approximation Algorithms)",
    planned_at: "2026-09-18T09:00:00Z",
    taught_at: null, // SKIPPED / RUSHED TOPIC (not delivered in class due to semester schedule compression)
    content: `Module 4: Intractability & Approximation (Brief Overview)
- P vs NP basic definitions.
- Polynomial time verifiers.
- (Note: Proofs of NP-Completeness and metric TSP approximation algorithms were postponed due to semester holiday schedule).`,
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const courseId = body.course_id;

    if (!courseId) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 });
    }

    const supabase = await getSupabase();

    // Check if documents already exist for this course
    const { data: existingDocs } = await supabase
      .from("documents")
      .select("id")
      .eq("course_id", courseId)
      .neq("type", "syllabus");

    if (existingDocs && existingDocs.length >= 3) {
      return NextResponse.json({
        success: true,
        message: "Demo lecture documents already seeded for this course",
        count: existingDocs.length,
      });
    }

    let seededCount = 0;

    for (const doc of DEMO_DOCUMENTS) {
      // 1. Insert Document
      const { data: insertedDoc, error: docErr } = await supabase
        .from("documents")
        .insert({
          course_id: courseId,
          type: doc.type,
          extracted_text: doc.content,
          planned_at: doc.planned_at,
          taught_at: doc.taught_at,
        })
        .select()
        .single();

      if (docErr || !insertedDoc) {
        console.warn("[Error inserting demo document]:", docErr);
        continue;
      }

      // 2. Chunk & Embed
      const chunks = chunkText(doc.content, 300, 50);
      let vectors: number[][] = [];
      try {
        vectors = await embedBatch(chunks);
      } catch {
        vectors = chunks.map(() => []);
      }

      const chunkInserts = chunks.map((chunk, idx) => ({
        document_id: insertedDoc.id,
        course_id: courseId,
        content: chunk,
        embedding: vectors[idx]?.length === 768 ? vectors[idx] : null,
      }));

      await supabase.from("doc_chunks").insert(chunkInserts);
      seededCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${seededCount} demo lecture documents with pgvector embeddings`,
      count: seededCount,
    });
  } catch (err: any) {
    console.error("[POST /api/design/seed-demo-docs error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to seed demo lecture documents" },
      { status: 500 }
    );
  }
}
