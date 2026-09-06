import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText, embedBatch, extractDocumentText } from "@/lib/ai";
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
    const contentType = req.headers.get("content-type") || "";
    let course_id = "";
    let type: "syllabus" | "slides" | "past_paper" = "slides";
    let content = "";
    let planned_at: string | null = null;
    let taught_at: string | null = null;
    let storagePath: string | null = null;

    const supabase = await getSupabase();

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      course_id = (formData.get("course_id") as string) || "";
      type = (formData.get("type") as any) || "slides";
      content = (formData.get("content") as string) || "";
      planned_at = (formData.get("planned_at") as string) || null;
      taught_at = (formData.get("taught_at") as string) || null;

      if (!course_id) {
        return NextResponse.json({ error: "course_id is required" }, { status: 400 });
      }

      // If a file was uploaded
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `${course_id}/${Date.now()}_${file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        )}`;

        // Upload to Supabase Storage 'documents' bucket
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("documents")
            .upload(fileName, buffer, {
              contentType: file.type || "application/octet-stream",
              upsert: true,
            });

          if (!uploadError && uploadData?.path) {
            storagePath = uploadData.path;
          }
        } catch (storageErr) {
          console.warn("[Storage upload warning in ingest]:", storageErr);
        }

        // If content was not already provided from UI extraction preview, extract with Gemini
        if (!content || content.trim().length < 5) {
          content = await extractDocumentText({
            buffer,
            mimeType: file.type,
            fileName: file.name,
            prompt:
              type === "past_paper"
                ? "Extract and transcribe all exam questions, problem statements, marks, formulas, and sub-questions from this exam paper accurately as clean structured text."
                : "Extract and transcribe all lecture slides, definitions, bullet points, algorithms, formulas, and topic explanations accurately as clean structured text.",
          });
        }
      }
    } else {
      const body = await req.json();
      const parsed = IngestDocumentSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.format() },
          { status: 400 }
        );
      }

      course_id = parsed.data.course_id;
      type = parsed.data.type;
      content = parsed.data.content;
      planned_at = parsed.data.planned_at || null;
      taught_at = parsed.data.taught_at || null;
      storagePath = parsed.data.storage_path || null;
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract or read document text content" },
        { status: 400 }
      );
    }

    // 1. Insert Document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        course_id,
        type,
        storage_path: storagePath,
        extracted_text: content.trim(),
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
    const chunks = chunkText(content.trim(), 350, 60);

    // 3. Generate 768-dimensional embeddings
    let vectors: number[][] = [];
    try {
      vectors = await embedBatch(chunks);
    } catch (embedErr) {
      console.warn("[Embedding generation warning, fallback to null vector]:", embedErr);
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
