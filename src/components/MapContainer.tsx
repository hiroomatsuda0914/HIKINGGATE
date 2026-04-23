// Mapbox GL で地図を描画し、GeoJSON + circle レイヤーで現在地・登山口・山頂を表示する。
// 初期表示は現在地 zoom13 から zoom8 へアニメーション縮小し、ビューポート内のデータを Supabase から取得する。
// クリックでサイドバーなど — ブラウザ専用（dynamic + ssr:false からマウントされる想定）。
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useUserLocation } from '../lib/hooks/useUserLocation';
import { MAP_INITIAL_ZOOM } from '../lib/constants/mapStyles';
import { buildHikingPointsFeatureCollection } from '../lib/map/hikingPointsFeatureCollections';
import { fetchTrailhead } from '../lib/queries/trailheads';
import { fetchSummits } from '../lib/queries/summits';
import AiChat from './AiChat';

const SOURCE_ID = 'hiking-points';
const LAYER_ID = 'hiking-circles';
const SUMMIT_LAYER_ID = 'summit-symbols';
const TRAILHEAD_LAYER_ID = 'trailhead-symbols';

function createSummitImageData(size: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const s = size / 100;
  const gradient = ctx.createLinearGradient(0, 75 * s, 0, 20 * s);
  gradient.addColorStop(0, '#16a34a');
  gradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = gradient;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 12 * s;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(50 * s, 20 * s);
  ctx.lineTo(18 * s, 75 * s);
  ctx.lineTo(82 * s, 75 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

function createTrailheadImageData(size: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const s = size / 100;
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 8 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(50 * s, 50 * s, 40 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(35 * s, 55 * s);
  ctx.lineTo(50 * s, 40 * s);
  ctx.lineTo(65 * s, 55 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(50 * s, 40 * s);
  ctx.lineTo(50 * s, 65 * s);
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

type SidebarSelection = {
  kind: 'trailhead' | 'summit' | 'hut-rag';
  id: string;
  nameJa: string;
};

export default function MapContainer() {
  const { userLocation, loading } = useUserLocation();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selection, setSelection] = useState<SidebarSelection | null>(null);

  const openSidebar = useCallback((next: SidebarSelection) => {
    setSidebarOpen(true);
    setSelection(next);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelection(null);
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

      const data = buildHikingPointsFeatureCollection(userLocation, [], []);

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
        filter: ['==', ['get', 'kind'], 'user'],
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

      map.addLayer({
        id: SUMMIT_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['==', ['get', 'kind'], 'summit'],
        layout: {
          'icon-image': 'summit-icon',
          'icon-size': 0.6,
          'text-field': [
            'case',
            ['==', ['get', 'meizanRank'], 100], '100',
            ['==', ['get', 'meizanRank'], 200], '200',
            ['==', ['get', 'meizanRank'], 300], '300',
            '',
          ],
          'text-anchor': 'center',
          'text-offset': [0, 0.35],
          'text-size': 10,
          'icon-allow-overlap': true,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      map.addLayer({
        id: TRAILHEAD_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['==', ['get', 'kind'], 'trailhead'],
        layout: {
          'icon-image': 'trailhead-icon',
          'icon-size': 0.6,
          'icon-allow-overlap': true,
        },
      });

      map.on('click', LAYER_ID, onClickCircles);
      map.on('click', SUMMIT_LAYER_ID, onClickCircles);
      map.on('click', TRAILHEAD_LAYER_ID, onClickCircles);
      map.on('mouseenter', LAYER_ID, onMouseEnter);
      map.on('mouseenter', TRAILHEAD_LAYER_ID, onMouseEnter);
      map.on('mouseleave', LAYER_ID, onMouseLeave);
      map.on('mouseleave', TRAILHEAD_LAYER_ID, onMouseLeave);
    };

    const loadData = async () => {
      if (cancelled || !mapInstanceRef.current) return;
      const b = mapInstanceRef.current.getBounds();
      if (!b) return;
      const bounds = {
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      };
      const [th, sm] = await Promise.all([
        fetchTrailhead(bounds),
        fetchSummits(bounds),
      ]);
      const src = mapInstanceRef.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      src?.setData(
        buildHikingPointsFeatureCollection(userLocation, th, sm),
      );
    };

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    map.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 300, unit: 'metric' }),
      'bottom-left'
    );

    map.once('load', () => {
      if (!map.hasImage('summit-icon')) {
        map.addImage('summit-icon', createSummitImageData(60));
      }
      if (!map.hasImage('trailhead-icon')) {
        map.addImage('trailhead-icon', createTrailheadImageData(60));
      }
      setup();
      setTimeout(() => {
        map.easeTo({ zoom: 8, duration: 2000 });
      }, 800);
    });

    const onMoveEnd = () => {
      if (map.getZoom() < 6) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadData, 500);
    };

    map.on('moveend', onMoveEnd);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      cancelled = true;
      map.off('click', LAYER_ID, onClickCircles);
      map.off('click', SUMMIT_LAYER_ID, onClickCircles);
      map.off('click', TRAILHEAD_LAYER_ID, onClickCircles);
      map.off('mouseenter', LAYER_ID, onMouseEnter);
      map.off('mouseenter', TRAILHEAD_LAYER_ID, onMouseEnter);
      map.off('mouseleave', LAYER_ID, onMouseLeave);
      map.off('mouseleave', TRAILHEAD_LAYER_ID, onMouseLeave);
      map.off('moveend', onMoveEnd);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation, openSidebar]);

  if (loading || !userLocation) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      <button
        type="button"
        onClick={() => openSidebar({ kind: 'hut-rag', id: 'hut-rag', nameJa: '山小屋2026' })}
        className="absolute left-4 top-4 z-[9999] rounded bg-white px-3 py-2 text-sm font-semibold shadow-md hover:bg-gray-100"
      >
        2026年の山小屋情報をAIと調べる！
      </button>
      {sidebarOpen && selection && (
        <aside className="absolute right-0 top-0 bottom-0 z-[9999] w-80 border-r bg-white/95 p-4 text-gray-900 shadow-lg backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">
              {selection.kind === 'hut-rag' ? '山小屋2026' : 'AIチャット'}
            </div>
            <button
              type="button"
              onClick={closeSidebar}
              className="text-gray-600 hover:text-gray-900"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
          {selection.kind === 'hut-rag' ? (
            <div className="text-sm text-gray-400">山小屋・テント場のRAG AIがここに入ります</div>
          ) : (
            <>
              <div className="mb-3 text-xs text-gray-600">選択: {selection.nameJa}</div>
              <AiChat kind={selection.kind} nameJa={selection.nameJa} />
            </>
          )}
        </aside>
      )}
      <div ref={mapElementRef} className="h-full w-full" />
    </div>
  );
}
