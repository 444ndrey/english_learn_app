import { eq } from "drizzle-orm";
import { generateWordDetails } from "@/lib/ai";
import { db } from "@/lib/db";
import { words } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const pending = db.select().from(words).where(eq(words.definition, "")).all();

  if (pending.length === 0) {
    return Response.json({ updated: 0, aiError: null });
  }

  let aiError = null;
  let updated = 0;

  try {
    const details = await generateWordDetails(pending.map((word) => word.word));

    for (const detail of details) {
      const record = pending.find(
        (word) => word.word.toLowerCase() === detail.word.toLowerCase(),
      );
      if (!record) continue;

      db.update(words)
        .set({
          definition: detail.definition,
          type: detail.type,
          example: detail.example,
          forms: JSON.stringify(detail.forms),
        })
        .where(eq(words.id, record.id))
        .run();
      updated += 1;
    }
  } catch (err) {
    aiError = err.message;
  }

  return Response.json({ updated, aiError });
}
