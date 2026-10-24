import { getSettingsPayload, saveSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getSettingsPayload());
}

export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  try {
    return Response.json(saveSettings(body));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
