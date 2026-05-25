import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { userKeys } from "@/lib/kv-user";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keys = userKeys(session.user.email);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rev = Date.now();
  // Write to both desiredStyle (for agent) and styleData (so browser reads it back
  // immediately on refresh, even when the agent is offline)
  await kv.mset({
    [keys.desiredStyle]:    body,
    [keys.desiredStyleRev]: rev,
    [keys.styleData]:       body,
    [keys.styleUpdatedAt]:  rev,
  });
  return NextResponse.json({ ok: true, rev });
}
