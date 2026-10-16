import {
  DIFFICULTIES,
  getDifficulty,
  setDifficulty,
  suggestedDifficulty,
} from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    difficulty: getDifficulty(),
    suggested: suggestedDifficulty(),
    options: DIFFICULTIES,
  });
}

export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const difficulty = String(body?.difficulty ?? "");
  if (!DIFFICULTIES.includes(difficulty)) {
    return Response.json({ error: "unsupported difficulty" }, { status: 400 });
  }

  setDifficulty(difficulty);
  return Response.json({ difficulty });
}
