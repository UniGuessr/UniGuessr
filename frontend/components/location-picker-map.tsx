"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const initRef = useRef(false);
  const onLocationSelectRef = useRef(onLocationSelect);

  // Keep callback ref updated without triggering re-renders
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Initialize map ONCE - never re-render
  useEffect(() => {
    if (!containerRef.current || initRef.current) return;

    initRef.current = true;

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

    // Handle map clicks
    mapRef.current.on("click", (e: mapboxgl.MapMouseEvent) => {
      const { lat, lng } = e.lngLat;
      setSelectedPosition({ lat, lng });

      // Update or create draggable marker
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else if (mapRef.current) {
        markerRef.current = new mapboxgl.Marker({ 
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

  return (
    <div className="space-y-3">
      <div className="relative w-full h-[800px] rounded-xl overflow-hidden shadow-lg border-2 border-slate-200">
        <div ref={containerRef} className="w-full h-full" />
        {!selectedPosition && (
          <div className="absolute bottom-27 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-lg text-sm font-medium text-slate-700">
            📍 Click on the map to select location
          </div>
        )}
        {selectedPosition && (
          <div className="absolute bottom-27 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur px-4 py-2 rounded-full shadow-lg text-sm font-medium text-white">
            📍 Drag the marker to adjust position
          </div>
        )}
      </div>
      
      {selectedPosition && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700 mb-1">Selected Coordinates</p>
              <div className="flex gap-4 text-sm text-blue-900">
                <span>
                  <strong>Lat:</strong> {selectedPosition.lat.toFixed(6)}
                </span>
                <span>
                  <strong>Lng:</strong> {selectedPosition.lng.toFixed(6)}
                </span>
              </div>
            </div>
            <div className="text-2xl">✓</div>
          </div>
        </div>
      )}
    </div>
  );
}
