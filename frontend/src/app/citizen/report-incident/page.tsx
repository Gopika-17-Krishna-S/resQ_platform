'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { incidentAPI } from '@/lib/api';

const incidentTypes = [
    { value: 'fire', label: '🔥 Fire', color: 'text-red-500' },
    { value: 'medical', label: '🏥 Medical Emergency', color: 'text-blue-500' },
    { value: 'accident', label: '🚗 Accident', color: 'text-yellow-500' },
    { value: 'crime', label: '🚔 Crime', color: 'text-purple-500' },
    { value: 'natural_disaster', label: '🌪️ Natural Disaster', color: 'text-orange-500' },
    { value: 'other', label: '⚠️ Other', color: 'text-gray-500' },
];

export default function ReportIncident() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const [formData, setFormData] = useState({
        incident_type: 'fire',
        title: '',
        description: '',
        latitude: 0,
        longitude: 0,
        address: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'citizen') {
            router.push('/');
            return;
        }

        // Get current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    }));
                },
                (error) => {
                    console.error('Error getting location:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }
    }, [isAuthenticated, user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await incidentAPI.create(formData);
            alert('Incident reported successfully!');
            router.push('/citizen');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to report incident');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark">
            {/* Header */}
            <header className="glass border-b border-dark-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Report Incident</h1>
                    </div>
                    <button onClick={() => router.push('/citizen')} className="btn btn-secondary">
                        ← Back to Dashboard
                    </button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-6 py-8">
                <div className="card">
                    <h2 className="text-2xl font-bold mb-6">Create Incident Report</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Incident Type */}
                        <div>
                            <label className="block text-sm font-semibold mb-3">Incident Type</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {incidentTypes.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, incident_type: type.value }))}
                                        className={`p-4 rounded-lg text-left transition ${formData.incident_type === type.value
                                            ? 'bg-primary text-white ring-2 ring-primary'
                                            : 'bg-dark-700 hover:bg-dark-600'
                                            }`}
                                    >
                                        <span className={formData.incident_type === type.value ? '' : type.color}>
                                            {type.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="input"
                                placeholder="Brief title of the incident"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="input min-h-[120px]"
                                placeholder="Provide detailed information about the incident..."
                                required
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Location</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                className="input"
                                placeholder="Enter address or use current location"
                            />
                            <p className="text-sm text-gray-400 mt-2">
                                Current coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                            </p>
                        </div>

                        {error && (
                            <div className="bg-danger/20 border border-danger/50 rounded-lg p-4">
                                <p className="text-danger">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex space-x-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary flex-1"
                            >
                                {loading ? 'Submitting...' : 'Submit Report'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/citizen')}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
