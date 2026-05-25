import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { kvMock, setSession } from "../setup";
import { GET } from "@/app/api/get-style/route";
import { POST as setStyle } from "@/app/api/set-style/route";
import { POST as updateStyle } from "@/app/api/update-style/route";
import { userKeys, tokenLookupKey } from "@/lib/kv-user";

const EMAIL = "user@example.com";
const AGENT_TOKEN = "agent-tok";
const keys = userKeys(EMAIL);

function agentReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/style", {
    method,
    headers: {
      authorization: `Bearer ${AGENT_TOKEN}`,
      "content-type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function browserReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/style", {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/get-style (browser)", () => {
  it("returns 401 when not logged in", async () => {
    const req = new NextRequest("http://localhost/api/get-style");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns null style when nothing stored", async () => {
    setSession(EMAIL);
    const req = new NextRequest("http://localhost/api/get-style");
    const res = await GET(req);
    const body = await res.json();
    expect(body.style).toBeNull();
    expect(body.updatedAt).toBeNull();
  });

  it("returns stored style", async () => {
    setSession(EMAIL);
    const style = { theme: "dark", accent: "#3b82f6" };
    kvMock._store.set(keys.styleData, style);
    kvMock._store.set(keys.styleUpdatedAt, 12345);

    const req = new NextRequest("http://localhost/api/get-style");
    const res = await GET(req);
    const body = await res.json();
    expect(body.style).toEqual(style);
    expect(body.updatedAt).toBe(12345);
  });
});

describe("GET /api/get-style (agent — desired)", () => {
  beforeEach(() => {
    kvMock._store.set(tokenLookupKey(AGENT_TOKEN), EMAIL);
  });

  it("returns 401 with no token", async () => {
    const req = new NextRequest("http://localhost/api/get-style?desired=1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns desired style and rev for agent", async () => {
    const style = { theme: "light" };
    kvMock._store.set(keys.desiredStyle, style);
    kvMock._store.set(keys.desiredStyleRev, 99999);

    const req = new NextRequest("http://localhost/api/get-style?desired=1", {
      headers: { authorization: `Bearer ${AGENT_TOKEN}` },
    });
    const res = await GET(req);
    const body = await res.json();
    expect(body.style).toEqual(style);
    expect(body.rev).toBe(99999);
  });
});

describe("style round-trip (regression: changes must survive a page refresh)", () => {
  it("style saved by browser is immediately readable back via get-style", async () => {
    setSession(EMAIL);
    const style = { theme: "light", accent: "#10b981", sectionOrder: ["radio", "sensors"] };

    // Browser saves layout change
    await setStyle(browserReq("POST", style));

    // Browser refreshes — reads style back
    const getReq = new NextRequest("http://localhost/api/get-style");
    const res = await GET(getReq);
    const body = await res.json();

    // Must match what was saved — this was the bug: it returned null instead
    expect(body.style).toMatchObject({ theme: "light", accent: "#10b981" });
    expect((body.style as { sectionOrder: string[] }).sectionOrder).toEqual(["radio", "sensors"]);
  });

  it("set-style writes to both styleData and desiredStyle", async () => {
    setSession(EMAIL);
    const style = { theme: "dark" };
    await setStyle(browserReq("POST", style));

    // Agent can still pick up the desired style
    expect(kvMock._store.get(keys.desiredStyle)).toMatchObject(style);
    // Browser can read it back directly
    expect(kvMock._store.get(keys.styleData)).toMatchObject(style);
  });
});

describe("POST /api/set-style", () => {
  it("returns 401 when not logged in", async () => {
    const res = await setStyle(browserReq("POST", { theme: "dark" }));
    expect(res.status).toBe(401);
  });

  it("stores desired style and returns rev", async () => {
    setSession(EMAIL);
    const style = { theme: "dark", accent: "#ff0000" };
    const before = Date.now();
    const res = await setStyle(browserReq("POST", style));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.rev).toBeGreaterThanOrEqual(before);
    expect(kvMock._store.get(keys.desiredStyle)).toEqual(style);
    expect(kvMock._store.get(keys.desiredStyleRev)).toBe(body.rev);
  });

  it("returns 400 on invalid JSON", async () => {
    setSession(EMAIL);
    const req = new NextRequest("http://localhost/api/set-style", {
      method: "POST",
      body: "not-json",
    });
    const res = await setStyle(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/update-style (agent)", () => {
  beforeEach(() => {
    kvMock._store.set(tokenLookupKey(AGENT_TOKEN), EMAIL);
  });

  it("returns 401 with no token", async () => {
    const res = await updateStyle(browserReq("POST", {}));
    expect(res.status).toBe(401);
  });

  it("stores style data and updatedAt", async () => {
    const style = { theme: "dark" };
    const before = Date.now();
    const res = await updateStyle(agentReq("POST", style));
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(kvMock._store.get(keys.styleData)).toEqual(style);
    const updatedAt = kvMock._store.get(keys.styleUpdatedAt) as number;
    expect(updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/update-style", {
      method: "POST",
      headers: { authorization: `Bearer ${AGENT_TOKEN}` },
      body: "bad",
    });
    const res = await updateStyle(req);
    expect(res.status).toBe(400);
  });
});
