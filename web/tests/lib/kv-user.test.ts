import { describe, it, expect } from "vitest";
import { userKeys, tokenLookupKey } from "@/lib/kv-user";

describe("userKeys", () => {
  it("namespaces all keys under the user email", () => {
    const keys = userKeys("alice@example.com");
    for (const key of Object.values(keys)) {
      expect(key).toMatch(/^u:alice@example\.com:/);
    }
  });

  it("produces distinct keys for different users", () => {
    const a = userKeys("alice@example.com");
    const b = userKeys("bob@example.com");
    expect(a.stateData).not.toBe(b.stateData);
    expect(a.userToken).not.toBe(b.userToken);
  });

  it("returns all expected keys", () => {
    const keys = userKeys("x@y.com");
    const expected = [
      "stateData", "stateUpdatedAt", "serverLastSeen",
      "desiredState", "desiredStateRev",
      "styleData", "styleUpdatedAt",
      "desiredStyle", "desiredStyleRev",
      "userToken",
    ];
    for (const k of expected) {
      expect(keys).toHaveProperty(k);
    }
  });
});

describe("tokenLookupKey", () => {
  it("prefixes with t:", () => {
    expect(tokenLookupKey("abc123")).toBe("t:abc123");
  });

  it("produces different keys for different tokens", () => {
    expect(tokenLookupKey("aaa")).not.toBe(tokenLookupKey("bbb"));
  });
});
