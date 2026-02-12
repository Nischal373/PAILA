"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { differenceInHours, formatDistanceToNow } from "date-fns";
import MapPanel from "./MapPanel";
import PotholeCard from "./PotholeCard";
import Leaderboard from "./Leaderboard";
import DepartmentStats from "./DepartmentStats";
import type {
  Pothole,
  PotholeStatus,
  SessionUser,
  VoteDirection,
} from "@/lib/potholeTypes";
import {
  districtOptions,
  getWardNumberOptions,
  municipalityByDistrict,
  municipalityOptions,
} from "@/lib/locationOptions";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch potholes");
  const data = await response.json();
  return data.potholes as Pothole[];
};

interface DashboardProps {
  initialPotholes: Pothole[];
}

const statusOrder: PotholeStatus[] = [
  "reported",
  "scheduled",
  "in_progress",
  "fixed",
];

const resolveLocation = (pothole: Pothole) => {
  if (pothole.district || pothole.municipality || pothole.wardNumber) {
    return {
      district: pothole.district,
      municipality: pothole.municipality,
      wardNumber: pothole.wardNumber,
    };
  }

  if (!pothole.ward) {
    return { district: undefined, municipality: undefined, wardNumber: undefined };
  }

  const parts = pothole.ward.split("-");
  if (parts.length === 1) {
    return { district: undefined, municipality: pothole.ward, wardNumber: undefined };
  }
  const wardNumber = parts[parts.length - 1]?.trim() || undefined;
  const municipality = parts.slice(0, -1).join("-").trim() || undefined;
  return { district: undefined, municipality, wardNumber };
};

