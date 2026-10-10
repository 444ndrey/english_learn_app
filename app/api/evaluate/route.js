import { evaluateAnswers } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return Response.json({ results: [] });
  }

  const trimmed = items.map((item) => ({
    type: String(item.type ?? ""),
    prompt: String(item.prompt ?? ""),
    reference: String(item.reference ?? ""),
    answer: String(item.answer ?? ""),
  }));

  const results = await evaluateAnswers(trimmed);
  return Response.json({ results });
}
