"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import MapPanel from "./MapPanel";
import ReportForm from "./ReportForm";
import type { Pothole } from "@/lib/potholeTypes";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch potholes");
  const data = await response.json();
  return data.potholes as Pothole[];
};

interface ReportPageProps {
  initialPotholes: Pothole[];
}

export default function ReportPage({ initialPotholes }: ReportPageProps) {
  const { data, mutate } = useSWR<Pothole[]>("/api/potholes", fetcher, {
    fallbackData: initialPotholes,
    refreshInterval: 15000,
  });
  const potholes = data ?? initialPotholes;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newReportCoords, setNewReportCoords] = useState<
    { latitude: number; longitude: number } | null
  >(null);

  const enriched = useMemo(() => {
    return potholes.map((p) => ({
      ...p,
      netVotes: p.upvotes - p.downvotes,
      openHours: 0,
    }));
  }, [potholes]);

  const handleReport = async (formData: FormData) => {
    const response = await fetch("/api/potholes", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let message = "Unable to submit pothole report";
      try {
        const payload = await response.json();
        if (payload?.error) message = payload.error;
      } catch (error) {
        console.error("Failed to parse pothole POST error", error);
      }
      throw new Error(message);
    }

    const created = (await response.json()) as Pothole;
    await mutate((current) => (current ? [created, ...current] : [created]), {
      revalidate: true,
    });
    setNewReportCoords(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 px-4 py-10 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Report a hazard</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            Submit a pothole report
          </h2>
          <p className="mt-3 text-slate-600">
            Tap the map to place a pin, add details, and upload a photo so field teams
            can validate and prioritize repairs.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur">
            <div className="h-[520px] rounded-2xl border border-slate-200 bg-slate-100">
              <MapPanel
                potholes={enriched}
                selectedId={selectedId}
                onSelect={setSelectedId}
                newReportCoords={newReportCoords}
                onMapClick={(coords) => {
                  setSelectedId(null);
                  setNewReportCoords(coords);
                }}
              />
            </div>
          </div>
          <ReportForm
            onSubmit={handleReport}
            selectedCoords={newReportCoords}
            onClearSelection={() => setNewReportCoords(null)}
          />
        </section>
      </div>
    </main>
  );
}
