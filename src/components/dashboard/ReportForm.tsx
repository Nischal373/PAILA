"use client";

import { useMemo, useState } from "react";
import type { PotholeSeverity } from "@/lib/potholeTypes";
import {
  districtOptions,
  getWardNumberOptions,
  municipalityByDistrict,
  municipalityOptions,
} from "@/lib/locationOptions";

const severityOptions: { value: PotholeSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

interface ReportFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  selectedCoords: { latitude: number; longitude: number } | null;
  onClearSelection: () => void;
}

export default function ReportForm({
  onSubmit,
  selectedCoords,
  onClearSelection,
}: ReportFormProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error" | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedWard, setSelectedWard] = useState("");

  const filteredMunicipalities = useMemo(() => {
    if (!selectedDistrict) return [];
    return municipalityByDistrict[selectedDistrict] ?? municipalityOptions;
  }, [selectedDistrict]);

  const filteredWards = useMemo(() => {
    if (!selectedMunicipality) return [];
    return getWardNumberOptions(selectedMunicipality);
  }, [selectedMunicipality]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!selectedCoords) {
      setMessage("Tap the map to drop a pin before submitting.");
      setMessageTone("error");
      return;
    }
    const form = new FormData(formElement);
    form.set("latitude", String(selectedCoords.latitude));
    form.set("longitude", String(selectedCoords.longitude));
    setPending(true);
    setMessage(null);
    setMessageTone(null);
    try {
      await onSubmit(form);
      formElement.reset();
      setSelectedDistrict("");
      setSelectedMunicipality("");
      setSelectedWard("");
      setMessage("Report received. Thank you for flagging the hazard!");
      setMessageTone("success");
    } catch (error) {
      console.error(error);
      setMessage("Could not submit report. Try again.");
      setMessageTone("error");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-slate-900 shadow-xl backdrop-blur"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Instant report</p>
          <h2 className="text-2xl font-semibold text-slate-900">Drop a pothole pin</h2>
        </div>
        {message && (
          <p
            className={`text-xs ${
              messageTone === "error" ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      <div className="grid gap-4">
        <label className="text-sm text-slate-600">
          Title
          <input
            name="title"
            required
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none"
            placeholder="What are commuters calling it?"
          />
        </label>

        <label className="text-sm text-slate-600">
          Description (optional)
          <textarea
            name="description"
            rows={3}
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none"
            placeholder="Why is it dangerous? Include depth, traffic impact, etc"
          />
        </label>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Location pin</p>
          {selectedCoords ? (
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <p>
                  Lat {selectedCoords.latitude.toFixed(4)}, Lng {selectedCoords.longitude.toFixed(4)}
                </p>
                <p className="text-xs text-slate-500">Move the map or tap elsewhere to relocate.</p>
              </div>
              <button
                type="button"
                onClick={onClearSelection}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"
              >
                Clear pin
              </button>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">Tap anywhere on the map to drop a pin for this report.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-slate-600">
            District
            <select
              name="district"
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-accent focus:outline-none"
              value={selectedDistrict}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedDistrict(value);
                setSelectedMunicipality("");
                setSelectedWard("");
              }}
            >
              <option value="" className="bg-white text-slate-900">
                Select district
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
              name="municipality"
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-accent focus:outline-none"
              value={selectedMunicipality}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedMunicipality(value);
                setSelectedWard("");
              }}
              disabled={!selectedDistrict}
            >
              <option value="" className="bg-white text-slate-900">
                {selectedDistrict ? "Select municipality" : "Choose district first"}
              </option>
              {filteredMunicipalities.map((option) => (
                <option key={`municipality-${option}`} value={option} className="bg-white text-slate-900">
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Ward no.
            <select
              name="wardNumber"
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-accent focus:outline-none"
              value={selectedWard}
              onChange={(event) => setSelectedWard(event.target.value)}
              disabled={!selectedMunicipality}
            >
              <option value="" className="bg-white text-slate-900">
                {selectedMunicipality ? "Select ward" : "Choose municipality first"}
              </option>
              {filteredWards.map((option) => (
                <option key={`ward-${option}`} value={option} className="bg-white text-slate-900">
                  Ward {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-600">
            Department
            <input
              name="department"
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none"
              placeholder="Responsible office"
            />
          </label>
          <label className="text-sm text-slate-600">
            Reporter name (optional)
            <input
              name="reporterName"
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none"
              placeholder="Stays private"
            />
          </label>
        </div>

        <label className="text-sm text-slate-600">
          Severity
          <select
            name="severity"
            className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-accent focus:outline-none"
            defaultValue="medium"
          >
            {severityOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-white text-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-600">
          Photo evidence
          <input
            type="file"
            name="image"
            accept="image/*"
            className="mt-1 block w-full text-slate-700"
          />
          <span className="text-xs text-slate-500">Field teams use this to validate depth and repair tools.</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-2xl bg-accent px-6 py-3 text-lg font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Sending..." : "Submit to control room"}
      </button>
    </form>
  );
}
