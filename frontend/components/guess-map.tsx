"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CAMPUSES,
  campusIdsForUniversity,
  type CampusId,
  type University,
} from "@/config/buildings";

type GuessMapProps = {
  onGuess: (lat: number, lng: number) => void;
  disabled?: boolean;
  showResult?: boolean;
  guessedLocation?: { lat: number; lng: number } | null;
  actualLocation?: { lat: number; lng: number; name: string } | null;
  isVisible?: boolean;
  distanceMeters?: number | null;
  /** Called (throttled) as the mouse moves over the map, for streaming the cursor. */
  onCursorMove?: (lat: number, lng: number) => void;
  /** Opponent cursors to render as ghost pointers. */
  opponentCursors?: { playerId: string; username: string; lat: number; lng: number }[];
  /**
   * University filter for the game. Controls which campuses are highlighted and
   * the campus selector: "concordia"/"mcgill" show a two-campus toggle, while
   * null ("all campuses") shows a dropdown of every campus.
   */
  university?: University | null;
};

// Stable-ish colour per opponent, derived from their id.
const OPPONENT_COLORS = ["#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#ef4444", "#22c55e", "#0ea5e9"];
function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return OPPONENT_COLORS[h % OPPONENT_COLORS.length];
}

// A ghost cursor (pointer + name label) for an opponent.
function createOpponentCursorElement(username: string, color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText =
    "display:flex;align-items:flex-start;gap:4px;pointer-events:none;transition:transform 0.15s linear;";
  el.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">
      <path d="M5 3l14 7-6 2-2 6-6-15z" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
    <span style="background:${color};color:white;font-size:10px;font-weight:600;padding:1px 6px;border-radius:8px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${username}</span>
  `;
  return el;
}

// Helper to format distance
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

// Create a distance label element for the map with animated numbers
function createDistanceLabelElement(distance: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "distance-label";
  el.style.cssText = `
    color: black;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 16px;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    white-space: nowrap;
  `;
  
  const formatted = formatDistance(distance);
  el.innerHTML = `<span class="distance-value">0m</span>`;
  
  // Animate the number counting up
  const targetValue = distance;
  const duration = 1000;
  const steps = 30;
  const stepDuration = duration / steps;
  let currentStep = 0;
  
  const valueSpan = el.querySelector(".distance-value") as HTMLSpanElement;
  
  const interval = setInterval(() => {
    currentStep++;
    if (currentStep >= steps) {
      valueSpan.textContent = formatted;
      clearInterval(interval);
    } else {
      const progress = currentStep / steps;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(targetValue * easedProgress);
      valueSpan.textContent = formatDistance(currentValue);
    }
  }, stepDuration);
  
  return el;
}

// A small badge rendered above a pin to label what it represents.
function pinLabelMarkup(label: string, color: string): string {
  return `<span style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);text-transform:uppercase;letter-spacing:0.04em;font-family:ui-monospace,monospace;">${label}</span>`;
}

// Helper to create the red guess pin marker element. With a label, the badge
// sits above the pin (the element is bottom-anchored so the tip stays on point).
function createGuessPinElement(label?: string): HTMLDivElement {
  const pinSvg = `
    <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.716 0 0 6.716 0 15c0 10.969 13.5 24.062 14.063 24.625a1.406 1.406 0 0 0 1.874 0C16.5 39.062 30 25.969 30 15 30 6.716 23.284 0 15 0z" fill="#ef4444"/>
      <circle cx="15" cy="14" r="6" fill="white"/>
    </svg>
  `;
  const el = document.createElement("div");
  if (!label) {
    el.style.cssText = "width: 30px; height: 40px; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));";
    el.innerHTML = pinSvg;
    return el;
  }
  el.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));";
  el.innerHTML = `${pinLabelMarkup(label, "#ef4444")}${pinSvg}`;
  return el;
}

