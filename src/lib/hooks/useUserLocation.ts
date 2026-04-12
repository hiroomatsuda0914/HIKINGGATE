// ブラウザの Geolocation API で現在地を取得するカスタムフック。
// 失敗時はデフォルト座標（高尾山口付近）にフォールバック。戻り値は [経度, 緯度]。
'use client';

import { useState, useEffect } from 'react';

// デフォルトはひとまず高尾山口 — [経度, 緯度]（Mapbox / GeoJSON と同じ並び）
const DEFAULT_LOCATION: [number, number] = [139.262472, 35.629097];

export function useUserLocation() {
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.longitude, position.coords.latitude]);
                    setLoading(false);
                },
                (error) => {
                    setError(error.message);
                    setUserLocation(DEFAULT_LOCATION);
                    setLoading(false);
                },
                {
                    timeout: 5000,
                    maximumAge: 0,
                    enableHighAccuracy: true,
                }
            );
        } else {
            setUserLocation(DEFAULT_LOCATION);
            setLoading(false);
        }
    }, []);
    return { userLocation, loading, error };
}