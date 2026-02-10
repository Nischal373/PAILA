import Link from "next/link";
import { getPotholes } from "@/lib/potholeStore";

const formatLocation = (report: {
  district?: string;
  municipality?: string;
  wardNumber?: string;
  ward?: string;
}) => {
  const label = [
    report.district,
    report.municipality,
    report.wardNumber ? `Ward ${report.wardNumber}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return label || report.ward || "Location pending";
};

type TrendingReport = {
  id: string;
  title: string;
  status: string;
  severity: string;
  netVotes: number;
  location: string;
  reportTime: string;
};

export default async function Home() {
  let trendingReports: TrendingReport[] = [];

  try {
    const potholes = await getPotholes();
    trendingReports = potholes
      .map((report) => ({
        id: report.id,
        title: report.title,
        status: report.status,
        severity: report.severity,
        netVotes: report.upvotes - report.downvotes,
        location: formatLocation(report),
        reportTime: report.reportTime,
      }))
      .sort((a, b) => {
        if (b.netVotes !== a.netVotes) return b.netVotes - a.netVotes;
        return new Date(b.reportTime).getTime() - new Date(a.reportTime).getTime();
      })
      .slice(0, 5);
  } catch (error) {
    console.warn("Failed to load trending reports", error);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-rose-50 px-4 py-12 text-slate-900 md:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute right-10 top-24 h-72 w-72 rounded-full bg-sky-200/45 blur-[80px]" />
        <div className="absolute bottom-16 left-1/3 h-80 w-80 rounded-full bg-amber-100/50 blur-[90px]" />
        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full border border-slate-200/60" />
        <div className="absolute left-10 top-1/2 h-32 w-32 rounded-2xl border border-slate-200/70 rotate-12" />
      </div>
      <div className="relative mx-auto max-w-5xl space-y-10">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Paila Radar</p>
          <h2 className="mt-3 text-4xl font-semibold text-slate-900">
            Professional pothole intelligence for Nepal
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Track reports, coordinate fixes, and keep citizens in the loop with live map
            updates, voting signals, and response-time metrics.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
            >
              Open dashboard
            </Link>
            <Link
              href="/report"
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Submit a report
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Live coverage</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">Map-centric workflow</h3>
            <p className="mt-2 text-sm text-slate-600">
              Visualize every reported hazard and filter by district, municipality, and ward.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Accountability</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">Smart prioritization</h3>
            <p className="mt-2 text-sm text-slate-600">
              Votes highlight urgent fixes while status updates track progress end to end.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Reporting</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">Citizen-ready intake</h3>
            <p className="mt-2 text-sm text-slate-600">
              A clean submission flow for evidence-backed reports with photo uploads.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Trending reports
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                Most upvoted hazards right now
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Top reports based on net votes, updated from the live feed.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              View all reports
            </Link>
          </div>

          {trendingReports.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No trending reports yet. Submit a report to kick off the heatmap.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {trendingReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {report.location}
                    </p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {report.netVotes} net votes
                    </span>
                  </div>
                  <h4 className="mt-3 text-lg font-semibold text-slate-900">
                    {report.title}
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-200 px-2 py-1">
                      Status: {report.status.replace("_", " ")}
                    </span>
                    <span className="rounded-full border border-slate-200 px-2 py-1">
                      Severity: {report.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
