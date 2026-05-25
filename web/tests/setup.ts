import { vi, beforeEach } from "vitest";

// ── In-memory KV store ────────────────────────────────────────────────────────

const store = new Map<string, unknown>();
const sets  = new Map<string, Set<string>>();

export const kvMock = {
  get:      vi.fn(async (key: string) => store.get(key) ?? null),
  set:      vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
  del:      vi.fn(async (key: string) => { store.delete(key); }),
  mset:     vi.fn(async (entries: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(entries)) store.set(k, v);
  }),
  sadd:     vi.fn(async (key: string, ...members: string[]) => {
    if (!sets.has(key)) sets.set(key, new Set());
    for (const m of members) sets.get(key)!.add(m);
  }),
  smembers: vi.fn(async (key: string) => [...(sets.get(key) ?? [])]),
  _store: store,
  _sets:  sets,
  _reset: () => { store.clear(); sets.clear(); },
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
  kvMock.sadd.mockImplementation(async (key: string, ...members: string[]) => {
    if (!sets.has(key)) sets.set(key, new Set());
    for (const m of members) sets.get(key)!.add(m);
  });
  kvMock.smembers.mockImplementation(async (key: string) => [...(sets.get(key) ?? [])]);
  mockSession = null;
});
