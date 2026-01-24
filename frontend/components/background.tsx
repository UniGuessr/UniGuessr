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
  zoom = 17,
  pitch = 45,
  bearing = 0,
}: BackgroundMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

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
      style: "mapbox://styles/mapbox/dark-v11", // background-friendly
      center,
      zoom,
      pitch,
      bearing,

      // keep it interactive
      interactive: true,
      dragRotate: true,
      touchZoomRotate: true,
      scrollZoom: true,

      // optional: make it feel "background-y"
      attributionControl: false,
    });

    // Optional: remove controls if you want a clean background
    // mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
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
    />
  );
}
