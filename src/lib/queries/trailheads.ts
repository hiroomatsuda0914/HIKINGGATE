import { supabase } from '../supabase';

// --- 型定義：アプリの「内部」で使う形 ---
export interface Trailhead {
    id: string;
    nameJa: string;
    nameEn: string;
    latLng: [number, number];
}

// --- 型定義：DB（Supabase）から「届く」形 ---
// DBの列名（スネークケース）に合わせている
interface TrailheadRow {
    id: string;
    name_ja: string;
    name_en: string;
    lat: number;
    lng: number;
}

// --- 変換関数（マッピング） ---
// DBから届いたデータを、アプリで使いやすい「Trailhead」形式に変換する
function mapRow(row: TrailheadRow): Trailhead {
    return {
        id: row.id,
        nameJa: row.name_ja,
        nameEn: row.name_en,
        latLng: [row.lat, row.lng],
    };
}

// trailheadsテーブルからデータを取得する
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