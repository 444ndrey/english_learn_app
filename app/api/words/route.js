import { count, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { words } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 30;

export async function GET() {
  const rows = db
    .select()
    .from(words)
    .orderBy(desc(words.createdAt), desc(words.id))
    .limit(RECENT_LIMIT)
    .all();

  const { total } = db.select({ total: count() }).from(words).get();

  return Response.json({ words: rows, total, limit: RECENT_LIMIT });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const word = String(body.word ?? "").trim();
  const translation = String(body.translation ?? "").trim();

  if (!word) {
    return Response.json({ error: "word is required" }, { status: 400 });
  }

  try {
    const created = db
      .insert(words)
      .values({ word, translation })
      .returning()
      .get();
    return Response.json({ word: created }, { status: 201 });
  } catch (err) {
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return Response.json(
        { error: `"${word}" is already in the list` },
        { status: 409 },
      );
    }
    throw err;
  }
}
