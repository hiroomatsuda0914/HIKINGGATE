export const MAP_INITIAL_ZOOM = 13;

export const BASEMAP = {
  urlTemplate: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
} as const;

export const HILLSHADE = {
  urlTemplate:
    'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
  opacity: 0.45,
  maxZoom: 19,
  maxNativeZoom: 15,
} as const;