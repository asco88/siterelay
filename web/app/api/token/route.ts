import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { userKeys, tokenLookupKey, USERS_SET_KEY } from "@/lib/kv-user";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await kv.get<string>(userKeys(session.user.email).userToken);
  return NextResponse.json({ token: token ?? null });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email;
  const keys  = userKeys(email);

  const oldToken = await kv.get<string>(keys.userToken);
  if (oldToken) await kv.del(tokenLookupKey(oldToken));

  const token = randomBytes(32).toString("hex");
  const isFirstToken = !oldToken;
  await Promise.all([
    kv.set(tokenLookupKey(token), email),
    kv.set(keys.userToken, token),
    kv.sadd(USERS_SET_KEY, email),
    ...(isFirstToken ? [kv.set(keys.joinedAt, Date.now())] : []),
  ]);

  return NextResponse.json({ token });
}
