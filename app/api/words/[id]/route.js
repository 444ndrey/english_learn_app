import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { words } from "@/lib/schema";
import { applyResult } from "@/lib/vocabulary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const wordId = Number(id);

  const existing = db.select().from(words).where(eq(words.id, wordId)).get();
  if (!existing) {
    return Response.json({ error: "word not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body.correct !== "boolean") {
    return Response.json(
      { error: "correct (boolean) is required" },
      { status: 400 },
    );
  }

  const level = applyResult(existing.level, body.correct);
  const updated = db
    .update(words)
    .set({ level, lastCheckedAt: new Date().toISOString() })
    .where(eq(words.id, wordId))
    .returning()
    .get();

  return Response.json({ word: updated });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const result = db.delete(words).where(eq(words.id, Number(id))).run();

  if (result.changes === 0) {
    return Response.json({ error: "word not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
