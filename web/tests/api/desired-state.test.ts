import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { kvMock, setSession } from "../setup";
import { GET } from "@/app/api/get-desired-state/route";
import { POST } from "@/app/api/set-desired-state/route";
import { userKeys, tokenLookupKey } from "@/lib/kv-user";

const EMAIL = "user@example.com";
const AGENT_TOKEN = "agent-tok";
const keys = userKeys(EMAIL);

function agentReq(body?: unknown) {
  return new NextRequest("http://localhost/api/desired-state", {
    method: "GET",
    headers: { authorization: `Bearer ${AGENT_TOKEN}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/get-desired-state (agent only)", () => {
  beforeEach(() => {
    kvMock._store.set(tokenLookupKey(AGENT_TOKEN), EMAIL);
  });

  it("returns 401 with no token", async () => {
    const req = new NextRequest("http://localhost/api/get-desired-state");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns null when nothing stored", async () => {
    const res = await GET(agentReq());
    const body = await res.json();
    expect(body.state).toBeNull();
    expect(body.rev).toBeNull();
  });

  it("returns stored desired state and rev", async () => {
    const state = { switches: [{ id: "lights", on: true }] };
    kvMock._store.set(keys.desiredState, state);
    kvMock._store.set(keys.desiredStateRev, 54321);

    const res = await GET(agentReq());
    const body = await res.json();
    expect(body.state).toEqual(state);
    expect(body.rev).toBe(54321);
  });
});

describe("POST /api/set-desired-state (browser or agent)", () => {
  it("returns 401 with no auth", async () => {
    const req = new NextRequest("http://localhost/api/set-desired-state", {
      method: "POST",
      body: JSON.stringify({ switches: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("stores desired state via session auth", async () => {
    setSession(EMAIL);
    const state = { switches: [{ id: "fan", on: false }] };
    const req = new NextRequest("http://localhost/api/set-desired-state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    const before = Date.now();
    const res = await POST(req);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.rev).toBeGreaterThanOrEqual(before);
    expect(kvMock._store.get(keys.desiredState)).toEqual(state);
    expect(kvMock._store.get(keys.desiredStateRev)).toBe(body.rev);
  });

  it("stores desired state via Bearer token", async () => {
    kvMock._store.set(tokenLookupKey(AGENT_TOKEN), EMAIL);
    const state = { switches: [] };
    const req = new NextRequest("http://localhost/api/set-desired-state", {
      method: "POST",
      headers: {
        authorization: `Bearer ${AGENT_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(state),
    });
    const res = await POST(req);
    expect((await res.json()).ok).toBe(true);
  });

  it("returns 400 on invalid JSON", async () => {
    setSession(EMAIL);
    const req = new NextRequest("http://localhost/api/set-desired-state", {
      method: "POST",
      body: "bad-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
