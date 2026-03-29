'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useUserLocation } from '../lib/hooks/useUserLocation';
import '../lib/constants/leaflet';
import { BASEMAP, HILLSHADE, MAP_INITIAL_ZOOM } from '../lib/constants/mapStyles';

type TrailheadId = string;
type SummitId = string;

interface Trailhead {
  id: TrailheadId;
  nameJa: string;
  nameEn: string;
  latLng: [number, number];
}

interface Summit {
  id: SummitId;
  nameJa: string;
  latLng: [number, number]
}

const TRAILHEADS: Trailhead[] = [
  {
    id: 'kamikochi',
    nameJa: '上高地',
    nameEn: 'Kamikochi - trailhead',
    latLng: [36.2496, 137.6394],
  },
];

const SUMMITS: Summit[] = [
  {
    id: 'yarigatake',
    nameJa: '槍ヶ岳',
    latLng: [36.3414, 137.6476],
  }
]

function createPinIcon(kind: 'trailhead' | 'summit'){
  const color = kind === 'trailhead' ? '#16a34a' : '#dc2626';
  const label = kind === 'trailhead' ? '登山口' : '山頂';

  return L.divIcon({
    className: 'custom-pin-icon',
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
    tooltipAnchor: [0, -10],
  });
}

export default function MapContainer() {
  const { userLocation, loading } = useUserLocation();
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trailheadMarkersRef = useRef<L.Marker[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selection, setSelection] = useState<SidebarSelection | null>(null);

  type SidebarSelection = {
    kind: 'trailhead' | 'summit';
    id: string;
    nameJa: string;
  };

  function openSidebar(next: SidebarSelection) {
    console.log('openSidebar', next);
    setSidebarOpen(true);
    setSelection(next);
  }

  function closeSidebar(){
    setSidebarOpen(false);
    setSelection(null);
  }

  useEffect(() => {
    mapInstanceRef.current?.invalidateSize();
  }, [sidebarOpen]);

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

    L.tileLayer(HILLSHADE.urlTemplate, {
      attribution: HILLSHADE.attribution,
      opacity: HILLSHADE.opacity,
      maxZoom: HILLSHADE.maxZoom,
      maxNativeZoom: HILLSHADE.maxNativeZoom,
    }).addTo(map);

    mapInstanceRef.current = map;

    userLocationMarkerRef.current?.remove();

    userLocationMarkerRef.current = L.marker(userLocation).addTo(map).bindPopup('あなたの現在地');

    trailheadMarkersRef.current.forEach((m) => m.remove());
    trailheadMarkersRef.current = [];

    for (const t of TRAILHEADS) {
      const marker = L.marker(t.latLng, { icon: createPinIcon('trailhead') });
      marker.addTo(map);
      marker.bindTooltip(t.nameEn, {
        permanent: true,
        direction: 'top',
      });
      marker.bindPopup(t.nameJa);
      marker.on('click', () => {
        openSidebar({ kind: 'trailhead', id: t.id, nameJa: t.nameJa });
      });


      trailheadMarkersRef.current.push(marker);
    }

    for (const s of SUMMITS) {
      const marker = L.marker(s.latLng, { icon: createPinIcon('summit') });
      marker.addTo(map);
      marker.bindPopup(s.nameJa);
      
      marker.on('click', () => {
        openSidebar({ kind: 'summit', id: s.id, nameJa: s.nameJa });
      });
      trailheadMarkersRef.current.push(marker);
    }

    const bounds = L.latLngBounds([
      userLocation,
      ...TRAILHEADS.map((t) => t.latLng),
      ...SUMMITS.map((s) => s.latLng),
    ]);
    map.fitBounds(bounds, { padding: [40, 40] });

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
    <div className="w-full h-screen relative">
    {sidebarOpen && selection && (
      <aside className="absolute right-0 top-0 bottom-0 w-80 bg-white/95 text-gray-900 backdrop-blur border-r shadow-lg z-[9999] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">AIチャット</div>
          <button
            onClick={closeSidebar}
            className="text-gray-600 hover:text-gray-900"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className="text-xs text-gray-600 mb-3">
          選択: {selection.nameJa}
        </div>
        <div className="text-sm text-gray-400">
          ここにAIとの会話UIが入ります（空白）
        </div>
      </aside>
    )}
    <div ref={mapElementRef} className="w-full h-full" />
  </div>
  );
}