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
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-lg">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Upvote heat</p>
        <h3 className="text-2xl font-semibold text-slate-900">Citizen priority board</h3>
        <div className="mt-4 space-y-3">
          {hottest.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="text-sm text-slate-500">#{index + 1}</p>
                <p className="text-lg font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.department}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Net votes</p>
                <p className="text-3xl font-semibold text-accent">{item.netVotes ?? 0}</p>
                <p className="text-xs text-slate-500">Open {formatHours(item.openDurationHours)}</p>
              </div>
            </div>
          ))}
          {hottest.length === 0 && (
            <p className="text-center text-sm text-slate-500">No live reports yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-lg">
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
