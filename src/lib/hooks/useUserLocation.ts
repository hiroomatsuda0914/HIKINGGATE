'use client';

import { useState, useEffect } from 'react';

// デフォルトはひとまず高尾山口
const DEFAULT_LOCATION: [number, number] = [35.629097, 139.262472];

export function useUserLocation() {
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
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