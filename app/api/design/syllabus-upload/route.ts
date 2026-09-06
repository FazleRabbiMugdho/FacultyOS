import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractDocumentText } from "@/lib/ai";

async function getSupabase() {
  try {
    return createClient();
  } catch {
    return createAdminClient();
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const courseId = formData.get("course_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${courseId || "general"}/${Date.now()}_${file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )}`;

    const supabase = await getSupabase();

    // 1. Upload to Supabase Storage 'documents' bucket
    let storagePath: string | null = null;
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
      console.warn("[Storage upload warning]:", storageErr);
    }

    // 2. Multimodal extraction from file (PDF, Image, Slides, Notes)
    const extractedText = await extractDocumentText({
      buffer,
      mimeType: file.type,
      fileName: file.name,
      prompt:
        "Extract and transcribe the complete textual content of this course syllabus/curriculum/slide document. Preserve headings, topic outlines, prerequisites, formulas, and learning objectives as clean structured text.",
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      storagePath,
      extractedText: extractedText.trim(),
    });
  } catch (err: any) {
    console.error("[POST /api/design/syllabus-upload error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process syllabus upload" },
      { status: 500 }
    );
  }
}
