'use client';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

/** Next の画像 import は string または { src: string } になりうる */
function assetUrl(asset: string | { src: string }): string {
  return typeof asset === 'string' ? asset : asset.src;
}

export const DefaultIcon = L.icon({
  iconUrl: assetUrl(icon),
  shadowUrl: assetUrl(iconShadow),
  iconSize: [20, 35],
  iconAnchor: [19, 38],
});

L.Marker.prototype.options.icon = DefaultIcon;
