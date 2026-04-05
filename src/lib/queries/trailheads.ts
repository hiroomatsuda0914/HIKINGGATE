import { supabase } from '../supabase';

export interface Trailhead {
    id: string;
    nameJa: string;
    nameEn: string;
    latLng: [number, number];
}

interface TrailheadRow {
    id: string;
    name_ja: string;
    name_en: string;
    lat: number;
    lng: number;
}

function mapRow(row: TrailheadRow): Trailhead {
    return {
        id: row.id,
        nameJa: row.name_ja,
        nameEn: row.name_en,
        latLng: [row.lat, row.lng],
    };
}

export async function fetchTrailhead(): Promise<Trailhead[]> {
    const { data, error } = await supabase
    .from("trailheads")
    .select("id, name_ja, name_en, lat, lng")
    .order("name_ja", { ascending: true });
  if (error) {
    throw error;
  }
  if (!data) {
    return [];
  }
  return (data as TrailheadRow[]).map(mapRow);
}