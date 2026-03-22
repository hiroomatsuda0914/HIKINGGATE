'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapControllerProps {
    center: [number, number];
}

export default function MapController({ center }: MapControllerProps) {
    const map = useMap();

    useEffect(() => {
        map.setView(center, 13);
    }, [map, center]);

    return null;
}