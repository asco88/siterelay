import { vi, beforeEach } from "vitest";

// ── In-memory KV store ────────────────────────────────────────────────────────

const store = new Map<string, unknown>();

export const kvMock = {
  get: vi.fn(async (key: string) => store.get(key) ?? null),
  set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
  del: vi.fn(async (key: string) => { store.delete(key); }),
  mset: vi.fn(async (entries: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(entries)) store.set(k, v);
  }),
  _store: store,
  _reset: () => store.clear(),
};

vi.mock("@vercel/kv", () => ({ kv: kvMock }));

// ── Auth mock (NextAuth session) ──────────────────────────────────────────────

export let mockSession: { user: { email: string; name?: string } } | null = null;

export function setSession(email: string | null) {
  mockSession = email ? { user: { email, name: "Test User" } } : null;
}

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

// Reset state between tests
beforeEach(() => {
  kvMock._reset();
  vi.clearAllMocks();
  // Re-wire the mocks after clearAllMocks
  kvMock.get.mockImplementation(async (key: string) => store.get(key) ?? null);
  kvMock.set.mockImplementation(async (key: string, value: unknown) => { store.set(key, value); });
  kvMock.del.mockImplementation(async (key: string) => { store.delete(key); });
  kvMock.mset.mockImplementation(async (entries: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(entries)) store.set(k, v);
  });
  mockSession = null;
});
