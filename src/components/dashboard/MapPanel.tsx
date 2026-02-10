"use client";

import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl";
import { useMemo, useCallback } from "react";
import clsx from "clsx";
import type { Pothole } from "@/lib/potholeTypes";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const mapLibPromise = import("maplibre-gl");
const KATHMANDU_CENTER = {
  longitude: 85.324,
  latitude: 27.7172,
  zoom: 11,
};

const severityToColor: Record<string, string> = {
  low: "bg-emerald-300",
  medium: "bg-amber-400",
  high: "bg-orange-500",
  critical: "bg-rose-600",
};

interface MapPanelProps {
  potholes: Array<Pothole & { netVotes: number; openHours: number }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  newReportCoords?: { latitude: number; longitude: number } | null;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
}

export default function MapPanel({
  potholes,
  selectedId,
  onSelect,
  newReportCoords,
  onMapClick,
}: MapPanelProps) {
  const selected = useMemo(
    () => potholes.find((p) => p.id === selectedId),
    [potholes, selectedId]
  );

  const handleMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      if (!onMapClick) return;
      if (event.originalEvent.defaultPrevented) return;
      const { lat, lng } = event.lngLat;
      onMapClick({ latitude: lat, longitude: lng });
    },
    [onMapClick]
  );

  return (
    <Map
      initialViewState={KATHMANDU_CENTER}
      mapStyle={MAP_STYLE}
      onClick={handleMapClick}
      reuseMaps
      attributionControl={false}
      style={{ width: "100%", height: "100%", borderRadius: "1.25rem" }}
      mapLib={mapLibPromise}
    >
      <NavigationControl position="bottom-right" showZoom visualizePitch={false} />
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-lg">
        {potholes.length} live reports
      </div>
      {potholes.map((p) => (
        <Marker key={p.id} longitude={p.longitude} latitude={p.latitude} anchor="bottom">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onSelect(p.id);
            }}
            className={clsx(
              "flex flex-col items-center gap-1 text-xs text-white shadow-lg",
              selectedId === p.id ? "scale-110" : "opacity-90"
            )}
          >
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-midnight">
              {Math.max(-99, p.netVotes)}
            </span>
            <span
              className={clsx(
                "h-4 w-4 rounded-full border-2 border-white",
                severityToColor[p.severity] ?? "bg-emerald-300"
              )}
            />
          </button>
        </Marker>
      ))}
      {selected && (
        <Popup
          longitude={selected.longitude}
          latitude={selected.latitude}
          anchor="top"
          closeButton={false}
          offset={20}
          maxWidth="320px"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-midnight">{selected.title}</p>
            <p className="text-xs text-slate-600">
              {selected.department} • {selected.severity.toUpperCase()}
            </p>
            <p className="text-xs text-slate-700">
              Open for {Math.round(selected.openHours)} hrs · Net votes {selected.netVotes}
            </p>
          </div>
        </Popup>
      )}
      {newReportCoords && (
        <Marker
          longitude={newReportCoords.longitude}
          latitude={newReportCoords.latitude}
          anchor="bottom"
        >
          <div className="flex flex-col items-center gap-1 text-xs text-white">
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-midnight">
              New pin
            </span>
            <span className="relative block h-4 w-4">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/50" />
              <span className="absolute inset-1 rounded-full bg-accent" />
            </span>
          </div>
        </Marker>
      )}
    </Map>
  );
}
