import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ENV_PATH = new URL("../.env.local", import.meta.url);

const parseEnvFile = async () => {
  const raw = await readFile(ENV_PATH, "utf8");
  const env = {};
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  });
  return env;
};

const getEnv = async () => {
  const fileEnv = await parseEnvFile();
  return { ...fileEnv, ...process.env };
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getFilename = (url) => {
  try {
    return basename(new URL(url).pathname) || "image.jpg";
  } catch {
    return "image.jpg";
  }
};

const run = async () => {
  const env = await getEnv();
  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const modelUrl = env.POTHOLE_MODEL_URL;
  const limit = toNumber(env.BACKFILL_LIMIT) ?? 50;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  if (!modelUrl) {
    throw new Error("Missing POTHOLE_MODEL_URL in .env.local");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: potholes, error } = await supabase
    .from("potholes")
    .select("id, imageurl, potholeconfidence")
    .is("potholeconfidence", null)
    .not("imageurl", "is", null)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load potholes: ${error.message}`);
  }

  if (!potholes || potholes.length === 0) {
    console.log("No potholes to backfill.");
    return;
  }

  for (const pothole of potholes) {
    const imageUrl = pothole.imageurl;
    if (!imageUrl) continue;

    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.warn(`Skip ${pothole.id}: image fetch failed (${imageResponse.status})`);
        continue;
      }

      const buffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
      const form = new FormData();
      form.set(
        "file",
        new Blob([buffer], { type: contentType }),
        getFilename(imageUrl)
      );

      const modelResponse = await fetch(modelUrl, {
        method: "POST",
        body: form,
      });

      if (!modelResponse.ok) {
        console.warn(`Skip ${pothole.id}: model rejected (${modelResponse.status})`);
        continue;
      }

      const result = await modelResponse.json();
      const confidence =
        typeof result?.pothole_probability === "number"
          ? result.pothole_probability
          : result?.confidence;

      if (typeof confidence !== "number") {
        console.warn(`Skip ${pothole.id}: model response missing confidence`);
        continue;
      }

      const { error: updateError } = await supabase
        .from("potholes")
        .update({ potholeconfidence: confidence })
        .eq("id", pothole.id);

      if (updateError) {
        console.warn(`Skip ${pothole.id}: update failed (${updateError.message})`);
        continue;
      }

      console.log(`Updated ${pothole.id} -> ${Math.round(confidence * 100)}%`);
    } catch (err) {
      console.warn(`Skip ${pothole.id}: ${err?.message ?? "unknown error"}`);
    }
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
