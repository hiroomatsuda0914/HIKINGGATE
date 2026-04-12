// 登山口・山頂・現在地から GeoJSON FeatureCollection を組み立てる純関数と型定義。
// Mapbox の geojson ソースにそのまま渡せる形に揃える。
export type HikingKind = 'trailhead' | 'summit' | 'user';

export interface TrailheadRow {
    id: string;
    nameJa: string;
    nameEn: string;
    lngLat: [number, number];
}

export interface SummitRow {
    id: string;
    nameJa: string;
    lngLat: [number, number];
}

export function buildHikingPointsFeatureCollection(
    userLngLat: [number, number],
    trailheads: TrailheadRow[],
    summits: SummitRow[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: userLngLat },
                properties: {
                    id: 'user',
                    kind: 'user' as const,
                    nameJa: 'あなたの現在地',
                    nameEn: 'Your current location',
                },
            },
            ...trailheads.map((t) => ({
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: t.lngLat },
                properties: {
                    id: t.id,
                    kind: 'trailhead' as const,
                    nameJa: t.nameJa,
                    nameEn: t.nameEn,
                },
            })),
            ...summits.map((s) => ({
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: s.lngLat },
                properties: {
                    id: s.id,
                    kind: 'summit' as const,
                    nameJa: s.nameJa,
                },
            })),
        ],
    };
}