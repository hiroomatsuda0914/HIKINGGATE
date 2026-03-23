'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useUserLocation } from '../lib/hooks/useUserLocation';
import '../lib/constants/leaflet';
import { BASEMAP, MAP_INITIAL_ZOOM } from '../lib/constants/mapStyles';

type TrailheadId = string;

interface Trailhead {
  id: TrailheadId;
  nameJa: string;
  latLng: [number, number]
}

const TRAILHEADS: Trailhead[] = [
  {
    id: 'kamikochi',
    nameJa: '上高地',
    latLng: [36.2544, 137.6348],
  },
];

export default function MapContainer() {
  const { userLocation, loading } = useUserLocation();
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trailheadMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!userLocation || !mapElementRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapElementRef.current).setView(
      userLocation, 
      MAP_INITIAL_ZOOM);

    L.tileLayer(BASEMAP.urlTemplate, {
      attribution: BASEMAP.attribution,
    }).addTo(map);

    mapInstanceRef.current = map;

    userLocationMarkerRef.current?.remove();

    userLocationMarkerRef.current = L.marker(userLocation).addTo(map).bindPopup('あなたの現在地');

    trailheadMarkersRef.current.forEach((m) => m.remove());
    trailheadMarkersRef.current = [];

    for (const t of TRAILHEADS) {
      const marker = L.marker(t.latLng)
      marker.addTo(map);
      marker.bindPopup(t.nameJa);
      trailheadMarkersRef.current.push(marker)
    }

    const bounds = L.latLngBounds([userLocation, ...TRAILHEADS.map((t) => t.latLng)]);
    map.fitBounds(bounds, {padding: [40, 40]});

    return () => {
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      trailheadMarkersRef.current.forEach((m) => {
      m.remove();
    });
    trailheadMarkersRef.current = [];
    map.remove();
    mapInstanceRef.current = null;
  };
}, [userLocation]);


  if (loading || !userLocation) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p> Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <div ref={mapElementRef} className="w-full h-full" />
    </div>
  );
}