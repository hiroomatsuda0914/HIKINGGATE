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

    trailheadMarkersRef.current.forEach((m) => m.remove());
    trailheadMarkersRef.current = [];

    for (const t of TRAILHEADS) {
      const marker = L.marker(t.latLng)
      marker.addTo(map);
      marker.bindPopup(t.nameJa);
      trailheadMarkersRef.current.push(marker)
    }

    return () => {
      trailheadMarkersRef.current.forEach((m) => {
      m.remove();
    });
    trailheadMarkersRef.current = [];
    map.remove();
    mapInstanceRef.current = null;
  };
}, [userLocation]);

useEffect(() => {
  // まだ地図がない（1つ目が走る前など）は何もしない
  if (!userLocation || !mapInstanceRef.current) {
    return;
  }

  mapInstanceRef.current.setView(userLocation, 13);
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