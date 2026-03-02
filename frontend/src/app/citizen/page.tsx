'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { dashboardAPI, sosAPI, incidentAPI, userAPI } from '@/lib/api';
import { socketService } from '@/lib/socket';
import Map from '@/components/Map';
import ChatModal from '@/components/ChatModal';

export default function CitizenDashboard() {
    const router = useRouter();
    const { user, isAuthenticated, isInitialized, logout } = useAuthStore();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showSOSForm, setShowSOSForm] = useState(false);
    const [activeView, setActiveView] = useState<'dashboard' | 'reports'>('dashboard');
    const [sosRequests, setSosRequests] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [showReportDetails, setShowReportDetails] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showProfileEditModal, setShowProfileEditModal] = useState(false);
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        phone: '',
        address: ''
    });
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [sendingSOS, setSendingSOS] = useState(false);

    useEffect(() => {
        if (!isInitialized) return;

        if (!isAuthenticated || user?.role !== 'citizen') {
            router.push('/');
            return;
        }

        // Get user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('Location:', position.coords);
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

        // Connect socket
        socketService.connect(user?.id);

        // Socket listeners
        const handleTaskUpdated = () => {
            // Something about our report changed (assigned, responding, resolved)
            loadStats();
        };

        const handleBroadcast = (data: any) => {
            alert(`🚨 BROADCAST: ${data.content}`);
        };

        socketService.on('task_updated', handleTaskUpdated);
        socketService.on('broadcast_message', handleBroadcast);

        // Load stats
        loadStats();

        return () => {
            socketService.off('task_updated', handleTaskUpdated);
            socketService.off('broadcast_message', handleBroadcast);
        };
    }, [isInitialized, isAuthenticated, user, router]);

    const loadStats = async () => {
        try {
            const [statsRes, sosRes, incidentsRes] = await Promise.all([
                dashboardAPI.getStats(),
                sosAPI.getAll(),
                incidentAPI.getAll()
            ]);
            setStats(statsRes.data);
            setSosRequests(sosRes.data);
            setIncidents(incidentsRes.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSOS = async () => {
        if (sendingSOS) return;

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setSendingSOS(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    await sosAPI.create({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        address: 'Current Location'
                    });
                    alert('SOS sent successfully!');
                    setShowSOSForm(false);
                    loadStats();
                } catch (error) {
                    console.error('Failed to send SOS:', error);
                    alert('Failed to send SOS');
                } finally {
                    setSendingSOS(false);
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Failed to get your location. Please check your browser settings.');
                setSendingSOS(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleLogout = () => {
        socketService.disconnect();
        logout();
        router.push('/');
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingProfile(true);
        try {
            const response = await userAPI.updateMe(profileForm);
            useAuthStore.getState().updateUser(response.data);
            alert('Profile updated successfully!');
            setShowProfileEditModal(false);
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            alert(error.response?.data?.detail || 'Failed to update profile');
        } finally {
            setUpdatingProfile(false);
        }
    };

    const openProfileEdit = () => {
        setProfileForm({
            full_name: user?.full_name || '',
            phone: user?.phone || '',
            address: user?.address || ''
        });
        setShowProfileEditModal(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark">
            {/* Header */}
            <header className="glass border-b border-dark-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                            <img src="/logo.png" alt="resQ Logo" className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                                <p className="text-sm text-gray-400">Welcome, {user?.full_name}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="btn btn-secondary">
                            Logout
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setActiveView('dashboard')}
                            className={`px-4 py-2 rounded-lg font-semibold transition ${activeView === 'dashboard'
                                ? 'bg-primary text-white'
                                : 'bg-dark-700 text-gray-400 hover:text-white'
                                }`}
                        >
                            🏠 Dashboard
                        </button>
                        <button
                            onClick={() => setActiveView('reports')}
                            className={`px-4 py-2 rounded-lg font-semibold transition ${activeView === 'reports'
                                ? 'bg-primary text-white'
                                : 'bg-dark-700 text-gray-400 hover:text-white'
                                }`}
                        >
                            📋 My Reports
                        </button>
                    </div>
                </div>
            </header>

            {/* Dashboard View */}
            {activeView === 'dashboard' && (
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-2">My SOS Requests</h3>
                            <p className="text-4xl font-bold text-danger">{stats?.total_sos || 0}</p>
                        </div>
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-2">My Incident Reports</h3>
                            <p className="text-4xl font-bold text-primary">{stats?.total_incidents || 0}</p>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="card mb-6">
                                <h3 className="font-bold mb-4">Quick Actions</h3>
                                <button onClick={() => setShowSOSForm(true)} className="btn btn-danger w-full mb-3 sos-pulse">
                                    🆘 EMERGENCY SOS
                                </button>
                                <button onClick={() => router.push('/citizen/report-incident')} className="btn btn-primary w-full">
                                    📝 Report Incident
                                </button>
                            </div>

                            <div className="card">
                                <h3 className="font-bold mb-4">My Profile</h3>
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-gray-400">Name:</span> {user?.full_name}</p>
                                    <p><span className="text-gray-400">Phone:</span> {user?.phone}</p>
                                    <p><span className="text-gray-400">Address:</span> {user?.address || 'Not set'}</p>
                                    <p><span className="text-gray-400">Role:</span> Citizen</p>
                                </div>
                                <button
                                    onClick={openProfileEdit}
                                    className="btn btn-secondary w-full mt-4 text-sm"
                                >
                                    ✏️ Edit Profile
                                </button>
                            </div>
                        </div>

                        {/* Main */}
                        <div className="lg:col-span-2">
                            <div className="card">
                                <h3 className="text-xl font-bold mb-6">Emergency Map</h3>
                                <Map
                                    center={user?.latitude && user?.longitude ? [user.longitude, user.latitude] : undefined}
                                    zoom={12}
                                    userLocation={user?.latitude && user?.longitude ? [user.longitude, user.latitude] : undefined}
                                    className="h-96"
                                />
                            </div>

                            <div className="card mt-6">
                                <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
                                <p className="text-gray-400">No recent activity</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports View */}
            {activeView === 'reports' && (
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <h2 className="text-3xl font-bold mb-6">My Emergency Reports</h2>

                    {/* SOS Requests Section */}
                    <div className="mb-8">
                        <h3 className="text-2xl font-bold mb-4">🆘 SOS Requests ({sosRequests.length})</h3>
                        {sosRequests.length === 0 ? (
                            <div className="card text-center py-8">
                                <p className="text-gray-400">No SOS requests yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sosRequests.map((sos: any) => (
                                    <div key={sos.id} className="card hover:border-danger/50 transition cursor-pointer" onClick={() => {
                                        setSelectedReport({ ...sos, type: 'sos' });
                                        setShowReportDetails(true);
                                    }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-semibold text-danger">SOS Emergency</h4>
                                            <span className={`badge ${sos.status === 'resolved' ? 'badge-success' :
                                                sos.status === 'responding' ? 'badge-warning' :
                                                    'badge-danger'
                                                }`}>
                                                {sos.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2">{sos.address || 'Location not available'}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(sos.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Incident Reports Section */}
                    <div>
                        <h3 className="text-2xl font-bold mb-4">📝 Incident Reports ({incidents.length})</h3>
                        {incidents.length === 0 ? (
                            <div className="card text-center py-8">
                                <p className="text-gray-400">No incident reports yet</p>
                                <button
                                    onClick={() => router.push('/citizen/report-incident')}
                                    className="btn btn-primary mt-4"
                                >
                                    Report Your First Incident
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {incidents.map((incident: any) => (
                                    <div key={incident.id} className="card hover:border-primary/50 transition cursor-pointer" onClick={() => {
                                        setSelectedReport({ ...incident, type: 'incident' });
                                        setShowReportDetails(true);
                                    }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-semibold">{incident.title}</h4>
                                                <p className="text-xs text-gray-500 capitalize">{incident.incident_type}</p>
                                            </div>
                                            <span className={`badge ${incident.status === 'resolved' ? 'badge-success' :
                                                incident.status === 'investigating' ? 'badge-warning' :
                                                    'badge-info'
                                                }`}>
                                                {incident.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2 line-clamp-2">{incident.description}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(incident.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SOS Modal */}
            {showSOSForm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-4 text-danger">Emergency SOS</h2>
                        <p className="text-gray-400 mb-6">
                            This will send your current location to emergency responders. Press confirm to continue.
                        </p>
                        <div className="flex space-x-4">
                            <button
                                onClick={handleSOS}
                                className="btn btn-danger flex-1"
                                disabled={sendingSOS}
                            >
                                {sendingSOS ? 'Sending...' : 'Confirm SOS'}
                            </button>
                            <button
                                onClick={() => setShowSOSForm(false)}
                                className="btn btn-secondary flex-1"
                                disabled={sendingSOS}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Details Modal */}
            {showReportDetails && selectedReport && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="card max-w-2xl w-full my-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {selectedReport.type === 'sos' ? '🆘 SOS Emergency' : selectedReport.title}
                                </h2>
                                <span className={`badge ${selectedReport.status === 'resolved' ? 'badge-success' :
                                    selectedReport.status === 'responding' || selectedReport.status === 'investigating' ? 'badge-warning' :
                                        selectedReport.type === 'sos' ? 'badge-danger' : 'badge-info'
                                    } mt-2`}>
                                    {selectedReport.status}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowReportDetails(false)}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Type & Details */}
                            <div className="bg-dark-700 rounded-lg p-4">
                                <h3 className="font-semibold mb-3 text-lg">Report Details</h3>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-gray-400 text-sm">Type:</span>
                                        <p className="font-semibold capitalize">
                                            {selectedReport.type === 'sos' ? 'SOS Emergency' : selectedReport.incident_type}
                                        </p>
                                    </div>
                                    {selectedReport.type === 'incident' && (
                                        <>
                                            <div>
                                                <span className="text-gray-400 text-sm">Title:</span>
                                                <p>{selectedReport.title}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 text-sm">Description:</span>
                                                <p>{selectedReport.description || 'No description provided'}</p>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <span className="text-gray-400 text-sm">Status:</span>
                                        <p className="capitalize font-semibold">{selectedReport.status}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-sm">Reported:</span>
                                        <p>{new Date(selectedReport.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="bg-dark-700 rounded-lg p-4">
                                <h3 className="font-semibold mb-3 text-lg">📍 Location</h3>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-gray-400 text-sm">Address:</span>
                                        <p>{selectedReport.address || 'Not available'}</p>
                                    </div>
                                    {selectedReport.latitude && (
                                        <div>
                                            <span className="text-gray-400 text-sm">Coordinates:</span>
                                            <p className="text-sm font-mono">
                                                {selectedReport.latitude}, {selectedReport.longitude}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Assigned Volunteer */}
                            {selectedReport.tasks && selectedReport.tasks.length > 0 && selectedReport.tasks[0].volunteer && (
                                <div className="bg-dark-700 rounded-lg p-4">
                                    <h3 className="font-semibold mb-3 text-lg">👤 Assigned Volunteer</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-gray-400 text-sm">Name:</span>
                                            <p className="font-semibold text-primary">
                                                {selectedReport.tasks[0].volunteer.full_name}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-sm">Volunteer ID:</span>
                                            <p className="font-mono text-sm">
                                                {selectedReport.tasks[0].volunteer.volunteer_id}
                                            </p>
                                        </div>
                                        {selectedReport.tasks[0].volunteer.phone && (
                                            <div>
                                                <span className="text-gray-400 text-sm">Phone:</span>
                                                <p className="text-primary">
                                                    {selectedReport.tasks[0].volunteer.phone}
                                                </p>
                                                <a
                                                    href={`tel:${selectedReport.tasks[0].volunteer.phone}`}
                                                    className="text-sm text-green-400 hover:underline"
                                                >
                                                    📞 Call Volunteer
                                                </a>
                                            </div>
                                        )}
                                        {selectedReport.tasks[0].volunteer.email && (
                                            <div>
                                                <span className="text-gray-400 text-sm">Email:</span>
                                                <p>{selectedReport.tasks[0].volunteer.email}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-gray-400 text-sm">Task Status:</span>
                                            <p className="capitalize">
                                                <span className={`badge ${selectedReport.tasks[0].status === 'completed' ? 'badge-success' :
                                                    selectedReport.tasks[0].status === 'responding' ? 'badge-warning' :
                                                        'badge-info'
                                                    }`}>
                                                    {selectedReport.tasks[0].status}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* No Volunteer Assigned Yet */}
                            {(!selectedReport.tasks || selectedReport.tasks.length === 0) && selectedReport.status !== 'resolved' && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                    <p className="text-blue-400 text-sm">
                                        ⏳ No volunteer has been assigned yet. Help is being coordinated.
                                    </p>
                                </div>
                            )}

                            {/* Status Message */}
                            <div className={`rounded-lg p-4 ${selectedReport.status === 'resolved' ? 'bg-green-500/10 border border-green-500/30' :
                                selectedReport.status === 'responding' || selectedReport.status === 'investigating' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                                    'bg-blue-500/10 border border-blue-500/30'
                                }`}>
                                <p className={`text-sm ${selectedReport.status === 'resolved' ? 'text-green-400' :
                                    selectedReport.status === 'responding' || selectedReport.status === 'investigating' ? 'text-yellow-400' :
                                        'text-blue-400'
                                    }`}>
                                    {selectedReport.status === 'resolved' && '✅ This emergency has been resolved.'}
                                    {selectedReport.status === 'responding' && '🚨 Emergency responders are on their way.'}
                                    {selectedReport.status === 'investigating' && '🔍 This incident is being investigated.'}
                                    {selectedReport.status === 'pending' && '⏳ Your report is pending review.'}
                                    {selectedReport.status === 'active' && '⚠️ This emergency is active. Help is being coordinated.'}
                                </p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setShowReportDetails(false)}
                                className="btn btn-secondary w-full"
                            >
                                Close
                            </button>

                            {/* Chat Button */}
                            {selectedReport.tasks && selectedReport.tasks.length > 0 && selectedReport.tasks[0].volunteer && (
                                <button
                                    onClick={() => setShowChat(true)}
                                    className="btn btn-primary w-full mt-2"
                                >
                                    💬 Chat with Volunteer
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Chat Modal */}
            {
                showChat && selectedReport && selectedReport.tasks && selectedReport.tasks.length > 0 && (
                    <ChatModal
                        isOpen={showChat}
                        onClose={() => setShowChat(false)}
                        taskId={selectedReport.tasks[0].id}
                        contactId={selectedReport.tasks[0].volunteer.id}
                        contactName={selectedReport.tasks[0].volunteer.full_name}
                        title={`Chat regarding ${selectedReport.type === 'sos' ? 'SOS' : 'Incident'}`}
                    />
                )
            }

            {/* Profile Edit Modal */}
            {showProfileEditModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={profileForm.full_name}
                                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={profileForm.phone}
                                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Address</label>
                                <textarea
                                    value={profileForm.address}
                                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                                    className="input"
                                    rows={3}
                                    placeholder="Enter your home address"
                                />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    className="btn btn-primary flex-1"
                                    disabled={updatingProfile}
                                >
                                    {updatingProfile ? 'Updating...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowProfileEditModal(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
}
