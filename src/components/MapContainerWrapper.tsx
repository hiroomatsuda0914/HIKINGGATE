'use client';

import dynamic from 'next/dynamic';

const MapContainer = dynamic(
  () => import('./MapContainer').then((mod) => mod.default),
  { ssr: false }
);

export default function MapContainerWrapper() {
  return <MapContainer />;
}