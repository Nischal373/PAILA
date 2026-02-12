import "server-only";

import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import {
  LeaderboardEntry,
  NewPotholeInput,
  Pothole,
  PotholeSeverity,
  PotholeStatus,
  VoteDirection,
} from "@/lib/potholeTypes";

const POTHOLES_TABLE = "potholes";

interface PotholeRow {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  district: string | null;
  municipality: string | null;
  wardnumber: string | null;
  ward: string | null;
  department: string;
  severity: string;
  potholeconfidence: number | null;
  status: PotholeStatus;
  reportername: string | null;
  reporttime: string;
  fixedtime: string | null;
  upvotes: number;
  downvotes: number;
  imageurl: string | null;
}

function parseSeverity(value: string): PotholeSeverity {
  const allowed: PotholeSeverity[] = ["low", "medium", "high", "critical"];
  return allowed.includes(value as PotholeSeverity)
    ? (value as PotholeSeverity)
    : "medium";
}

function mapRowToPothole(row: PotholeRow): Pothole {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    department: row.department,
    severity: parseSeverity(row.severity),
    potholeConfidence: row.potholeconfidence ?? undefined,
    district: row.district ?? undefined,
    municipality: row.municipality ?? undefined,
    wardNumber: row.wardnumber ?? undefined,
    ward: row.ward ?? undefined,
    reporterName: row.reportername ?? undefined,
    status: row.status,
    reportTime: row.reporttime,
    fixedTime: row.fixedtime ?? undefined,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    imageUrl: row.imageurl ?? undefined,
  };
}

export async function getPotholes(): Promise<Pothole[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(POTHOLES_TABLE)
    .select("*")
    .order("reporttime", { ascending: false });

  if (error) {
    console.error("Failed to fetch potholes", error);
    throw new Error("Unable to fetch potholes from Supabase");
  }

  return (data ?? []).map(mapRowToPothole);
}

export async function addPothole(input: NewPotholeInput) {
  const baseWard =
    input.ward ??
    (input.municipality && input.wardNumber
      ? `${input.municipality}-${input.wardNumber}`
      : null);

  const buildInsertPayload = (
    includeLocationFields: boolean,
    includeConfidence: boolean
  ) => {
    const payload: Record<string, unknown> = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? "",
      latitude: input.latitude,
      longitude: input.longitude,
      ward: baseWard,
      department: input.department,
      severity: input.severity,
      reportername: input.reporterName ?? null,
      reporttime: new Date().toISOString(),
      fixedtime: null,
      status: "reported",
      upvotes: 0,
      downvotes: 0,
      imageurl: input.imageUrl ?? null,
    };

    if (includeLocationFields) {
      payload.district = input.district ?? null;
      payload.municipality = input.municipality ?? null;
      payload.wardnumber = input.wardNumber ?? null;
    }

    if (includeConfidence) {
      payload.potholeconfidence = input.potholeConfidence ?? null;
    }

    return payload;
  };

  const attemptInsert = async (
    includeLocationFields: boolean,
    includeConfidence: boolean
  ) => {
    const supabaseAdmin = getSupabaseAdmin();
    const payload = buildInsertPayload(includeLocationFields, includeConfidence);
    return supabaseAdmin
      .from(POTHOLES_TABLE)
      .insert(payload as never)
      .select()
      .single();
  };

  let result = await attemptInsert(true, true);

  if (result.error) {
    const message = result.error.message ?? "";
    const missingColumn =
      message.includes("column") &&
      message.includes("does not exist") &&
      (message.includes("district") ||
        message.includes("municipality") ||
        message.includes("wardnumber") ||
        message.includes("potholeconfidence"));

    if (missingColumn) {
      const missingConfidence = message.includes("potholeconfidence");
      result = await attemptInsert(true, !missingConfidence);
    }

    if (result.error && message.includes("column") && message.includes("does not exist")) {
      result = await attemptInsert(false, false);
    }
  }

  if (result.error) {
    console.error("Failed to insert pothole", result.error);
    const errorInfo = {
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
      code: result.error.code,
    };
    throw new Error(
      `Unable to create pothole entry: ${JSON.stringify(errorInfo)}`
    );
  }

  return mapRowToPothole(result.data as PotholeRow);
}

async function fetchPotholeById(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from(POTHOLES_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error("Pothole not found");
  }

  return mapRowToPothole(data);
}

export async function voteOnPothole(id: string, direction: VoteDirection) {
  const supabaseAdmin = getSupabaseAdmin();
  const existing = await fetchPotholeById(id);
  const updates =
    direction === "up"
      ? { upvotes: existing.upvotes + 1 }
      : { downvotes: existing.downvotes + 1 };

  const { data, error } = await supabaseAdmin
    .from(POTHOLES_TABLE)
    .update(updates as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update vote counts", error);
    throw new Error("Unable to record vote");
  }

  return mapRowToPothole(data);
}

export async function updatePotholeStatus(
  id: string,
  status: PotholeStatus,
  fixedTime?: string
) {
  const supabaseAdmin = getSupabaseAdmin();
  const updates: Pick<PotholeRow, "status" | "fixedtime"> = {
    status,
    fixedtime:
      status === "fixed" ? fixedTime ?? new Date().toISOString() : null,
  };

  const { data, error } = await supabaseAdmin
    .from(POTHOLES_TABLE)
    .update(updates as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update status", error);
    throw new Error("Unable to update pothole status");
  }

  return mapRowToPothole(data);
}

function hoursBetween(startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return (end - start) / (1000 * 60 * 60);
}

export async function buildLeaderboard(): Promise<LeaderboardEntry[]> {
  const potholes = await getPotholes();
  const now = new Date().toISOString();
  return potholes
    .map((p) => ({
      id: p.id,
      title: p.title,
      ward: p.ward,
      department: p.department,
      status: p.status,
      netVotes: p.upvotes - p.downvotes,
      openDurationHours: hoursBetween(
        p.reportTime,
        p.status === "fixed" && p.fixedTime ? p.fixedTime : now
      ),
    }))
    .sort((a, b) => b.netVotes - a.netVotes);
}
