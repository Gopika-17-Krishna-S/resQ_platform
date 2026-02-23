import { create } from 'zustand';

export interface SOSRequest {
    id: number;
    citizen_id: number;
    latitude: number;
    longitude: number;
    address?: string;
    status: string;
    created_at: string;
    citizen: any;
}

export interface IncidentReport {
    id: number;
    citizen_id: number;
    incident_type: string;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    address?: string;
    image_url?: string;
    status: string;
    created_at: string;
    citizen: any;
}

interface MapState {
    sosRequests: SOSRequest[];
    incidents: IncidentReport[];
    selectedSOS: SOSRequest | null;
    selectedIncident: IncidentReport | null;
    mapCenter: [number, number];
    mapZoom: number;

    setSosRequests: (requests: SOSRequest[]) => void;
    addSosRequest: (request: SOSRequest) => void;
    setIncidents: (incidents: IncidentReport[]) => void;
    addIncident: (incident: IncidentReport) => void;
    setSelectedSOS: (sos: SOSRequest | null) => void;
    setSelectedIncident: (incident: IncidentReport | null) => void;
    setMapCenter: (center: [number, number]) => void;
    setMapZoom: (zoom: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
    sosRequests: [],
    incidents: [],
    selectedSOS: null,
    selectedIncident: null,
    mapCenter: [0, 0],
    mapZoom: 12,

    setSosRequests: (requests) => set({ sosRequests: requests }),
    addSosRequest: (request) => set((state) => ({
        sosRequests: [request, ...state.sosRequests]
    })),

    setIncidents: (incidents) => set({ incidents }),
    addIncident: (incident) => set((state) => ({
        incidents: [incident, ...state.incidents]
    })),

    setSelectedSOS: (sos) => set({ selectedSOS: sos }),
    setSelectedIncident: (incident) => set({ selectedIncident: incident }),
    setMapCenter: (center) => set({ mapCenter: center }),
    setMapZoom: (zoom) => set({ mapZoom: zoom }),
}));
