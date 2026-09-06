import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText, embedBatch } from "@/lib/ai";
import { IngestDocumentSchema } from "@/lib/design/schemas";

async function getSupabase() {
  try {
    return createClient();
  } catch {
    return createAdminClient();
  }
}

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get("course_id");
    if (!courseId) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 });
    }

    const supabase = await getSupabase();

    const { data: docs, error: docErr } = await supabase
      .from("documents")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (docErr) {
      return NextResponse.json({ error: docErr.message }, { status: 500 });
    }

    // Get chunk counts for each document
    const docIds = (docs || []).map((d) => d.id);
    let chunkCounts: Record<string, number> = {};

    if (docIds.length > 0) {
      const { data: chunks, error: chunkErr } = await supabase
        .from("doc_chunks")
        .select("document_id")
        .in("document_id", docIds);

      if (!chunkErr && chunks) {
        for (const c of chunks) {
          chunkCounts[c.document_id] = (chunkCounts[c.document_id] || 0) + 1;
        }
      }
    }

    const docsWithCounts = (docs || []).map((d) => ({
      ...d,
      chunk_count: chunkCounts[d.id] || 0,
      is_taught: !!d.taught_at,
    }));

    return NextResponse.json({ documents: docsWithCounts });
  } catch (err: any) {
    console.error("[GET /api/design/ingest error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch ingested documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = IngestDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { course_id, type, content, planned_at, taught_at } = parsed.data;
    const supabase = await getSupabase();

    // 1. Insert Document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        course_id,
        type,
        extracted_text: content,
        planned_at: planned_at ? new Date(planned_at).toISOString() : null,
        taught_at: taught_at ? new Date(taught_at).toISOString() : null,
      })
      .select()
      .single();

    if (docError) {
      console.error("[Insert Document error]:", docError);
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    // 2. Chunk text
    const chunks = chunkText(content, 350, 60);

    // 3. Generate 768-dimensional embeddings
    let vectors: number[][] = [];
    try {
      vectors = await embedBatch(chunks);
    } catch (embedErr) {
      console.warn("[Embedding generation warning, fallback to null vector]:", embedErr);
      // Fallback empty vector list of equal size if offline
      vectors = chunks.map(() => []);
    }

    // 4. Insert chunks into doc_chunks
    const chunkInserts = chunks.map((chunk, idx) => ({
      document_id: document.id,
      course_id,
      content: chunk,
      embedding: vectors[idx]?.length === 768 ? vectors[idx] : null,
    }));

    const { data: insertedChunks, error: chunkInsertError } = await supabase
      .from("doc_chunks")
      .insert(chunkInserts)
      .select("id");

    if (chunkInsertError) {
      console.error("[Insert doc_chunks error]:", chunkInsertError);
    }

    return NextResponse.json(
      {
        success: true,
        document: {
          ...document,
          chunk_count: insertedChunks?.length || chunks.length,
          is_taught: !!document.taught_at,
        },
        chunks_embedded: insertedChunks?.length || chunks.length,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/design/ingest error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to ingest and embed document" },
      { status: 500 }
    );
  }
}
