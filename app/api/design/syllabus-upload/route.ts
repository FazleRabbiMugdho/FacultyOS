import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    // 2. Extract text from file
    let extractedText = "";

    if (
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md")
    ) {
      extractedText = buffer.toString("utf-8");
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // Use Gemini to extract full syllabus text from PDF buffer
      const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (geminiKey && geminiKey !== "mock-gemini-key") {
        try {
          const ai = new GoogleGenerativeAI(geminiKey);
          const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
          const base64Data = buffer.toString("base64");

          const result = await model.generateContent([
            {
              inlineData: {
                data: base64Data,
                mimeType: "application/pdf",
              },
            },
            {
              text: "Extract and transcribe the complete textual content of this course syllabus document. Preserve headings, topic outlines, prerequisites, and learning objectives as clean structured text.",
            },
          ]);

          extractedText = result.response.text();
        } catch (aiErr: any) {
          console.warn("[Gemini PDF extraction warning]:", aiErr?.message);
          // Fallback: extract printable characters
          extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
        }
      } else {
        extractedText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
      }
    } else {
      extractedText = buffer.toString("utf-8");
    }

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
