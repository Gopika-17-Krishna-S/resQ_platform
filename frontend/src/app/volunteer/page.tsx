'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { dashboardAPI, taskAPI, userAPI } from '@/lib/api';
import { socketService } from '@/lib/socket';
import Map from '@/components/Map';
import ChatModal from '@/components/ChatModal';

export default function VolunteerDashboard() {
    const router = useRouter();
    const { user, isAuthenticated, isInitialized, logout } = useAuthStore();
    const [stats, setStats] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'online' | 'offline'>('offline');
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [showTaskDetails, setShowTaskDetails] = useState(false);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        if (!isInitialized) return;

        if (!isAuthenticated || user?.role !== 'volunteer') {
            router.push('/');
            return;
        }

        socketService.connect(user?.id);

        // Socket listeners
        const handleTaskAssigned = (task: any) => {
            setTasks(prev => {
                if (prev.some(t => t.id === task.id)) return prev;
                return [task, ...prev];
            });
            alert('New task assigned to you!');
            loadData();
        };

        const handleTaskUpdated = (task: any) => {
            setTasks(prev => prev.map(t => t.id === task.id ? task : t));
        };

        const handleNewReport = () => {
            // New SOS or Incident in the system, might be nearby
            // For now, just a simple notification or reload of stats/nearby list
            loadData();
        };

        socketService.on('task_assigned', handleTaskAssigned);
        socketService.on('task_updated', handleTaskUpdated);
        socketService.on('sos_created', handleNewReport);
        socketService.on('incident_created', handleNewReport);

        loadData();

        return () => {
            socketService.off('task_assigned', handleTaskAssigned);
            socketService.off('task_updated', handleTaskUpdated);
            socketService.off('sos_created', handleNewReport);
            socketService.off('incident_created', handleNewReport);
        };
    }, [isInitialized, isAuthenticated, user, router]);

    const loadData = async () => {
        try {
            const [statsRes, tasksRes] = await Promise.all([
                dashboardAPI.getStats(),
                taskAPI.getAll(),
            ]);

            setStats(statsRes.data);
            setTasks(tasksRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async () => {
        const newStatus = status === 'online' ? 'offline' : 'online';
        try {
            if (newStatus === 'online' && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        try {
                            // Update location first
                            await userAPI.updateLocation(
                                position.coords.latitude,
                                position.coords.longitude
                            );
                            // Then update status
                            await userAPI.updateVolunteerStatus(newStatus);
                            setStatus(newStatus);
                        } catch (error) {
                            console.error('Failed to update location/status:', error);
                        }
                    },
                    (error) => {
                        console.error('Location error:', error);
                        // Fallback: update status anyway
                        userAPI.updateVolunteerStatus(newStatus).then(() => setStatus(newStatus));
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            } else {
                await userAPI.updateVolunteerStatus(newStatus);
                setStatus(newStatus);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleViewTask = (task: any) => {
        setSelectedTask(task);
        setShowTaskDetails(true);
    };

    const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
        try {
            await taskAPI.update(taskId, { status: newStatus });
            alert('Task status updated successfully!');
            loadData();
            setShowTaskDetails(false);
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('Failed to update task status');
        }
    };

    const handleGetDirections = () => {
        if (!selectedTask) return;

        const location = selectedTask.sos_request
            ? selectedTask.sos_request
            : selectedTask.incident_report;

        if (location?.latitude && location?.longitude) {
            // Open Google Maps with directions
            const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
            window.open(url, '_blank');
        } else if (location?.address) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;
            window.open(url, '_blank');
        }
    };

    const handleLogout = () => {
        socketService.disconnect();
        logout();
        router.push('/');
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
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <img src="/logo.png" alt="resQ Logo" className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                            <h1 className="text-2xl font-bold">Volunteer Portal</h1>
                            <p className="text-sm text-gray-400">Welcome, {user?.full_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleStatus}
                            className={`px-4 py-2 rounded-lg font-semibold ${status === 'online'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-700 text-gray-300'
                                }`}
                        >
                            {status === 'online' ? '🟢 ONLINE' : '⚫ OFFLINE'}
                        </button>
                        <button onClick={handleLogout} className="btn btn-secondary">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-2">Pending Tasks</h3>
                        <p className="text-4xl font-bold text-yellow-400">{stats?.pending_tasks || 0}</p>
                    </div>
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-2">Completed</h3>
                        <p className="text-4xl font-bold text-green-400">{stats?.resolved_tasks || 0}</p>
                    </div>
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-2">Total Tasks</h3>
                        <p className="text-4xl font-bold text-primary">{tasks.length}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Task List */}
                    <div className="lg:col-span-1">
                        <div className="card">
                            <h3 className="font-bold mb-4">Assigned Tasks ({tasks.length})</h3>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {tasks.length === 0 ? (
                                    <p className="text-gray-400 text-sm">No tasks assigned</p>
                                ) : (
                                    tasks.map((task: any) => (
                                        <div key={task.id} className="bg-dark-700 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold">
                                                    {task.sos_request ? 'SOS Emergency' : task.incident_report?.title}
                                                </h4>
                                                <span className={`badge ${task.status === 'completed' ? 'badge-success' :
                                                    task.status === 'responding' ? 'badge-warning' :
                                                        'badge-info'
                                                    }`}>
                                                    {task.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400">
                                                {task.sos_request?.address || task.incident_report?.address}
                                            </p>
                                            <button
                                                onClick={() => handleViewTask(task)}
                                                className="btn btn-primary w-full mt-3 text-sm py-2"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="lg:col-span-2">
                        <div className="card">
                            <h3 className="text-xl font-bold mb-6">Task Map & Navigation</h3>
                            <Map
                                center={tasks[0]?.sos_request?.longitude && tasks[0]?.sos_request?.latitude
                                    ? [tasks[0].sos_request.longitude, tasks[0].sos_request.latitude]
                                    : tasks[0]?.incident_report?.longitude && tasks[0]?.incident_report?.latitude
                                        ? [tasks[0].incident_report.longitude, tasks[0].incident_report.latitude]
                                        : undefined}
                                zoom={12}
                                sosRequests={tasks.filter(t => t.sos_request).map(t => t.sos_request)}
                                incidents={tasks.filter(t => t.incident_report).map(t => t.incident_report)}
                                userLocation={user?.latitude && user?.longitude ? [user.longitude, user.latitude] : undefined}
                                className="h-96"
                            />
                        </div>

                        <div className="card mt-6">
                            <h3 className="text-xl font-bold mb-4">Nearby Reports</h3>
                            <p className="text-gray-400">Check nearby unassigned reports to assist</p>
                            <button className="btn btn-primary mt-4">
                                View Nearby Reports
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Details Modal */}
            {showTaskDetails && selectedTask && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="card max-w-2xl w-full my-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {selectedTask.sos_request ? '🆘 SOS Emergency' : selectedTask.incident_report?.title}
                                </h2>
                                <span className={`badge ${selectedTask.status === 'completed' ? 'badge-success' :
                                    selectedTask.status === 'responding' ? 'badge-warning' :
                                        'badge-info'
                                    } mt-2`}>
                                    {selectedTask.status}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowTaskDetails(false)}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Emergency Details */}
                        <div className="space-y-6">
                            {/* Type & Description */}
                            <div className="bg-dark-700 rounded-lg p-4">
                                <h3 className="font-semibold mb-3 text-lg">Emergency Details</h3>

                                {selectedTask.sos_request ? (
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-gray-400 text-sm">Type:</span>
                                            <p className="text-danger font-semibold">SOS Emergency Request</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-sm">Status:</span>
                                            <p className="capitalize">{selectedTask.sos_request.status}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-sm">Reported:</span>
                                            <p>{new Date(selectedTask.sos_request.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-gray-400 text-sm">Incident Type:</span>
                                            <p className="capitalize font-semibold">{selectedTask.incident_report?.incident_type}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-sm">Title:</span>
                                            <p>{selectedTask.incident_report?.title}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-sm">Description:</span>
                                            <p>{selectedTask.incident_report?.description || 'No description provided'}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-sm">Status:</span>
                                            <p className="capitalize">{selectedTask.incident_report?.status}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-sm">Reported:</span>
                                            <p>{new Date(selectedTask.incident_report?.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Citizen Contact Information */}
                            <div className="bg-dark-700 rounded-lg p-4">
                                <h3 className="font-semibold mb-3 text-lg">👤 Citizen Contact</h3>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-gray-400 text-sm">Name:</span>
                                        <p className="font-semibold">
                                            {selectedTask.sos_request?.citizen?.full_name ||
                                                selectedTask.incident_report?.citizen?.full_name ||
                                                'Unknown'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-sm">Phone:</span>
                                        <p className="text-primary">
                                            {selectedTask.sos_request?.citizen?.phone ||
                                                selectedTask.incident_report?.citizen?.phone ||
                                                'Not available'}
                                        </p>
                                        {(selectedTask.sos_request?.citizen?.phone || selectedTask.incident_report?.citizen?.phone) && (
                                            <a
                                                href={`tel:${selectedTask.sos_request?.citizen?.phone || selectedTask.incident_report?.citizen?.phone}`}
                                                className="text-sm text-green-400 hover:underline"
                                            >
                                                📞 Call Now
                                            </a>
                                        )}
                                    </div>
                                    {(selectedTask.sos_request?.citizen?.email || selectedTask.incident_report?.citizen?.email) && (
                                        <div>
                                            <span className="text-gray-400 text-sm">Email:</span>
                                            <p>{selectedTask.sos_request?.citizen?.email || selectedTask.incident_report?.citizen?.email}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Location Information */}
                            <div className="bg-dark-700 rounded-lg p-4">
                                <h3 className="font-semibold mb-3 text-lg">📍 Location</h3>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-gray-400 text-sm">Address:</span>
                                        <p>{selectedTask.sos_request?.address || selectedTask.incident_report?.address || 'Address not available'}</p>
                                    </div>
                                    {(selectedTask.sos_request?.latitude || selectedTask.incident_report?.latitude) && (
                                        <div>
                                            <span className="text-gray-400 text-sm">Coordinates:</span>
                                            <p className="text-sm font-mono">
                                                {selectedTask.sos_request?.latitude || selectedTask.incident_report?.latitude},
                                                {selectedTask.sos_request?.longitude || selectedTask.incident_report?.longitude}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Task Information */}
                            <div className="bg-dark-700 rounded-lg p-4">
                                <h3 className="font-semibold mb-3 text-lg">📋 Task Info</h3>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-gray-400 text-sm">Task ID:</span>
                                        <p>#{selectedTask.id}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-sm">Assigned:</span>
                                        <p>{new Date(selectedTask.created_at).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 text-sm">Current Status:</span>
                                        <p className="capitalize font-semibold">{selectedTask.status}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3 pt-4">
                                {/* Chat Button */}
                                {(selectedTask.sos_request?.citizen || selectedTask.incident_report?.citizen) && (
                                    <button
                                        onClick={() => setShowChat(true)}
                                        className="btn btn-primary w-full text-lg py-4"
                                    >
                                        💬 Chat with Citizen
                                    </button>
                                )}

                                {/* Get Directions Button */}
                                <button
                                    onClick={handleGetDirections}
                                    className="btn btn-primary w-full text-lg py-4"
                                >
                                    🗺️ Get Directions
                                </button>

                                {/* Status Update Buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedTask.status !== 'responding' && (
                                        <button
                                            onClick={() => handleUpdateTaskStatus(selectedTask.id, 'responding')}
                                            className="btn bg-yellow-600 hover:bg-yellow-700 text-white"
                                        >
                                            🚨 Start Responding
                                        </button>
                                    )}
                                    {selectedTask.status !== 'completed' && (
                                        <button
                                            onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                                            className="btn bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            ✅ Mark Complete
                                        </button>
                                    )}
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => setShowTaskDetails(false)}
                                    className="btn btn-secondary w-full"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {showChat && selectedTask && (
                <ChatModal
                    isOpen={showChat}
                    onClose={() => setShowChat(false)}
                    taskId={selectedTask.id}
                    contactId={selectedTask.sos_request?.citizen?.id || selectedTask.incident_report?.citizen?.id}
                    contactName={selectedTask.sos_request?.citizen?.full_name || selectedTask.incident_report?.citizen?.full_name || 'Citizen'}
                    title={`Chat regarding Task #${selectedTask.id}`}
                />
            )}
        </div>
    );
}
