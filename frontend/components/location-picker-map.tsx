"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CAMPUSES, ALL_CAMPUS_IDS, type CampusId } from "@/config/buildings";

type LocationPickerMapProps = {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
};

// Helper to create the red guess pin marker element
function createGuessPinElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "width: 30px; height: 40px; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));";
  el.innerHTML = `
    <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.716 0 0 6.716 0 15c0 10.969 13.5 24.062 14.063 24.625a1.406 1.406 0 0 0 1.874 0C16.5 39.062 30 25.969 30 15 30 6.716 23.284 0 15 0z" fill="#ef4444"/>
      <circle cx="15" cy="14" r="6" fill="white"/>
    </svg>
  `;
  return el;
}

export default function LocationPickerMap({
  onLocationSelect,
  initialLat,
  initialLng,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const initRef = useRef(false);
  const onLocationSelectRef = useRef(onLocationSelect);

  // Campus the map is framed on; the dropdown flies between known campuses so
  // uploaders can quickly jump to the right area.
  const [campus, setCampus] = useState<CampusId>(ALL_CAMPUS_IDS[0]);

  const flyToCampus = (target: CampusId) => {
    setCampus(target);
    const view = CAMPUSES[target].view;
    mapRef.current?.flyTo({ center: view.center, zoom: view.zoom, duration: 1200 });
  };

  // Keep callback ref updated without triggering re-renders
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Initialize map ONCE - never re-render
  useEffect(() => {
    if (!containerRef.current || initRef.current) return;

    initRef.current = true;

    // Open on the same campus view the game uses (Concordia SGW by default).
    const startView = CAMPUSES[ALL_CAMPUS_IDS[0]].view;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: startView.center,
      zoom: startView.zoom,
      interactive: true,
      dragRotate: false,
      attributionControl: false,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // The base style references POI sprite icons that aren't in the loaded
    // sprite, flooding the console with "styleimagemissing" warnings. Supply a
    // transparent placeholder so those symbols silently resolve instead.
    mapRef.current.on("styleimagemissing", (e) => {
      const map = mapRef.current;
      if (!map || map.hasImage(e.id)) return;
      map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });

    // Handle map clicks
    mapRef.current.on("click", (e: maplibregl.MapMouseEvent) => {
      const { lat, lng } = e.lngLat;
      setSelectedPosition({ lat, lng });

      // Update or create draggable marker
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else if (mapRef.current) {
        markerRef.current = new maplibregl.Marker({ 
          element: createGuessPinElement(),
          anchor: "bottom",
          draggable: true 
        })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);

        // Update position when marker is dragged
        markerRef.current.on("dragend", () => {
          if (markerRef.current) {
            const lngLat = markerRef.current.getLngLat();
            setSelectedPosition({ lat: lngLat.lat, lng: lngLat.lng });
            onLocationSelectRef.current(lngLat.lat, lngLat.lng);
          }
        });
      }

      onLocationSelectRef.current(lat, lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      initRef.current = false;
    };
  }, []); // No dependencies - initialize only once

  /**
   * Persistently highlight every campus's buildings using their real OSM
   * footprints, drawn as exact polygon perimeters with a gentle pulse — same as
   * the game map, so uploaders can see exactly which buildings count.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const SOURCE_ID = "campus-highlight";
    const FILL_ID = "campus-highlight-fill";
    const OUTLINE_ID = "campus-highlight-outline";
    const LABEL_SOURCE_ID = "campus-highlight-labels";
    const LABEL_ID = "campus-highlight-label";

    const ALL_BUILDINGS = ALL_CAMPUS_IDS.flatMap((id) => CAMPUSES[id].buildings);

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
      // serves the exact stacks the style references, so a custom one would 404.
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
  }, []);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200">
      <div ref={containerRef} className="w-full h-full" />

      {/* Campus selector (top-left): jump the map to a known campus. */}
      <div className="absolute top-3 left-3 z-20">
        <div className="flex items-center gap-1.5 rounded-lg bg-white/95 pl-2.5 pr-1.5 py-2 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-slate-200 backdrop-blur">
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
          <select
            value={campus}
            onChange={(e) => flyToCampus(e.target.value as CampusId)}
            aria-label="Jump to campus"
            className="cursor-pointer bg-transparent pr-1 font-semibold text-slate-700 focus:outline-none"
          >
            {ALL_CAMPUS_IDS.map((id) => (
              <option key={id} value={id}>
                {CAMPUSES[id].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedPosition && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-lg text-sm font-medium text-slate-700">
          📍 Click on the map to select location
        </div>
      )}
    </div>
  );
}
