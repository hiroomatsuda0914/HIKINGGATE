export const MAP_INITIAL_ZOOM = 13;

export const BASEMAP = {
      /** Leaflet の {s},{z},{x},{y} プレースホルダ付き URL */
  urlTemplate:
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
} as const;