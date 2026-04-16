// Supabase の trailheads テーブルから登山口一覧を取得し、アプリ用オブジェクトにマッピングする。
// DB 行（lat/lng）を lngLat タプル [経度, 緯度] に変換する。
import { supabase } from '../supabase';

// --- 型定義：アプリの「内部」で使う形 ---
/** [経度, 緯度] WGS84 */
export interface Trailhead {
    id: string;
    nameJa: string;
    nameEn: string;
    lngLat: [number, number];
}

// 登山口の取得範囲（緯度経度の最小値・最大値）を表す型
export type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
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
        lngLat: [row.lng, row.lat],
    };
}

// trailheadsテーブルからデータを取得する
export async function fetchTrailhead(bounds: Bounds): Promise<Trailhead[]> {
    const { data, error } = await supabase
    .from("trailheads")
    .select("id, name_ja, name_en, lat, lng")
    .gte("lat", bounds.minLat)
    .lte("lat", bounds.maxLat)
    .gte("lng", bounds.minLng)
    .lte("lng", bounds.maxLng)
    .order("name_ja", { ascending: true });
    console.log(data);
  if (error) {
    throw error;
  }
  if (!data) {
    return [];
  }
  return (data as TrailheadRow[]).map(mapRow);
}