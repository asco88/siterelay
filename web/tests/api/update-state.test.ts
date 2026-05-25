import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { kvMock } from "../setup";
import { POST } from "@/app/api/update-state/route";
import { userKeys, tokenLookupKey } from "@/lib/kv-user";

const EMAIL = "agent@example.com";
const TOKEN = "agent-secret-token";
const keys = userKeys(EMAIL);

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/update-state", {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/update-state", () => {
  beforeEach(() => {
    kvMock._store.set(tokenLookupKey(TOKEN), EMAIL);
  });

  it("returns 401 with no token", async () => {
    const req = new NextRequest("http://localhost/api/update-state", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("stores state and timestamps on a full update", async () => {
    const state = { sensors: [{ id: "cpu", value: 42 }] };
    const before = Date.now();
    const res = await POST(makeReq(state));
    const after = Date.now();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.type).toBe("state_update");
    expect(kvMock._store.get(keys.stateData)).toEqual(state);

    const updatedAt = kvMock._store.get(keys.stateUpdatedAt) as number;
    const lastSeen = kvMock._store.get(keys.serverLastSeen) as number;
    expect(updatedAt).toBeGreaterThanOrEqual(before);
    expect(updatedAt).toBeLessThanOrEqual(after);
    expect(lastSeen).toBeGreaterThanOrEqual(before);
  });

  it("handles heartbeat: only updates serverLastSeen", async () => {
    const existingState = { sensors: [] };
    kvMock._store.set(keys.stateData, existingState);

    const res = await POST(makeReq({ type: "heartbeat" }));
    const body = await res.json();

    expect(body.type).toBe("heartbeat");
    expect(kvMock._store.get(keys.stateData)).toEqual(existingState); // unchanged
    expect(kvMock._store.has(keys.serverLastSeen)).toBe(true);
    expect(kvMock._store.has(keys.stateUpdatedAt)).toBe(false); // not set
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/update-state", {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}` },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
