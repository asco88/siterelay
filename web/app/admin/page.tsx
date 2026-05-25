import { redirect } from "next/navigation";
import { kv } from "@vercel/kv";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { userKeys, USERS_SET_KEY } from "@/lib/kv-user";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin — SiteRelay" };

// ── Types ─────────────────────────────────────────────────────────────────────

type UserRow = {
  email: string;
  hasToken: boolean;
  joinedAt: number | null;
  lastSeen: number | null;
  stateAt: number | null;
  styleAt: number | null;
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchUsers(): Promise<UserRow[]> {
  const emails = ((await kv.smembers(USERS_SET_KEY)) as string[]) ?? [];
  if (emails.length === 0) return [];

  return Promise.all(
    emails.map(async (email): Promise<UserRow> => {
      const keys = userKeys(email);
      const [token, joinedAt, lastSeen, stateAt, styleAt] = await Promise.all([
        kv.get<string>(keys.userToken),
        kv.get<number>(keys.joinedAt),
        kv.get<number>(keys.serverLastSeen),
        kv.get<number>(keys.stateUpdatedAt),
        kv.get<number>(keys.styleUpdatedAt),
      ]);
      return { email, hasToken: !!token, joinedAt, lastSeen, stateAt, styleAt };
    })
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ts: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeTime(ts: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function agentStatus(lastSeen: number | null): { label: string; color: string } {
  if (!lastSeen) return { label: "Never", color: "text-slate-500" };
  const diff = Date.now() - lastSeen;
  if (diff < 5 * 60_000)   return { label: "Online",   color: "text-emerald-400" };
  if (diff < 60 * 60_000)  return { label: "Recent",   color: "text-yellow-400" };
  if (diff < 7 * 86400_000) return { label: "Inactive", color: "text-orange-400" };
  return { label: "Offline", color: "text-slate-500" };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/");

  const users = await fetchUsers();
  const now = Date.now();

  const totalUsers     = users.length;
  const active7d       = users.filter(u =>
    (u.lastSeen && now - u.lastSeen < 7 * 86400_000) ||
    (u.stateAt  && now - u.stateAt  < 7 * 86400_000)
  ).length;
  const agentOnline    = users.filter(u => u.lastSeen && now - u.lastSeen < 5 * 60_000).length;
  const withToken      = users.filter(u => u.hasToken).length;

  const sorted = [...users].sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
            ← Dashboard
          </a>
          <h1 className="text-xl font-semibold">Admin Panel</h1>
          <Badge variant="outline" className="text-xs border-white/20 text-slate-400">internal</Badge>
        </div>
        <span className="text-sm text-slate-400">{session?.user?.email}</span>
      </header>

      <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Users"   value={totalUsers} />
          <StatCard label="Active (7d)"   value={active7d}   />
          <StatCard label="Agent Online"  value={agentOnline} accent="emerald" />
          <StatCard label="With Token"    value={withToken}  />
        </div>

        {/* Users table */}
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Users</h2>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-left px-4 py-3 font-medium">Last Agent Ping</th>
                  <th className="text-left px-4 py-3 font-medium">Last Style Change</th>
                  <th className="text-left px-4 py-3 font-medium">Token</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No users yet
                    </td>
                  </tr>
                )}
                {sorted.map((u, i) => {
                  const status = agentStatus(u.lastSeen);
                  return (
                    <tr
                      key={u.email}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-200">{u.email}</td>
                      <td className="px-4 py-3 text-slate-400">{fmt(u.joinedAt)}</td>
                      <td className="px-4 py-3 text-slate-400">{relativeTime(u.lastSeen)}</td>
                      <td className="px-4 py-3 text-slate-400">{relativeTime(u.styleAt)}</td>
                      <td className="px-4 py-3">
                        {u.hasToken
                          ? <span className="text-emerald-400">✓</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className={`px-4 py-3 font-medium ${status.color}`}>{status.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-slate-600">
          Refreshes on page load · Users appear once they generate a token
        </p>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: number;
  accent?: "emerald" | "slate";
}) {
  const valueClass = accent === "emerald" ? "text-emerald-400" : "text-slate-100";
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
