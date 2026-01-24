"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type GuessMapProps = {
  onGuess: (lat: number, lng: number) => void;
  disabled?: boolean;
  showResult?: boolean;
  guessedLocation?: { lat: number; lng: number } | null;
  actualLocation?: { lat: number; lng: number; name: string } | null;
};

export default function GuessMap({
  onGuess,
  disabled = false,
  showResult = false,
  guessedLocation,
  actualLocation,
}: GuessMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const actualMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const lineRef = useRef<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = useCallback(
    (e: mapboxgl.MapMouseEvent) => {
      if (disabled) return;

      const { lat, lng } = e.lngLat;
      setSelectedPosition({ lat, lng });

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else if (mapRef.current) {
        const el = document.createElement("div");
        el.className = "guess-marker";
        el.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: #ef4444;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          "></div>
        `;

        markerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
      }

      onGuess(lat, lng);
    },
    [disabled, onGuess]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }

    mapboxgl.accessToken = token;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-73.578417, 45.497083], // Concordia University
      zoom: 15,
      interactive: true,
      dragRotate: false,
      attributionControl: false,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    mapRef.current.on("click", handleMapClick);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [handleMapClick]);

  // Handle showing results
  useEffect(() => {
    if (!mapRef.current || !showResult) return;

    // Show actual location marker
    if (actualLocation && !actualMarkerRef.current) {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width: 28px;
          height: 28px;
          background: #22c55e;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;

      actualMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([actualLocation.lng, actualLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(actualLocation.name))
        .addTo(mapRef.current);

      actualMarkerRef.current.togglePopup();
    }

    // Draw line between guessed and actual locations
    if (guessedLocation && actualLocation && mapRef.current) {
      const map = mapRef.current;

      // Wait for style to load
      const addLine = () => {
        if (lineRef.current && map.getSource(lineRef.current)) {
          map.removeLayer(lineRef.current);
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

        // Fit bounds to show both markers
        const bounds = new mapboxgl.LngLatBounds()
          .extend([guessedLocation.lng, guessedLocation.lat])
          .extend([actualLocation.lng, actualLocation.lat]);

        map.fitBounds(bounds, { padding: 80, maxZoom: 17 });
      };

      if (map.isStyleLoaded()) {
        addLine();
      } else {
        map.on("load", addLine);
      }
    }
  }, [showResult, guessedLocation, actualLocation]);

  // Cleanup result markers when result changes
  useEffect(() => {
    if (!showResult) {
      actualMarkerRef.current?.remove();
      actualMarkerRef.current = null;

      if (mapRef.current && lineRef.current) {
        try {
          if (mapRef.current.getLayer(lineRef.current)) {
            mapRef.current.removeLayer(lineRef.current);
          }
          if (mapRef.current.getSource(lineRef.current)) {
            mapRef.current.removeSource(lineRef.current);
          }
        } catch {
          // Ignore errors during cleanup
        }
        lineRef.current = null;
      }
    }
  }, [showResult]);

  // Reset marker when disabled changes to false (new round)
  useEffect(() => {
    if (!disabled && !showResult) {
      markerRef.current?.remove();
      markerRef.current = null;
      setSelectedPosition(null);

      // Reset map view
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [-73.578417, 45.497083],
          zoom: 15,
          duration: 1000,
        });
      }
    }
  }, [disabled, showResult]);

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
      {!disabled && !selectedPosition && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-lg text-sm font-medium text-slate-700">
          Click on the map to place your guess
        </div>
      )}
    </div>
  );
}
