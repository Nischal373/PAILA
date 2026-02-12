"use client";

interface DepartmentEntry {
  department: string;
  avgFixHours: number | null;
  completed: number;
  open: number;
}

interface Props {
  entries: DepartmentEntry[];
}

const formatDuration = (hours: number | null) => {
  if (hours === null) return "No fixes yet";
  if (hours < 24) return `${Math.round(hours)} hrs`;
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
};

export default function DepartmentStats({ entries }: Props) {
  const maxTotalReports = entries.reduce(
    (maxValue, entry) => Math.max(maxValue, entry.completed + entry.open),
    0
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-lg">
      <div className="pointer-events-none absolute -bottom-10 -right-8 h-24 w-24 rounded-full bg-sky-100/70 blur-2xl" />
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Department pulse</p>
      <h3 className="text-2xl font-semibold text-slate-900">Fix-time scoreboard</h3>
      <div className="mt-4 space-y-3">
        {entries.map((entry) => (
          <div key={entry.department} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-lg font-semibold text-slate-900">{entry.department}</p>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
              <span>Avg fix: {formatDuration(entry.avgFixHours)}</span>
              <span>Closed: {entry.completed}</span>
              <span>Open: {entry.open}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400"
                style={{
                  width: `${
                    maxTotalReports > 0
                      ? Math.min(
                          100,
                          Math.max(12, ((entry.completed + entry.open) / maxTotalReports) * 100)
                        )
                      : 12
                  }%`,
                }}
              />
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-center text-sm text-slate-500">No departmental signals yet.</p>
        )}
      </div>
    </section>
  );
}
