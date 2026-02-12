"use client";

interface LeaderboardItem {
  id: string;
  title: string;
  department: string;
  netVotes?: number;
  openDurationHours: number;
  severity?: string;
  ward?: string;
  status?: string;
}

interface LeaderboardProps {
  hottest: LeaderboardItem[];
  slowest: LeaderboardItem[];
}

const formatHours = (hours: number) => {
  if (hours < 24) return `${Math.round(hours)} hrs`;
  const days = hours / 24;
  if (days < 7) return `${days.toFixed(1)} days`;
  return `${(days / 7).toFixed(1)} wks`;
};

export default function Leaderboard({ hottest, slowest }: LeaderboardProps) {
  const maxVotes = hottest.reduce(
    (maxValue, item) => Math.max(maxValue, item.netVotes ?? 0),
    0
  );
  const maxOpenHours = slowest.reduce(
    (maxValue, item) => Math.max(maxValue, item.openDurationHours),
    0
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-100/70 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Upvote heat</p>
        <h3 className="text-2xl font-semibold text-slate-900">Citizen priority board</h3>
        <div className="mt-4 space-y-3">
          {hottest.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    Rank #{index + 1}
                  </span>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Net votes</p>
                  <p className="text-3xl font-semibold text-accent">{item.netVotes ?? 0}</p>
                  <p className="text-xs text-slate-500">Open {formatHours(item.openDurationHours)}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <span>Momentum</span>
                  <span>{item.netVotes ?? 0}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-sky-500"
                    style={{
                      width: `${
                        maxVotes > 0
                          ? Math.min(100, Math.max(8, (((item.netVotes ?? 0) > 0 ? (item.netVotes ?? 0) : 0) / maxVotes) * 100))
                          : 8
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          {hottest.length === 0 && (
            <p className="text-center text-sm text-slate-500">No live reports yet.</p>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-lg">
        <div className="pointer-events-none absolute -left-6 -top-10 h-24 w-24 rounded-full bg-amber-100/80 blur-2xl" />
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Slow fix watch</p>
        <h3 className="text-2xl font-semibold text-slate-900">Departments on the clock</h3>
        <div className="mt-4 space-y-3">
          {slowest.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-lg font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.department}</p>
              <p className="text-sm text-amber-700">
                Open for {formatHours(item.openDurationHours)} • Severity {item.severity}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400"
                  style={{
                    width: `${
                      maxOpenHours > 0
                        ? Math.min(100, Math.max(10, (item.openDurationHours / maxOpenHours) * 100))
                        : 10
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
          {slowest.length === 0 && (
            <p className="text-center text-sm text-slate-500">All reported potholes are fixed 🎉</p>
          )}
        </div>
      </section>
    </div>
  );
}
