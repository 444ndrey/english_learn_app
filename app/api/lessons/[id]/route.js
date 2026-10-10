import { getLesson, parseLesson } from "@/lib/lessons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const lesson = parseLesson(getLesson(id));

  if (!lesson) {
    return Response.json({ error: "lesson not found" }, { status: 404 });
  }

  return Response.json({ lesson });
}