// Helper to create the green actual location marker element.
function createActualPinElement(label?: string): HTMLDivElement {
  const pinSvg = `
    <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15 0C6.716 0 0 6.716 0 15c0 10.969 13.5 24.062 14.063 24.625a1.406 1.406 0 0 0 1.874 0C16.5 39.062 30 25.969 30 15 30 6.716 23.284 0 15 0z"
        fill="#16a34a"
      />
      <circle cx="15" cy="14" r="6" fill="white"/>
    </svg>
  `;
  const el = document.createElement("div");
  if (!label) {
    el.style.cssText =
      "width: 30px; height: 40px; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));";
    el.innerHTML = pinSvg;
    return el;
  }
  el.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));";
  el.innerHTML = `${pinLabelMarkup(label, "#16a34a")}${pinSvg}`;
  return el;
}


export default function GuessMap({
  onGuess,
  disabled = false,
  showResult = false,
  guessedLocation,
  actualLocation,
  isVisible = true,
  distanceMeters = null,
  onCursorMove,
  opponentCursors,
  university = null,
}: GuessMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Guess marker (red pin)
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Actual marker (green pin)
  const actualMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Distance label marker
  const distanceLabelRef = useRef<maplibregl.Marker | null>(null);

  // Line id
  const lineRef = useRef<string | null>(null);

  // Opponent ghost-cursor markers, keyed by player id
  const opponentMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // Keep the latest onCursorMove callback without re-initialising the map
  const onCursorMoveRef = useRef(onCursorMove);
  useEffect(() => {
    onCursorMoveRef.current = onCursorMove;
  }, [onCursorMove]);

  const [, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Campuses available for this university filter; the first is the start campus.
  const campusIds = useMemo(() => campusIdsForUniversity(university), [university]);
  const startCampusId = campusIds[0];

  // Which campus the map is currently framed on (drives the corner selector).
  const [campus, setCampus] = useState<CampusId>(startCampusId);

  // Reset the selection if the university filter changes.
  useEffect(() => {
    setCampus(startCampusId);
  }, [startCampusId]);

  // Fly the map to a campus and remember it.
  const flyToCampus = useCallback((target: CampusId) => {
    setCampus(target);
    const view = CAMPUSES[target].view;
    mapRef.current?.flyTo({ center: view.center, zoom: view.zoom, duration: 1200 });
  }, []);

  // Clear the guess marker
  const clearMarker = useCallback(() => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, []);

  const handleMapClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (disabled || showResult) return;

      const { lat, lng } = e.lngLat;
      setSelectedPosition({ lat, lng });

      // Remove old marker and create new one
      if (markerRef.current) {
        markerRef.current.remove();
      }

      if (mapRef.current) {
        markerRef.current = new maplibregl.Marker({
          element: createGuessPinElement(),
          anchor: "bottom",
        })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
      }

      onGuess(lat, lng);
    },
    [disabled, showResult, onGuess]
  );

  // Init map once
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      // Open on the starting campus for the selected university (mounted once).
      center: CAMPUSES[startCampusId].view.center,
      zoom: 15,
      interactive: true,
      dragRotate: false,
      attributionControl: false,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // The base style references POI sprite icons (e.g. "atm", "swimming_pool")
    // that aren't in the loaded sprite, which floods the console with
    // "styleimagemissing" warnings. Supply a transparent placeholder so those
    // symbols silently resolve instead.
    mapRef.current.on("styleimagemissing", (e) => {
      const map = mapRef.current;
      if (!map || map.hasImage(e.id)) return;
      map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });

    // Stream the local cursor position (throttled) when a consumer is listening.
    let lastCursorSent = 0;
    mapRef.current.on("mousemove", (e: maplibregl.MapMouseEvent) => {
      const cb = onCursorMoveRef.current;
      if (!cb) return;
      const now = performance.now();
      if (now - lastCursorSent < 120) return;
      lastCursorSent = now;
      cb(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current.on("load", () => {
      const map = mapRef.current;
      if (!map) return;

      // Insert 3D buildings before first symbol layer (labels)
      const layers = map.getStyle().layers ?? [];
      const labelLayers = layers.filter((layer) => layer.type === "symbol");
      const insertBeforeLayerId = labelLayers[0]?.id;

      // OpenMapTiles schema (OpenFreeMap): source "openmaptiles", building layer
      // exposes render_height / render_min_height instead of mapbox's height/min_height.
      map.addLayer(
        {
          id: "3d-buildings",
          source: "openmaptiles",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#ffffff",
            "fill-extrusion-height": ["get", "render_height"],
            "fill-extrusion-base": ["get", "render_min_height"],
            "fill-extrusion-opacity": 0.6,
          },
        },
        insertBeforeLayerId
      );
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Separate effect for click handler - ensures it updates when dependencies change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [handleMapClick]);

  /**
   * Render opponents' live cursors as ghost pointers, reconciling markers
   * against the latest positions and removing any that have gone away.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = opponentMarkersRef.current;
    const cursors = opponentCursors ?? [];
    const seen = new Set<string>();

    for (const c of cursors) {
      seen.add(c.playerId);
      const existing = markers.get(c.playerId);
      if (existing) {
        existing.setLngLat([c.lng, c.lat]);
      } else {
        const marker = new maplibregl.Marker({
          element: createOpponentCursorElement(c.username, colorForId(c.playerId)),
          anchor: "top-left",
        })
          .setLngLat([c.lng, c.lat])
          .addTo(map);
        markers.set(c.playerId, marker);
      }
    }

    // Drop markers for opponents no longer present.
    Array.from(markers.keys()).forEach((id) => {
      if (!seen.has(id)) {
        markers.get(id)?.remove();
        markers.delete(id);
      }
    });
  }, [opponentCursors]);

  // Clean up opponent markers on unmount.
  useEffect(() => {
    const markers = opponentMarkersRef.current;
    return () => {
      markers.forEach((m) => m.remove());
      markers.clear();
    };
  }, []);

  /**
   * Persistently highlight the campus buildings for the active university
   * filter (every campus that university owns, or all four when "all campuses")
   * using their real OSM footprints, drawn as exact polygon perimeters with a
   * gentle pulse.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const SOURCE_ID = "concordia-highlight";
    const FILL_ID = "concordia-highlight-fill";
    const OUTLINE_ID = "concordia-highlight-outline";
    const LABEL_SOURCE_ID = "concordia-highlight-labels";
    const LABEL_ID = "concordia-highlight-label";

    const ALL_BUILDINGS = campusIdsForUniversity(university).flatMap(
      (id) => CAMPUSES[id].buildings
    );

    let raf: number | null = null;

    const footprints: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: ALL_BUILDINGS.map((b) => ({
        type: "Feature",
        properties: { id: b.id },
        geometry: { type: "Polygon", coordinates: [b.footprint] },
      })),
    };

    const labels: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: ALL_BUILDINGS.map((b) => ({
        type: "Feature",
        properties: { label: b.label },
        geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
      })),
    };

    const init = () => {
      if (mapRef.current !== map || map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, { type: "geojson", data: footprints });
      map.addLayer({
        id: FILL_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: { "fill-color": "#f97316", "fill-opacity": 0.1 },
      });
      map.addLayer({
        id: OUTLINE_ID,
        type: "line",
        source: SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#fb923c", "line-width": 3 },
      });

      // Reuse a font stack the base style already loads — the glyph server only
      // serves the exact stacks the style references, so a custom one (e.g.
      // "Noto Sans Bold,Open Sans Bold") 404s and spams the console.
      const styleLayers = map.getStyle().layers ?? [];
      const fontLayer = styleLayers.find(
        (l) => l.type === "symbol" && (l.layout as any)?.["text-font"]
      );
      const textFont = (fontLayer?.layout as any)?.["text-font"] ?? ["Noto Sans Regular"];

      map.addSource(LABEL_SOURCE_ID, { type: "geojson", data: labels });
      map.addLayer({
        id: LABEL_ID,
        type: "symbol",
        source: LABEL_SOURCE_ID,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 14,
          "text-font": textFont,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#c2410c",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      const start = performance.now();
      const animate = (t: number) => {
        if (mapRef.current !== map || !map.getLayer(OUTLINE_ID)) return;
        // Slower pulse (lower angular frequency) and gentler opacities.
        const pulse = 0.5 + 0.5 * Math.sin(((t - start) / 1000) * 1.2);
        map.setPaintProperty(OUTLINE_ID, "line-width", 2 + pulse * 1.5);
        map.setPaintProperty(OUTLINE_ID, "line-opacity", 0.3 + pulse * 0.2);
        map.setPaintProperty(FILL_ID, "fill-opacity", 0.05 + pulse * 0.07);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);
    };

    if (map.isStyleLoaded()) init();
    else map.once("load", init);

    return () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      // Bail if the map has been torn down (its style is gone after remove()).
      if (mapRef.current !== map || !map.getStyle()) return;
      if (map.getLayer(LABEL_ID)) map.removeLayer(LABEL_ID);
      if (map.getLayer(OUTLINE_ID)) map.removeLayer(OUTLINE_ID);
      if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID);
      if (map.getSource(LABEL_SOURCE_ID)) map.removeSource(LABEL_SOURCE_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [university]);

  /**
   * Ensure markers exist/update when result mode is shown.
   */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // --- Ensure GUESS marker is present when we have a guessed location ---
    if (guessedLocation) {
      // Remove and recreate to ensure visibility
      if (markerRef.current) {
        markerRef.current.remove();
      }
      // Label the guess only in result mode (a labelled pin while still placing
      // markers would be noisy and shift on every click).
      markerRef.current = new maplibregl.Marker({
        element: createGuessPinElement(showResult ? "Your Guess" : undefined),
        anchor: "bottom",
      })
        .setLngLat([guessedLocation.lng, guessedLocation.lat])
        .addTo(map);
    }

    // --- Actual marker only in RESULT mode ---
    if (showResult && actualLocation) {
      // Remove and recreate to ensure visibility
      if (actualMarkerRef.current) {
        actualMarkerRef.current.remove();
      }
      actualMarkerRef.current = new maplibregl.Marker({
        element: createActualPinElement("Actual Location"),
        anchor: "bottom",
      })
        .setLngLat([actualLocation.lng, actualLocation.lat])
        .addTo(map);
    }
    // Depend on primitive coords so streaming props (e.g. opponent cursors)
    // re-rendering the parent doesn't keep recreating these markers.
  }, [
    showResult,
    guessedLocation?.lat,
    guessedLocation?.lng,
    actualLocation?.lat,
    actualLocation?.lng,
  ]);

  /**
   * Draw line + add distance label + fit bounds when result is shown and both points exist
   */
  useEffect(() => {
    if (!mapRef.current || !showResult || !guessedLocation || !actualLocation) return;

    const map = mapRef.current;

    const addLineAndLabel = () => {
      // Cleanup old line if any
      if (lineRef.current && map.getSource(lineRef.current)) {
        if (map.getLayer(lineRef.current)) map.removeLayer(lineRef.current);
        map.removeSource(lineRef.current);
      }

      const sourceId = `line-${Date.now()}`;
      lineRef.current = sourceId;

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [guessedLocation.lng, guessedLocation.lat],
              [actualLocation.lng, actualLocation.lat],
            ],
          },
        },
      });

      map.addLayer({
        id: sourceId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#6366f1",
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      });

      // Add distance label BEFORE fitBounds so it's in position during animation
      if (distanceMeters !== null) {
        const midLng = (guessedLocation.lng + actualLocation.lng) / 2;
        const midLat = (guessedLocation.lat + actualLocation.lat) / 2;

        // Remove old label if exists
        if (distanceLabelRef.current) {
          distanceLabelRef.current.remove();
          distanceLabelRef.current = null;
        }

        distanceLabelRef.current = new maplibregl.Marker({
          element: createDistanceLabelElement(distanceMeters),
          anchor: "center",
        })
          .setLngLat([midLng, midLat])
          .addTo(map);
      }

      // Fit bounds to show both markers (happens after label is added)
      const bounds = new maplibregl.LngLatBounds()
        .extend([guessedLocation.lng, guessedLocation.lat])
        .extend([actualLocation.lng, actualLocation.lat]);

      map.fitBounds(bounds, { padding: 80, maxZoom: 17 });
    };

    if (map.isStyleLoaded()) addLineAndLabel();
    else map.once("load", addLineAndLabel);
    // Primitive deps: avoids re-running (and re-animating the distance) on every
    // parent re-render caused by streaming props.
  }, [
    showResult,
    guessedLocation?.lat,
    guessedLocation?.lng,
    actualLocation?.lat,
    actualLocation?.lng,
    distanceMeters,
  ]);


  /**
   * Cleanup result markers + line when leaving result mode with smooth animation
   */
  useEffect(() => {
    if (showResult) return;

    // Remove distance label
    if (distanceLabelRef.current) {
      distanceLabelRef.current.remove();
      distanceLabelRef.current = null;
    }

    // Remove actual marker
    actualMarkerRef.current?.remove();
    actualMarkerRef.current = null;

    // Remove line
    if (mapRef.current && lineRef.current) {
      try {
        if (mapRef.current.getLayer(lineRef.current)) {
          mapRef.current.removeLayer(lineRef.current);
        }
        if (mapRef.current.getSource(lineRef.current)) {
          mapRef.current.removeSource(lineRef.current);
        }
      } catch {
        // ignore
      }
      lineRef.current = null;
    }
  }, [showResult]);

  /**
   * Reset guess marker when new round starts (disabled becomes false) and not result mode.
   */
  useEffect(() => {
    if (!disabled && !showResult) {
      clearMarker();
      setSelectedPosition(null);
      setCampus(startCampusId);

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: CAMPUSES[startCampusId].view.center,
          zoom: 17,
          duration: 1000,
        });
      }
    }
  }, [disabled, showResult, clearMarker, startCampusId]);

  /**
   * Resize map when visibility changes (fixes rendering issues during animations)
   */
  useEffect(() => {
    if (isVisible && mapRef.current) {
      const timers = [100, 300, 500, 600].map((delay) =>
        setTimeout(() => mapRef.current?.resize(), delay)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [isVisible]);

  // The other campus to jump to in single-university toggle mode.
  const otherCampusId = campusIds.find((id) => id !== campus) ?? startCampusId;

  const campusPinIcon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200">
      <div ref={containerRef} className="w-full h-full" />

      {/*
        Campus selector (top-left): a two-campus toggle when a single university
        is selected, or a dropdown of every campus in "all campuses" mode.
      */}
      <div className="absolute top-3 left-3 z-20">
        {university === null ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-white/95 pl-2.5 pr-1.5 py-2 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-slate-200 backdrop-blur">
            {campusPinIcon}
            <select
              value={campus}
              onChange={(e) => flyToCampus(e.target.value as CampusId)}
              aria-label="Jump to campus"
              className="cursor-pointer bg-transparent pr-1 font-semibold text-slate-700 focus:outline-none"
            >
              {campusIds.map((id) => (
                <option key={id} value={id}>
                  {CAMPUSES[id].name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => flyToCampus(otherCampusId)}
            title={`Jump to ${CAMPUSES[otherCampusId].shortLabel} campus`}
            className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-slate-200 backdrop-blur transition hover:bg-white hover:text-slate-900"
          >
            {campusPinIcon}
            Go to {CAMPUSES[otherCampusId].shortLabel}
          </button>
        )}
      </div>

      {disabled && !showResult && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <span className="text-white font-semibold bg-black/50 px-4 py-2 rounded-lg">
            Waiting...
          </span>
        </div>
      )}
    </div>
  );
}