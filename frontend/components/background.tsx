"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type BackgroundMapProps = {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
};

export default function BackgroundMap({
  center = [-73.578417, 45.497083], // Concordia University default
  zoom = 16,
  pitch = 60,
  bearing = -10,
}: BackgroundMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }
    mapboxgl.accessToken = token;

    // If map already exists, just update camera + marker position
    if (mapRef.current) {
      mapRef.current.easeTo({ center, zoom, pitch, bearing, duration: 900 });
      markerRef.current?.setLngLat(center);
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom,
      pitch,
      bearing,
      interactive: true,
      dragRotate: true,
      touchZoomRotate: true,
      scrollZoom: true,
      dragPan: true,
      keyboard: true,
      doubleClickZoom: true,
      antialias: true,
      attributionControl: false,
    });

    mapRef.current = map;

    // Sleek yellow pin (custom DOM element)
    const el = document.createElement("div");
    el.setAttribute("aria-label", "Concordia location");
    el.style.width = "14px";
    el.style.height = "14px";
    el.style.borderRadius = "999px";
    el.style.background = "#FACC15"; // yellow-400
    el.style.boxShadow =
      "0 0 0 6px rgba(250, 204, 21, 0.18), 0 10px 24px rgba(0,0,0,0.45)";
    el.style.border = "1px solid rgba(255,255,255,0.35)";
    el.style.transform = "translateZ(0)";
    el.style.cursor = "default";

    // Optional subtle pulse ring (still minimal)
    el.style.position = "relative";
    const pulse = document.createElement("span");
    pulse.style.position = "absolute";
    pulse.style.inset = "-10px";
    pulse.style.borderRadius = "999px";
    pulse.style.border = "1px solid rgba(250, 204, 21, 0.35)";
    pulse.style.animation = "pinPulse 2.2s ease-out infinite";
    el.appendChild(pulse);

    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat(center)
      .addTo(map);

    markerRef.current = marker;

    // Minimal CSS for pulse (scoped via injected style)
    const styleTag = document.createElement("style");
    styleTag.textContent = `
      @keyframes pinPulse {
        0%   { transform: scale(0.55); opacity: 0.9; }
        70%  { transform: scale(1); opacity: 0; }
        100% { transform: scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(styleTag);

    map.on("load", () => {
      // Optional: keep it very sleek by removing extra label clutter (comment out if you want labels)
      // map.setConfigProperty?.("basemap", "showPlaceLabels", false);
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      styleTag.remove();
    };
  }, [center, zoom, pitch, bearing]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
      }}
      className="transition-all duration-300"
    />
  );
}
