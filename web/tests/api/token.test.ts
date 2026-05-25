import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { kvMock, setSession } from "../setup";
import { GET, POST } from "@/app/api/token/route";
import { userKeys, tokenLookupKey } from "@/lib/kv-user";

const EMAIL = "user@example.com";
const keys = userKeys(EMAIL);

describe("GET /api/token", () => {
  it("returns 401 when not logged in", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns null when user has no token yet", async () => {
    setSession(EMAIL);
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.token).toBeNull();
  });

  it("returns existing token", async () => {
    setSession(EMAIL);
    kvMock._store.set(keys.userToken, "existing-token");
    const res = await GET();
    const body = await res.json();
    expect(body.token).toBe("existing-token");
  });
});

describe("POST /api/token", () => {
  it("returns 401 when not logged in", async () => {
    const req = new NextRequest("http://localhost/api/token", { method: "POST" });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("generates a new token and stores both KV entries", async () => {
    setSession(EMAIL);
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.token).toBe("string");
    expect(body.token).toHaveLength(64); // 32 bytes hex

    // Both KV entries must exist
    expect(kvMock._store.get(keys.userToken)).toBe(body.token);
    expect(kvMock._store.get(tokenLookupKey(body.token))).toBe(EMAIL);
  });

  it("invalidates the old token when regenerating", async () => {
    setSession(EMAIL);
    kvMock._store.set(keys.userToken, "old-token");
    kvMock._store.set(tokenLookupKey("old-token"), EMAIL);

    const res = await POST();
    const { token: newToken } = await res.json();

    // Old lookup key is gone
    expect(kvMock._store.has(tokenLookupKey("old-token"))).toBe(false);
    // New lookup key exists
    expect(kvMock._store.get(tokenLookupKey(newToken))).toBe(EMAIL);
  });

  it("generates unique tokens on successive calls", async () => {
    setSession(EMAIL);
    const res1 = await POST();
    const res2 = await POST();
    const { token: t1 } = await res1.json();
    const { token: t2 } = await res2.json();
    expect(t1).not.toBe(t2);
  });
});
