"use client";

import Image from "next/image";
import { useState } from "react";
import type {
  Pothole,
  PotholeStatus,
  VoteDirection,
} from "@/lib/potholeTypes";

const statusCopy: Record<PotholeStatus, string> = {
  reported: "Reported",
  scheduled: "Scheduled",
  in_progress: "Crew on site",
  fixed: "Fixed",
};

const statusColors: Record<PotholeStatus, string> = {
  reported: "bg-amber-400/20 text-amber-100",
  scheduled: "bg-sky-400/20 text-sky-100",
  in_progress: "bg-indigo-400/20 text-indigo-100",
  fixed: "bg-emerald-400/20 text-emerald-100",
};

const statuses: PotholeStatus[] = ["reported", "scheduled", "in_progress", "fixed"];

interface PotholeCardProps {
  pothole: Pothole & {
    netVotes: number;
    reportedAgo: string;
    openHours: number;
  };
  selected: boolean;
  onSelect: () => void;
  onVote: (id: string, direction: VoteDirection) => Promise<void>;
  onStatusChange: (id: string, status: PotholeStatus) => Promise<void>;
  userVote?: VoteDirection;
}

export default function PotholeCard({
  pothole,
  selected,
  onSelect,
  onVote,
  onStatusChange,
  userVote,
}: PotholeCardProps) {
  const [upLoading, setUpLoading] = useState(false);
  const [downLoading, setDownLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const voteLocked = Boolean(userVote);

  const triggerVote = async (direction: VoteDirection) => {
    if (direction === "up") setUpLoading(true);
    else setDownLoading(true);
    await onVote(pothole.id, direction);
    setUpLoading(false);
    setDownLoading(false);
  };

  const triggerStatusChange = async (status: PotholeStatus) => {
    setStatusLoading(true);
    await onStatusChange(pothole.id, status);
    setStatusLoading(false);
  };

  const locationLabel = [
    pothole.district,
    pothole.municipality,
    pothole.wardNumber ? `Ward ${pothole.wardNumber}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      onClick={onSelect}
      className={`flex gap-6 rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-lg transition hover:border-accent/60 ${
        selected ? "ring-2 ring-accent/80" : ""
      }`}
    >
      {pothole.imageUrl ? (
        <Image
          src={pothole.imageUrl}
          alt={pothole.title}
          width={128}
          height={112}
          className="h-28 w-32 rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-28 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-sm text-slate-400">
          No photo
        </div>
      )}

      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[pothole.status]}`}>
            {statusCopy[pothole.status]}
          </span>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {locationLabel || pothole.ward || "Unknown ward"}
          </p>
          <p className="text-xs text-slate-500">{pothole.reportedAgo}</p>
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">{pothole.title}</h3>
          <p className="text-sm text-slate-600">{pothole.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span>Dept: {pothole.department}</span>
          <span>Severity: {pothole.severity}</span>
          {typeof pothole.potholeConfidence === "number" && (
            <span className="group relative inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Pothole likely · {Math.round(pothole.potholeConfidence * 100)}%
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600">
                i
              </span>
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                Model confidence from image analysis, not a guarantee.
              </span>
            </span>
          )}
          <span>Open: {Math.max(1, Math.round(pothole.openHours / 24))} days</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-full bg-slate-100 px-4 py-1 text-sm">
            <button
              type="button"
              disabled={upLoading || voteLocked}
              onClick={(event) => {
                event.stopPropagation();
                triggerVote("up");
              }}
              className={`text-emerald-600 hover:text-emerald-700 ${
                voteLocked ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              ▲
            </button>
            <span className="text-lg font-semibold text-slate-900">
              {pothole.netVotes} <span className="text-xs text-slate-500">net</span>
            </span>
            <button
              type="button"
              disabled={downLoading || voteLocked}
              onClick={(event) => {
                event.stopPropagation();
                triggerVote("down");
              }}
              className={`text-rose-600 hover:text-rose-700 ${
                voteLocked ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              ▼
            </button>
          </div>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Status update
            <select
              disabled={statusLoading}
              value={pothole.status}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => triggerStatusChange(event.target.value as PotholeStatus)}
              className="ml-3 rounded-2xl border border-slate-300 bg-white px-3 py-1 text-base text-slate-900"
            >
              {statuses.map((status) => (
                <option key={status} value={status} className="bg-white text-slate-900">
                  {statusCopy[status]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </article>
  );
}
