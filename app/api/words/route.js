import { asc, count, desc, eq, like, or } from "drizzle-orm";
import { generateWordDetails } from "@/lib/ai";
import { db } from "@/lib/db";
import { words } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 200;

const SORT_COLUMNS = {
  word: words.word,
  level: words.level,
  createdAt: words.createdAt,
  lastCheckedAt: words.lastCheckedAt,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const q = String(searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE),
  );
  const sort = SORT_COLUMNS[searchParams.get("sort")] ? searchParams.get("sort") : "createdAt";
  const direction = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const column = SORT_COLUMNS[sort];
  const orderBy = direction === "asc" ? asc(column) : desc(column);

  const filter = q
    ? or(
        like(words.word, `%${q}%`),
        like(words.translation, `%${q}%`),
        like(words.definition, `%${q}%`),
      )
    : undefined;

  const rows = db
    .select()
    .from(words)
    .where(filter)
    .orderBy(orderBy, desc(words.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  const { total } = db
    .select({ total: count() })
    .from(words)
    .where(filter)
    .get();

  return Response.json({
    words: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    q,
    sort,
    dir: direction,
  });
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

    let aiError = null;
    let row = created;
    try {
      const [details] = await generateWordDetails([word]);
      row = db
        .update(words)
        .set({
          definition: details?.definition ?? "",
          type: details?.type ?? "",
          example: details?.example ?? "",
          forms: JSON.stringify(details?.forms ?? []),
        })
        .where(eq(words.id, created.id))
        .returning()
        .get();
    } catch (err) {
      aiError = err.message;
    }

    return Response.json({ word: row, aiError }, { status: 201 });
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
