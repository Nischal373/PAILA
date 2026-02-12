import { NextResponse } from "next/server";
import { addPothole, getPotholes } from "@/lib/potholeStore";
import { getSupabaseAdmin, potholeBucket } from "@/lib/supabaseServer";
import type { NewPotholeInput, PotholeSeverity } from "@/lib/potholeTypes";

const STORAGE_FOLDER = "potholes";
const MODEL_URL = process.env.POTHOLE_MODEL_URL;
const MODEL_TIMEOUT_MS = Number(process.env.POTHOLE_MODEL_TIMEOUT_MS ?? "8000");

export async function GET() {
  const potholes = await getPotholes();
  return NextResponse.json({ potholes });
}

function parseSeverity(value: FormDataEntryValue | null): PotholeSeverity {
  const fallback: PotholeSeverity = "medium";
  if (!value || typeof value !== "string") return fallback;
  const allowed: PotholeSeverity[] = ["low", "medium", "high", "critical"];
  return allowed.includes(value as PotholeSeverity)
    ? (value as PotholeSeverity)
    : fallback;
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

async function persistImage(file: File | null) {
  if (!file || file.size === 0) return undefined;
  const supabaseAdmin = getSupabaseAdmin();
  if (!potholeBucket) {
    throw new Error("Supabase storage bucket is not configured");
  }

  const extensionMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extensionMatch ? `.${extensionMatch[1]}` : "";
  const base = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]+/g, "-");
  const objectPath = `${STORAGE_FOLDER}/${Date.now()}-${base || "upload"}${ext || ".png"}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(potholeBucket)
    .upload(objectPath, buffer, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("Image upload failed", error);
    throw new Error("Could not upload image to storage");
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(potholeBucket).getPublicUrl(objectPath);

  return publicUrl;
}

async function verifyPotholeImage(file: File | null) {
  if (!MODEL_URL || !file || file.size === 0) return undefined;

  const form = new FormData();
  form.set("file", file, file.name || "upload.jpg");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const response = await fetch(MODEL_URL, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Pothole model did not accept the image");
    }

    const result = (await response.json()) as {
      success?: boolean;
      has_pothole?: boolean;
      confidence?: number;
      pothole_probability?: number;
    };

    if (!result?.success) {
      throw new Error("Pothole model failed to analyze the image");
    }

    if (!result.has_pothole) {
      throw new Error("Image does not appear to contain a pothole");
    }

    return result.pothole_probability ?? result.confidence;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("Pothole model timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function formDataToPayload(
  formData: FormData,
  imageUrl: string | undefined,
  potholeConfidence?: number
): Promise<NewPotholeInput> {
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new Error("Latitude and longitude are required");
  }

  return {
    title: String(formData.get("title") ?? "Unnamed pothole"),
    description: String(formData.get("description") ?? ""),
    department: normalizeOptionalString(formData.get("department")) ?? "Department of Roads",
    reporterName: normalizeOptionalString(formData.get("reporterName")),
    district: normalizeOptionalString(formData.get("district")),
    municipality: normalizeOptionalString(formData.get("municipality")),
    wardNumber: normalizeOptionalString(formData.get("wardNumber")),
    ward: normalizeOptionalString(formData.get("ward")),
    latitude,
    longitude,
    severity: parseSeverity(formData.get("severity")),
    potholeConfidence,
    imageUrl,
  };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
        return NextResponse.json(
          { error: "Latitude and longitude are required" },
          { status: 400 }
        );
      }
      const payload: NewPotholeInput = {
        title: body.title ?? "Unnamed pothole",
        description: body.description ?? "",
        department: (typeof body.department === "string" && body.department.trim())
          ? body.department.trim()
          : "Department of Roads",
        reporterName:
          typeof body.reporterName === "string" && body.reporterName.trim()
            ? body.reporterName.trim()
            : undefined,
        district:
          typeof body.district === "string" && body.district.trim()
            ? body.district.trim()
            : undefined,
        municipality:
          typeof body.municipality === "string" && body.municipality.trim()
            ? body.municipality.trim()
            : undefined,
        wardNumber:
          typeof body.wardNumber === "string" && body.wardNumber.trim()
            ? body.wardNumber.trim()
            : undefined,
        ward:
          typeof body.ward === "string" && body.ward.trim()
            ? body.ward.trim()
            : undefined,
        latitude: body.latitude,
        longitude: body.longitude,
        severity: body.severity ?? "medium",
      };
      const created = await addPothole(payload);
      return NextResponse.json(created, { status: 201 });
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const potholeConfidence = await verifyPotholeImage(imageFile);
    const imageUrl = await persistImage(imageFile);
    const payload = await formDataToPayload(formData, imageUrl, potholeConfidence);
    const created = await addPothole(payload);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Unable to create pothole" },
      { status: 400 }
    );
  }
}
