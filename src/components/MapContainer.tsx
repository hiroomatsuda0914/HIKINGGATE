// Mapbox GL で地図を描画し、GeoJSON + circle レイヤーで現在地・登山口・山頂を表示する。
// スタイル読み込み後はまず現在地＋山頂のみ描画し、Supabase の登山口取得後に GeoJSON を更新する。
// クリックでサイドバーなど — ブラウザ専用（dynamic + ssr:false からマウントされる想定）。
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useUserLocation } from '../lib/hooks/useUserLocation';
import { MAP_INITIAL_ZOOM } from '../lib/constants/mapStyles';
import {
  buildHikingPointsFeatureCollection,
  type SummitRow,
} from '../lib/map/hikingPointsFeatureCollections';
import { fetchTrailhead, type Trailhead } from '../lib/queries/trailheads';
import { fetchSummits, type Summit } from '../lib/queries/summits';

const SOURCE_ID = 'hiking-points';
const LAYER_ID = 'hiking-circles';

type SidebarSelection = {
  kind: 'trailhead' | 'summit';
  id: string;
  nameJa: string;
};

export default function MapContainer() {
  const { userLocation, loading } = useUserLocation();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selection, setSelection] = useState<SidebarSelection | null>(null);
  /** null = Supabase からの取得前。取得完了後は配列（0 件可） */
  const [trailheads, setTrailheads] = useState<Trailhead[] | null>(null);
  const [summits, setSummits] = useState<SummitRow[] | null>(null);
  const trailheadsRef = useRef<Trailhead[] | null>(null);
  const summitsRef = useRef<SummitRow[] | null>(null);


  trailheadsRef.current = trailheads;
  summitsRef.current = summits;

  const openSidebar = useCallback((next: SidebarSelection) => {
    setSidebarOpen(true);
    setSelection(next);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelection(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTrailhead()
      .then((rows) => {
        if (!cancelled) setTrailheads(rows);
      })
      .catch(() => {
        if (!cancelled) setTrailheads([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

    useEffect(() => {
    let cancelled = false;
    fetchSummits()
      .then((rows) => {
        if (!cancelled) setSummits(rows);
      })
      .catch(() => {
        if (!cancelled) setSummits([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    mapInstanceRef.current?.resize();
  }, [sidebarOpen]);

  useEffect(() => {
    if (!userLocation || !mapElementRef.current || mapInstanceRef.current) {
      return;
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.warn('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set');
      return;
    }
    mapboxgl.accessToken = token;

    let cancelled = false;

    const map = new mapboxgl.Map({
      container: mapElementRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: userLocation,
      zoom: MAP_INITIAL_ZOOM,
    });
    mapInstanceRef.current = map;

    const onClickCircles = (e: mapboxgl.MapMouseEvent) => {
      const f = e.features?.[0];
      if (!f?.properties) return;
      const kind = f.properties.kind as string;
      const id = f.properties.id as string;
      const nameJa = f.properties.nameJa as string;
      if (kind === 'trailhead' || kind === 'summit') {
        openSidebar({ kind, id, nameJa });
      }
    };

    const onMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    const setup = () => {
      if (cancelled || !mapInstanceRef.current) return;

      map.setProjection(null);
      map.setFog(null);

      // 先に現在地＋山頂のみ（登山口は取得完了後に setData で反映）
      const data = buildHikingPointsFeatureCollection(
        userLocation,
        [],
        summitsRef.current ?? [],
      );

      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data,
      });

      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'match',
            ['get', 'kind'],
            'user',
            10,
            'trailhead',
            9,
            'summit',
            9,
            8,
          ],
          'circle-color': [
            'match',
            ['get', 'kind'],
            'user',
            '#2563eb',
            'trailhead',
            '#16a34a',
            'summit',
            '#dc2626',
            '#888888',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.on('click', LAYER_ID, onClickCircles);
      map.on('mouseenter', LAYER_ID, onMouseEnter);
      map.on('mouseleave', LAYER_ID, onMouseLeave);

      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      const th = trailheadsRef.current ?? [];
      const sm = summitsRef.current ?? [];
      src.setData(
        buildHikingPointsFeatureCollection(userLocation, th, sm),
      );



      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(userLocation);
      th.forEach((t) => bounds.extend(t.lngLat));
      sm.forEach((s) => bounds.extend(s.lngLat));
      map.fitBounds(bounds, { padding: 40 });
    };

    map.once('load', setup);
    return () => {
      cancelled = true;
      map.off('click', LAYER_ID, onClickCircles);
      map.off('mouseenter', LAYER_ID, onMouseEnter);
      map.off('mouseleave', LAYER_ID, onMouseLeave);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation, openSidebar]);

  // Supabase 取得完了後に登山口を含めた GeoJSON へ更新（地図は既に表示済み）
  useEffect(() => {
    if (trailheads === null || !userLocation) return;
    const map = mapInstanceRef.current;
    const src = map?.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!map || !src) return;

    src.setData(
      buildHikingPointsFeatureCollection(userLocation, trailheads, summitsRef.current ?? []),
    );

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(userLocation);
    trailheads.forEach((t) => bounds.extend(t.lngLat));
    (summitsRef.current ?? []).forEach((s) => bounds.extend(s.lngLat));
    map.fitBounds(bounds, { padding: 40 });
  }, [trailheads, userLocation]);

  // Supabase 取得完了後に山頂を含めた GeoJSON へ更新（地図は既に表示済み）
  useEffect(() => {
    if (summits === null || !userLocation) return;
    const map = mapInstanceRef.current;
    const src = map?.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!map || !src) return;

    src.setData(
      buildHikingPointsFeatureCollection(userLocation, trailheadsRef.current ?? [], summits),
    );

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(userLocation);
    (trailheadsRef.current ?? []).forEach((t) => bounds.extend(t.lngLat));
    summits.forEach((s) => bounds.extend(s.lngLat));
    map.fitBounds(bounds, { padding: 40 });
  }, [summits, userLocation]);



  if (loading || !userLocation) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {sidebarOpen && selection && (
        <aside className="absolute right-0 top-0 bottom-0 z-[9999] w-80 border-r bg-white/95 p-4 text-gray-900 shadow-lg backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">AIチャット</div>
            <button
              type="button"
              onClick={closeSidebar}
              className="text-gray-600 hover:text-gray-900"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
          <div className="mb-3 text-xs text-gray-600">選択: {selection.nameJa}</div>
          <div className="text-sm text-gray-400">ここにAIとの会話UIが入ります</div>
        </aside>
      )}
      <div ref={mapElementRef} className="h-full w-full" />
    </div>
  );
}
