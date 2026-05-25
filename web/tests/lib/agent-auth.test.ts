import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { kvMock } from "../setup";
import { resolveAgentEmail } from "@/lib/agent-auth";
import { tokenLookupKey } from "@/lib/kv-user";

function makeReq(token?: string) {
  const headers: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : {};
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("resolveAgentEmail", () => {
  it("returns email for a valid token", async () => {
    kvMock._store.set(tokenLookupKey("valid-token"), "agent@example.com");
    const result = await resolveAgentEmail(makeReq("valid-token"));
    expect(result).toEqual({ email: "agent@example.com" });
  });

  it("returns 401 when no Authorization header", async () => {
    const result = await resolveAgentEmail(makeReq());
    expect((result as Response).status).toBe(401);
  });

  it("returns 401 for an unknown token", async () => {
    const result = await resolveAgentEmail(makeReq("bad-token"));
    expect((result as Response).status).toBe(401);
  });

  it("returns 401 for malformed Authorization (no Bearer prefix)", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { authorization: "Token abc123" },
    });
    const result = await resolveAgentEmail(req);
    expect((result as Response).status).toBe(401);
  });
});
