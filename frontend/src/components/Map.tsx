'use client';

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapProps {
    center?: [number, number];
    zoom?: number;
    sosRequests?: any[];
    incidents?: any[];
    volunteers?: any[];
    userLocation?: [number, number];
    onMarkerClick?: (item: any, type: string) => void;
    className?: string;
}

export default function Map({
    center = [78.9629, 20.5937], // Center of India as default
    zoom = 5,
    sosRequests = [],
    incidents = [],
    volunteers = [],
    userLocation,
    onMarkerClick,
    className = 'h-96'
}: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: center,
            zoom: zoom,
        });

        map.current.on('load', () => {
            setMapLoaded(true);
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add geolocation control
        map.current.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true,
                showUserHeading: true
            }),
            'top-right'
        );

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update map center when prop changes
    useEffect(() => {
        if (map.current && mapLoaded) {
            map.current.flyTo({ center, zoom });
        }
    }, [center, zoom, mapLoaded]);

    // Clear all markers
    const clearMarkers = () => {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
    };

    // Add markers for all data
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        clearMarkers();

        // Add SOS markers (red)
        sosRequests.forEach((sos) => {
            if (sos.latitude && sos.longitude) {
                const el = document.createElement('div');
                el.className = 'marker-pulse';
                el.innerHTML = `
          <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer shadow-lg hover:scale-110 transition-transform">
            🆘
          </div>
        `;

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([sos.longitude, sos.latitude])
                    .setPopup(
                        new mapboxgl.Popup({ offset: 25 })
                            .setHTML(`
                <div class="p-2">
                  <h3 class="font-bold text-red-600">SOS Emergency</h3>
                  <p class="text-sm">${sos.citizen?.full_name || 'Unknown'}</p>
                  <p class="text-xs text-gray-600">${sos.address || 'Location'}</p>
                  <p class="text-xs text-gray-500">${new Date(sos.created_at).toLocaleString()}</p>
                  <span class="text-xs px-2 py-1 rounded bg-red-100 text-red-600">${sos.status}</span>
                </div>
              `)
                    )
                    .addTo(map.current!);

                if (onMarkerClick) {
                    el.addEventListener('click', () => onMarkerClick(sos, 'sos'));
                }

                markersRef.current.push(marker);
            }
        });

        // Add incident markers (orange/yellow based on type)
        incidents.forEach((incident) => {
            if (incident.latitude && incident.longitude) {
                const color = getIncidentColor(incident.incident_type);
                const icon = getIncidentIcon(incident.incident_type);

                const el = document.createElement('div');
                el.innerHTML = `
          <div class="w-7 h-7 ${color} rounded-full flex items-center justify-center text-white text-sm cursor-pointer shadow-lg hover:scale-110 transition-transform">
            ${icon}
          </div>
        `;

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([incident.longitude, incident.latitude])
                    .setPopup(
                        new mapboxgl.Popup({ offset: 25 })
                            .setHTML(`
                <div class="p-2">
                  <h3 class="font-bold">${incident.title}</h3>
                  <p class="text-sm text-gray-700">${incident.incident_type.replace('_', ' ')}</p>
                  <p class="text-xs text-gray-600">${incident.description.substring(0, 100)}...</p>
                  <p class="text-xs text-gray-500">${new Date(incident.created_at).toLocaleString()}</p>
                  <span class="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-600">${incident.status}</span>
                </div>
              `)
                    )
                    .addTo(map.current!);

                if (onMarkerClick) {
                    el.addEventListener('click', () => onMarkerClick(incident, 'incident'));
                }

                markersRef.current.push(marker);
            }
        });

        // Add volunteer markers (green)
        volunteers.forEach((volunteer) => {
            if (volunteer.latitude && volunteer.longitude) {
                const el = document.createElement('div');
                el.innerHTML = `
          <div class="w-6 h-6 ${volunteer.volunteer_status === 'online' ? 'bg-green-500' : 'bg-gray-500'} rounded-full flex items-center justify-center text-white text-xs cursor-pointer shadow-lg">
            👥
          </div>
        `;

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([volunteer.longitude, volunteer.latitude])
                    .setPopup(
                        new mapboxgl.Popup({ offset: 25 })
                            .setHTML(`
                <div class="p-2">
                  <h3 class="font-bold">${volunteer.full_name}</h3>
                  <p class="text-sm">${volunteer.volunteer_id}</p>
                  <span class="text-xs px-2 py-1 rounded ${volunteer.volunteer_status === 'online'
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-600'
                                }">${volunteer.volunteer_status}</span>
                </div>
              `)
                    )
                    .addTo(map.current!);

                markersRef.current.push(marker);
            }
        });

        // Add user location marker (blue)
        if (userLocation) {
            const el = document.createElement('div');
            el.innerHTML = `
        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg">
          📍
        </div>
      `;

            const marker = new mapboxgl.Marker(el)
                .setLngLat(userLocation)
                .setPopup(
                    new mapboxgl.Popup({ offset: 25 })
                        .setHTML(`
              <div class="p-2">
                <h3 class="font-bold text-blue-600">Your Location</h3>
              </div>
            `)
                )
                .addTo(map.current!);

            markersRef.current.push(marker);
        }
    }, [mapLoaded, sosRequests, incidents, volunteers, userLocation, onMarkerClick]);

    return (
        <div ref={mapContainer} className={`rounded-lg overflow-hidden ${className}`} />
    );
}

function getIncidentColor(type: string): string {
    const colors: { [key: string]: string } = {
        fire: 'bg-red-600',
        medical: 'bg-blue-600',
        accident: 'bg-yellow-600',
        crime: 'bg-purple-600',
        natural_disaster: 'bg-orange-600',
        other: 'bg-gray-600',
    };
    return colors[type] || 'bg-gray-600';
}

function getIncidentIcon(type: string): string {
    const icons: { [key: string]: string } = {
        fire: '🔥',
        medical: '🏥',
        accident: '🚗',
        crime: '🚔',
        natural_disaster: '🌪️',
        other: '⚠️',
    };
    return icons[type] || '⚠️';
}
