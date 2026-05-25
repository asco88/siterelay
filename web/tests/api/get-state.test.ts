import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { kvMock, setSession } from "../setup";
import { GET } from "@/app/api/get-state/route";
import { userKeys, tokenLookupKey } from "@/lib/kv-user";

const EMAIL = "user@example.com";
const TOKEN = "browser-token";
const keys = userKeys(EMAIL);

function makeReq(token?: string) {
  const headers: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : {};
  return new NextRequest("http://localhost/api/get-state", { headers });
}

describe("GET /api/get-state", () => {
  it("returns 401 with no auth", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns null state when KV is empty", async () => {
    setSession(EMAIL);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.state).toBeNull();
    expect(body.serverOnline).toBe(false);
    expect(body.hasPending).toBe(false);
  });

  it("returns stored state via session auth", async () => {
    setSession(EMAIL);
    const state = { sensors: [{ id: "temp", value: 22 }] };
    kvMock._store.set(keys.stateData, state);
    kvMock._store.set(keys.stateUpdatedAt, Date.now());

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.state).toEqual(state);
  });

  it("returns stored state via Bearer token", async () => {
    kvMock._store.set(tokenLookupKey(TOKEN), EMAIL);
    const state = { sensors: [] };
    kvMock._store.set(keys.stateData, state);

    const res = await GET(makeReq(TOKEN));
    const body = await res.json();
    expect(body.state).toEqual(state);
  });

  it("reports serverOnline=true when lastSeen is recent", async () => {
    setSession(EMAIL);
    kvMock._store.set(keys.serverLastSeen, Date.now() - 10_000); // 10s ago

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.serverOnline).toBe(true);
  });

  it("reports serverOnline=false when lastSeen is stale (>60s)", async () => {
    setSession(EMAIL);
    kvMock._store.set(keys.serverLastSeen, Date.now() - 90_000); // 90s ago

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.serverOnline).toBe(false);
  });

  it("reports hasPending=true when desiredStateRev > stateUpdatedAt", async () => {
    setSession(EMAIL);
    const now = Date.now();
    kvMock._store.set(keys.stateUpdatedAt, now - 5000);
    kvMock._store.set(keys.desiredStateRev, now); // newer than stateUpdatedAt

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.hasPending).toBe(true);
  });

  it("reports hasPending=false when state is up to date", async () => {
    setSession(EMAIL);
    const now = Date.now();
    kvMock._store.set(keys.stateUpdatedAt, now);
    kvMock._store.set(keys.desiredStateRev, now - 5000); // older than stateUpdatedAt

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.hasPending).toBe(false);
  });
});
