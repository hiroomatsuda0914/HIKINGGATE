// 地図本体をクライアント専用で遅延読み込みする薄いラッパー。
// dynamic(..., { ssr: false }) で Mapbox をサーバー実行から避ける。
'use client';

import dynamic from 'next/dynamic';

const MapContainer = dynamic(
  () => import('./MapContainer').then((mod) => mod.default),
  { ssr: false }
);

export default function MapContainerWrapper() {
  return <MapContainer />;
}