export default function PotholeDashboard({ initialPotholes }: DashboardProps) {
  const { data, mutate } = useSWR<Pothole[]>("/api/potholes", fetcher, {
    fallbackData: initialPotholes,
    refreshInterval: 15000,
  });
  const potholes = data ?? initialPotholes;
  const { data: authData } = useSWR<{ user: SessionUser | null }>(
    "/api/auth/me",
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        return { user: null };
      }
      return (await response.json()) as { user: SessionUser | null };
    }
  );
  const currentUser = authData?.user ?? null;
  const canChangeStatus = currentUser?.role === "superadmin";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [municipalityFilter, setMunicipalityFilter] = useState<string>("");
  const [wardFilter, setWardFilter] = useState<string>("");
  const [voteHistory, setVoteHistory] = useState<Record<string, VoteDirection>>({});

  const enriched = useMemo(() => {
    const now = new Date();
    return potholes.map((p) => {
      const end = p.status === "fixed" && p.fixedTime ? new Date(p.fixedTime) : now;
      return {
        ...p,
        netVotes: p.upvotes - p.downvotes,
        reportedAgo: formatDistanceToNow(new Date(p.reportTime), {
          addSuffix: true,
        }),
        openHours: Math.max(1, differenceInHours(end, new Date(p.reportTime))),
      };
    });
  }, [potholes]);

  const municipalityOptionsForDistrict = useMemo(() => {
    if (!districtFilter) return [];
    return municipalityByDistrict[districtFilter] ?? municipalityOptions;
  }, [districtFilter]);

  const wardOptions = useMemo(() => {
    if (!municipalityFilter) return [];
    return getWardNumberOptions(municipalityFilter);
  }, [municipalityFilter]);

  const filtered = useMemo(() => {
    return enriched.filter((p) => {
      const { district, municipality, wardNumber } = resolveLocation(p);
      if (districtFilter && district !== districtFilter) return false;
      if (municipalityFilter && municipality !== municipalityFilter) return false;
      if (wardFilter && wardNumber !== wardFilter) return false;
      return true;
    });
  }, [enriched, districtFilter, municipalityFilter, wardFilter]);

  const sortedPotholes = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.status === b.status) {
        return b.netVotes - a.netVotes;
      }
      return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    });
  }, [filtered]);

  const leaderboardData = useMemo(() => {
    return [...filtered]
      .sort((a, b) => b.netVotes - a.netVotes)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        ward: p.ward,
        department: p.department,
        netVotes: p.netVotes,
        status: p.status,
        openDurationHours: p.openHours,
      }));
  }, [filtered]);

  const slowFixData = useMemo(() => {
    return filtered
      .filter((p) => p.status !== "fixed")
      .sort((a, b) => b.openHours - a.openHours)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        department: p.department,
        openDurationHours: p.openHours,
        severity: p.severity,
      }));
  }, [filtered]);

  const departmentStats = useMemo(() => {
    const map = new Map<
      string,
      {
        department: string;
        totalFixHours: number;
        completed: number;
        open: number;
      }
    >();
    filtered.forEach((p) => {
      if (!map.has(p.department)) {
        map.set(p.department, {
          department: p.department,
          totalFixHours: 0,
          completed: 0,
          open: 0,
        });
      }
      const current = map.get(p.department)!;
      if (p.status === "fixed" && p.fixedTime) {
        current.totalFixHours += p.openHours;
        current.completed += 1;
      } else {
        current.open += 1;
      }
    });

    return Array.from(map.values()).map((entry) => ({
      department: entry.department,
      avgFixHours:
        entry.completed === 0 ? null : Math.round(entry.totalFixHours / entry.completed),
      completed: entry.completed,
      open: entry.open,
    }));
  }, [filtered]);

  const handleVote = async (id: string, direction: VoteDirection) => {
    if (voteHistory[id]) return;
    const response = await fetch(`/api/potholes/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (!response.ok) return;
    const nextHistory = { ...voteHistory, [id]: direction };
    setVoteHistory(nextHistory);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "paila:vote-history",
        JSON.stringify(nextHistory)
      );
    }
    await mutate();
  };

  const handleStatusChange = async (id: string, status: PotholeStatus) => {
    if (!canChangeStatus) return;
    await fetch(`/api/potholes/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await mutate();
  };


  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-slate-900 shadow-xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Paila Radar</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Crowd-powered pothole intelligence for Nepal
            </h1>
            <p className="mt-3 max-w-3xl text-lg text-slate-600">
              Report, vote, and track every crater. Heatmaps update every 15 seconds so wards
              and departments know exactly where commuters are hurting.
            </p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-3 lg:w-auto">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Active</p>
              <p className="mt-1 text-3xl font-semibold text-accent">
                {filtered.filter((p) => p.status !== "fixed").length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Queue hrs</p>
              <p className="mt-1 text-3xl font-semibold text-accent">
                {Math.max(
                  1,
                  Math.round(
                    filtered
                      .filter((p) => p.status !== "fixed")
                      .reduce((acc, curr) => acc + curr.openHours, 0) /
                      Math.max(1, filtered.filter((p) => p.status !== "fixed").length)
                  )
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 text-slate-900 shadow-sm backdrop-blur md:grid-cols-[2fr_2fr_1fr_auto]">
        <label className="text-sm text-slate-600">
          District
          <select
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-accent focus:outline-none"
            value={districtFilter}
            onChange={(event) => {
              const value = event.target.value;
              setDistrictFilter(value);
              setMunicipalityFilter("");
              setWardFilter("");
            }}
          >
            <option value="" className="bg-white text-slate-900">
              All districts
            </option>
            {districtOptions.map((option) => (
              <option key={`district-${option}`} value={option} className="bg-white text-slate-900">
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-600">
          Municipality
          <select
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-accent focus:outline-none"
            value={municipalityFilter}
            onChange={(event) => {
              const value = event.target.value;
              setMunicipalityFilter(value);
              setWardFilter("");
            }}
            disabled={!districtFilter}
          >
            <option value="" className="bg-white text-slate-900">
              {districtFilter ? "All municipalities" : "Choose district first"}
            </option>
            {municipalityOptionsForDistrict.map((option) => (
              <option key={`municipality-${option}`} value={option} className="bg-white text-slate-900">
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-600">
          Ward no.
          <select
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-accent focus:outline-none"
            value={wardFilter}
            onChange={(event) => setWardFilter(event.target.value)}
            disabled={!municipalityFilter}
          >
            <option value="" className="bg-white text-slate-900">
              {municipalityFilter ? "All wards" : "Choose municipality first"}
            </option>
            {wardOptions.map((option) => (
              <option key={`ward-${option}`} value={option} className="bg-white text-slate-900">
                Ward {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setDistrictFilter("");
              setMunicipalityFilter("");
              setWardFilter("");
            }}
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-400"
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xl backdrop-blur">
        <div className="h-[680px] rounded-2xl border border-slate-200 bg-slate-100">
          <MapPanel potholes={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {sortedPotholes.map((p) => (
            <PotholeCard
              key={p.id}
              pothole={p}
              selected={p.id === selectedId}
              onSelect={() => setSelectedId(p.id)}
              onVote={handleVote}
              onStatusChange={handleStatusChange}
              currentUser={currentUser}
              canChangeStatus={canChangeStatus}
              userVote={voteHistory[p.id]}
            />
          ))}
          {sortedPotholes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-600">
              No potholes yet. Be the first to report one!
            </div>
          )}
        </div>
        <div className="space-y-6">
          <Leaderboard hottest={leaderboardData} slowest={slowFixData} />
          <DepartmentStats entries={departmentStats} />
        </div>
      </section>
    </div>
  );
}
