import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { words } from "@/lib/schema";
import { applyAttempt } from "@/lib/vocabulary";

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

  // Mode 1: record a practice result (spaced-repetition level change).
  if (typeof body?.correct === "boolean") {
    const updated = db
      .update(words)
      .set(applyAttempt(existing, body.correct))
      .where(eq(words.id, wordId))
      .returning()
      .get();

    return Response.json({ word: updated });
  }

  // Mode 2: edit the word's stored details.
  const updates = {};
  if (typeof body?.word === "string" && body.word.trim()) {
    updates.word = body.word.trim();
  }
  for (const field of ["translation", "definition", "example", "type"]) {
    if (typeof body?.[field] === "string") {
      updates[field] = body[field].trim();
    }
  }
  if (body?.forms !== undefined) {
    const list = Array.isArray(body.forms)
      ? body.forms
      : typeof body.forms === "string"
        ? body.forms.split(",")
        : [];
    updates.forms = JSON.stringify(
      list.map((form) => String(form ?? "").trim()).filter(Boolean),
    );
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "no fields to update" }, { status: 400 });
  }

  try {
    const updated = db
      .update(words)
      .set(updates)
      .where(eq(words.id, wordId))
      .returning()
      .get();

    return Response.json({ word: updated });
  } catch (err) {
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return Response.json(
        { error: `"${updates.word ?? existing.word}" is already in the list` },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const result = db.delete(words).where(eq(words.id, Number(id))).run();

  if (result.changes === 0) {
    return Response.json({ error: "word not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
