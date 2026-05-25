import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { kvMock, setSession } from "../setup";
import { resolveEmail } from "@/lib/auth-any";
import { tokenLookupKey } from "@/lib/kv-user";

function makeReq(token?: string) {
  const headers: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : {};
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("resolveEmail", () => {
  it("resolves email from valid Bearer token", async () => {
    kvMock._store.set(tokenLookupKey("agent-tok"), "agent@example.com");
    const result = await resolveEmail(makeReq("agent-tok"));
    expect(result).toBe("agent@example.com");
  });

  it("Bearer token takes precedence over session", async () => {
    setSession("browser@example.com");
    kvMock._store.set(tokenLookupKey("agent-tok"), "agent@example.com");
    const result = await resolveEmail(makeReq("agent-tok"));
    expect(result).toBe("agent@example.com");
  });

  it("falls back to session when no Bearer token", async () => {
    setSession("browser@example.com");
    const result = await resolveEmail(makeReq());
    expect(result).toBe("browser@example.com");
  });

  it("returns 401 when Bearer token is unknown and no session", async () => {
    const result = await resolveEmail(makeReq("unknown-token"));
    expect((result as Response).status).toBe(401);
  });

  it("returns 401 when no token and no session", async () => {
    const result = await resolveEmail(makeReq());
    expect((result as Response).status).toBe(401);
  });
});
