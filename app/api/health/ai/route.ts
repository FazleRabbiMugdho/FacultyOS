import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai/gemini";
import { embed } from "@/lib/ai/embeddings";

export async function GET() {
  return handleHealthCheck();
}

export async function POST() {
  return handleHealthCheck();
}

async function handleHealthCheck() {
  const status: {
    status: "ok" | "degraded" | "error";
    timestamp: string;
    providers: {
      gemini_text: { status: "ok" | "failed" | "unconfigured"; latency_ms?: number; error?: string };
      gemini_embeddings: { status: "ok" | "failed" | "unconfigured"; latency_ms?: number; error?: string };
      openrouter_vision: { status: "ok" | "unconfigured"; note?: string };
    };
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    providers: {
      gemini_text: { status: "unconfigured" },
      gemini_embeddings: { status: "unconfigured" },
      openrouter_vision: { status: "unconfigured" },
    },
  };

  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  // 1. Test Gemini Text
  if (geminiKey && geminiKey !== "mock-gemini-key") {
    const start = Date.now();
    try {
      await generateText("ping: respond with pong");
      status.providers.gemini_text = {
        status: "ok",
        latency_ms: Date.now() - start,
      };
    } catch (err: any) {
      status.providers.gemini_text = {
        status: "failed",
        latency_ms: Date.now() - start,
        error: err?.message || "Unknown error",
      };
      status.status = "degraded";
    }
  } else {
    status.providers.gemini_text = {
      status: "unconfigured",
      note: "Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local",
    } as any;
  }

  // 2. Test Gemini Embeddings (768-dim)
  if (geminiKey && geminiKey !== "mock-gemini-key") {
    const start = Date.now();
    try {
      const vec = await embed("sample text for healthcheck");
      status.providers.gemini_embeddings = {
        status: "ok",
        latency_ms: Date.now() - start,
      };
    } catch (err: any) {
      status.providers.gemini_embeddings = {
        status: "failed",
        latency_ms: Date.now() - start,
        error: err?.message || "Unknown error",
      };
      status.status = "degraded";
    }
  } else {
    status.providers.gemini_embeddings = {
      status: "unconfigured",
      note: "Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local",
    } as any;
  }

  // 3. Check OpenRouter Key
  if (openRouterKey && openRouterKey !== "mock-openrouter-key") {
    status.providers.openrouter_vision = {
      status: "ok",
      note: "Key configured (Claude 3.5 Sonnet / GPT-4o ready)",
    };
  } else {
    status.providers.openrouter_vision = {
      status: "unconfigured",
      note: "Fallback to Gemini Pro vision active",
    };
  }

  return NextResponse.json(status);
}
