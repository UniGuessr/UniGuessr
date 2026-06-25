"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type GuessMapProps = {
  onGuess: (lat: number, lng: number) => void;
  disabled?: boolean;
  showResult?: boolean;
  guessedLocation?: { lat: number; lng: number } | null;
  actualLocation?: { lat: number; lng: number; name: string } | null;
  isVisible?: boolean;
  distanceMeters?: number | null;
};

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

// Helper to create the green actual location marker element
function createActualPinElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText =
    "width: 30px; height: 40px; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));";

  el.innerHTML = `
    <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15 0C6.716 0 0 6.716 0 15c0 10.969 13.5 24.062 14.063 24.625a1.406 1.406 0 0 0 1.874 0C16.5 39.062 30 25.969 30 15 30 6.716 23.284 0 15 0z"
        fill="#16a34a"
      />
      <circle cx="15" cy="14" r="6" fill="white"/>
    </svg>
  `;
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

  const [, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);

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
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [-73.57806418862965, 45.49554505697914], // Centered coordinate
      zoom: 15,
      interactive: true,
      dragRotate: false,
      attributionControl: false,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

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
      markerRef.current = new maplibregl.Marker({
        element: createGuessPinElement(),
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
        element: createActualPinElement(),
        anchor: "bottom",
      })
        .setLngLat([actualLocation.lng, actualLocation.lat])
        .addTo(map);
    }
  }, [showResult, guessedLocation, actualLocation]);

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
  }, [showResult, guessedLocation, actualLocation, distanceMeters]);


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

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [-73.57806418862965, 45.49554505697914],
          zoom: 17,
          duration: 1000,
        });
      }
    }
  }, [disabled, showResult, clearMarker]);

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

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200">
      <div ref={containerRef} className="w-full h-full" />

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