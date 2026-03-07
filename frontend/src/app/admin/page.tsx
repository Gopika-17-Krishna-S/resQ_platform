'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { dashboardAPI, sosAPI, incidentAPI, userAPI, taskAPI, authAPI } from '@/lib/api';
import { socketService } from '@/lib/socket';
import Map from '@/components/Map';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, isAuthenticated, isInitialized, logout } = useAuthStore();
    const [stats, setStats] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'sos' | 'incidents' | 'volunteers' | 'users'>('sos');
    const [sosList, setSosList] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [volunteers, setVolunteers] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showAddVolunteerModal, setShowAddVolunteerModal] = useState(false);
    const [volunteerForm, setVolunteerForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        volunteer_id: ''
    });

    // Edit/Delete state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => {
        if (!isInitialized) return;

        if (!isAuthenticated || user?.role !== 'admin') {
            router.push('/');
            return;
        }

        socketService.connect(user?.id);
        socketService.joinRoom('admin');

        // Socket listeners
        const handleSOSCreated = (sos: any) => {
            setSosList(prev => {
                if (prev.some(item => item.id === sos.id)) return prev;
                return [sos, ...prev];
            });
            setStats((prev: any) => ({
                ...prev,
                total_sos: (prev?.total_sos || 0) + 1
            }));
        };

        const handleIncidentCreated = (incident: any) => {
            setIncidents(prev => {
                if (prev.some(item => item.id === incident.id)) return prev;
                return [incident, ...prev];
            });
            setStats((prev: any) => ({
                ...prev,
                total_incidents: (prev?.total_incidents || 0) + 1
            }));
        };

        const handleTaskUpdated = (task: any) => {
            console.log('Task updated:', task);
            // We still reload data to update all stats and relationships accurately
            loadData();
        };

        const handleTaskAssigned = (task: any) => {
            console.log('Task assigned:', task);
            loadData();
        };

        const handleSOSUpdated = (sos: any) => {
            console.log('SOS updated:', sos);
            setSosList(prev => prev.map(item => item.id === sos.id ? sos : item));
        };

        const handleIncidentUpdated = (incident: any) => {
            console.log('Incident updated:', incident);
            setIncidents(prev => prev.map(item => item.id === incident.id ? incident : item));
        };

        const handleVolunteerStatusChanged = (data: any) => {
            console.log('Volunteer status changed:', data);
            setVolunteers(prev => prev.map(v => v.id === data.id ? { ...v, volunteer_status: data.volunteer_status } : v));
            // Update stats for active volunteers
            loadData();
        };

        socketService.on('sos_created', handleSOSCreated);
        socketService.on('incident_created', handleIncidentCreated);
        socketService.on('sos_updated', handleSOSUpdated);
        socketService.on('incident_updated', handleIncidentUpdated);
        socketService.on('task_updated', handleTaskUpdated);
        socketService.on('task_assigned', handleTaskAssigned);
        socketService.on('volunteer_status_changed', handleVolunteerStatusChanged);

        loadData();

        return () => {
            socketService.off('sos_created', handleSOSCreated);
            socketService.off('incident_created', handleIncidentCreated);
            socketService.off('sos_updated', handleSOSUpdated);
            socketService.off('incident_updated', handleIncidentUpdated);
            socketService.off('task_updated', handleTaskUpdated);
            socketService.off('task_assigned', handleTaskAssigned);
            socketService.off('volunteer_status_changed', handleVolunteerStatusChanged);
        };
    }, [isInitialized, isAuthenticated, user, router]);

    const getStatusBadgeClass = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'badge-danger';
            case 'assigned': return 'badge-warning';
            case 'accepted': return 'badge-info';
            case 'responding': return 'badge-info';
            case 'on_site': return 'badge-primary';
            case 'completed':
            case 'resolved': return 'badge-success';
            default: return 'badge-secondary';
        }
    };

    const loadData = async () => {
        try {
            const [statsRes, sosRes, incidentRes, volunteerRes, userRes] = await Promise.all([
                dashboardAPI.getStats(),
                sosAPI.getAll(),
                incidentAPI.getAll(),
                userAPI.getAll('volunteer'),
                userAPI.getAll('citizen'),
            ]);

            setStats(statsRes.data);
            setSosList(sosRes.data);
            setIncidents(incidentRes.data);
            setVolunteers(volunteerRes.data);
            setUsers(userRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignTask = async (volunteerId: number) => {
        if (!selectedItem) return;

        try {
            const taskData: any = {
                volunteer_id: volunteerId,
            };

            if (selectedItem.type === 'sos') {
                taskData.sos_request_id = selectedItem.id;
            } else {
                taskData.incident_report_id = selectedItem.id;
            }

            await taskAPI.create(taskData);
            alert('Task assigned successfully!');
            setShowAssignModal(false);
            setSelectedItem(null);
            loadData();
        } catch (error) {
            console.error('Failed to assign task:', error);
            alert('Failed to assign task');
        }
    };

    const generateVolunteerId = () => {
        if (volunteers.length === 0) return 'VOL001';

        // Get highest volunteer ID number
        const maxId = volunteers.reduce((max, vol) => {
            const num = parseInt(vol.volunteer_id?.replace('VOL', '') || '0');
            return num > max ? num : max;
        }, 0);

        const nextNum = maxId + 1;
        return `VOL${nextNum.toString().padStart(3, '0')}`;
    };

    const handleCreateVolunteer = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!volunteerForm.full_name || !volunteerForm.password) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const volunteerId = volunteerForm.volunteer_id || generateVolunteerId();

            await authAPI.register({
                volunteer_id: volunteerId,
                full_name: volunteerForm.full_name,
                email: volunteerForm.email || undefined,
                phone: volunteerForm.phone || undefined,
                password: volunteerForm.password,
                role: 'volunteer'
            });

            alert(`Volunteer created successfully!\n\nVolunteer ID: ${volunteerId}\nPassword: ${volunteerForm.password}\n\nPlease share these credentials with the volunteer.`);

            setShowAddVolunteerModal(false);
            setVolunteerForm({
                full_name: '',
                email: '',
                phone: '',
                password: '',
                volunteer_id: ''
            });
            loadData();
        } catch (error: any) {
            console.error('Failed to create volunteer:', error);
            alert(error.response?.data?.detail || 'Failed to create volunteer');
        }
    };

    // Edit handlers
    const handleEdit = (item: any, type: 'sos' | 'incident' | 'user') => {
        setSelectedItem({ ...item, itemType: type });
        setEditForm({ ...item });
        setShowEditModal(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        try {
            if (selectedItem.itemType === 'sos') {
                await sosAPI.update(selectedItem.id, {
                    address: editForm.address,
                    status: editForm.status,
                    latitude: editForm.latitude,
                    longitude: editForm.longitude
                });
                alert('SOS updated successfully!');
            } else if (selectedItem.itemType === 'incident') {
                await incidentAPI.update(selectedItem.id, {
                    title: editForm.title,
                    description: editForm.description,
                    incident_type: editForm.incident_type,
                    status: editForm.status
                });
                alert('Incident updated successfully!');
            } else if (selectedItem.itemType === 'user') {
                await userAPI.updateUser(selectedItem.id, {
                    full_name: editForm.full_name,
                    address: editForm.address,
                    volunteer_status: editForm.volunteer_status
                });
                alert('User updated successfully!');
            }

            setShowEditModal(false);
            loadData();
        } catch (error) {
            console.error('Update failed:', error);
            alert('Failed to update');
        }
    };

    // Delete handlers
    const handleDelete = async (id: number, type: 'sos' | 'incident' | 'user') => {
        const confirmMsg = `Are you sure you want to delete this ${type}?`;
        if (!confirm(confirmMsg)) return;

        try {
            if (type === 'sos') {
                await sosAPI.delete(id);
                alert('SOS deleted successfully!');
            } else if (type === 'incident') {
                await incidentAPI.delete(id);
                alert('Incident deleted successfully!');
            } else if (type === 'user') {
                await userAPI.deleteUser(id);
                alert('User deleted successfully!');
            }

            loadData();
        } catch (error: any) {
            console.error('Delete failed:', error);
            alert(error.response?.data?.detail || 'Failed to delete');
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
                            <h1 className="text-2xl font-bold">Command Center</h1>
                            <p className="text-sm text-gray-400">Admin Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm">{user?.full_name}</p>
                            <p className="text-xs text-gray-400">Administrator</p>
                        </div>
                        <button
                            onClick={() => router.push('/admin/chat')}
                            className="btn bg-dark-700 hover:bg-dark-600 border border-gray-600"
                        >
                            💬 Chats
                        </button>
                        <button onClick={handleLogout} className="btn btn-secondary">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="card">
                        <h3 className="text-sm font-semibold text-gray-400 mb-1">Total SOS</h3>
                        <p className="text-3xl font-bold text-danger">{stats?.total_sos || 0}</p>
                    </div>
                    <div className="card">
                        <h3 className="text-sm font-semibold text-gray-400 mb-1">Total Incidents</h3>
                        <p className="text-3xl font-bold text-yellow-400">{stats?.total_incidents || 0}</p>
                    </div>
                    <div className="card">
                        <h3 className="text-sm font-semibold text-gray-400 mb-1">Pending Tasks</h3>
                        <p className="text-3xl font-bold text-orange-400">{stats?.pending_tasks || 0}</p>
                    </div>
                    <div className="card">
                        <h3 className="text-sm font-semibold text-gray-400 mb-1">Active Volunteers</h3>
                        <p className="text-3xl font-bold text-green-400">{stats?.active_volunteers || 0}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Panel - Incident Feed */}
                    <div className="lg:col-span-1">
                        <div className="card">
                            <h3 className="font-bold mb-4">Management</h3>

                            {/* Tabs */}
                            <div className="space-y-2 mb-4">
                                <button
                                    onClick={() => setActiveTab('sos')}
                                    className={`w-full text-left px-4 py-2 rounded-lg transition ${activeTab === 'sos' ? 'bg-danger text-white' : 'bg-dark-700'
                                        }`}
                                >
                                    🆘 SOS Requests ({sosList.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('incidents')}
                                    className={`w-full text-left px-4 py-2 rounded-lg transition ${activeTab === 'incidents' ? 'bg-primary text-white' : 'bg-dark-700'
                                        }`}
                                >
                                    📝 Incident Reports ({incidents.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('volunteers')}
                                    className={`w-full text-left px-4 py-2 rounded-lg transition ${activeTab === 'volunteers' ? 'bg-green-600 text-white' : 'bg-dark-700'
                                        }`}
                                >
                                    👥 Volunteers ({volunteers.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('users')}
                                    className={`w-full text-left px-4 py-2 rounded-lg transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-dark-700'
                                        }`}
                                >
                                    👤 Citizens ({users.length})
                                </button>
                            </div>

                            {/* Add Volunteer Button */}
                            {activeTab === 'volunteers' && (
                                <button
                                    onClick={() => {
                                        setVolunteerForm({ ...volunteerForm, volunteer_id: generateVolunteerId() });
                                        setShowAddVolunteerModal(true);
                                    }}
                                    className="btn btn-primary w-full mb-4"
                                >
                                    + Add Volunteer
                                </button>
                            )}

                            {/* List */}
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {activeTab === 'sos' && sosList.map((sos: any) => (
                                    <div key={sos.id} className="bg-dark-700 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-danger">SOS Emergency</h4>
                                            <span className={`badge ${getStatusBadgeClass(sos.status)}`}>
                                                {sos.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2">{sos.address}</p>
                                        <p className="text-xs text-gray-500">By: {sos.citizen?.full_name}</p>

                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedItem({ ...sos, type: 'sos' });
                                                    setShowAssignModal(true);
                                                }}
                                                className="btn btn-primary flex-1 text-sm py-2"
                                            >
                                                Assign
                                            </button>
                                            <button
                                                onClick={() => handleEdit(sos, 'sos')}
                                                className="btn btn-secondary text-sm py-2 px-3"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(sos.id, 'sos')}
                                                className="btn btn-danger text-sm py-2 px-3"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {activeTab === 'incidents' && incidents.map((incident: any) => (
                                    <div key={incident.id} className="bg-dark-700 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold">{incident.title}</h4>
                                            <span className={`badge ${getStatusBadgeClass(incident.status)}`}>
                                                {incident.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2">{incident.description}</p>
                                        <p className="text-xs text-gray-500">Type: {incident.incident_type}</p>

                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedItem({ ...incident, type: 'incident' });
                                                    setShowAssignModal(true);
                                                }}
                                                className="btn btn-primary flex-1 text-sm py-2"
                                            >
                                                Assign
                                            </button>
                                            <button
                                                onClick={() => handleEdit(incident, 'incident')}
                                                className="btn btn-secondary text-sm py-2 px-3"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(incident.id, 'incident')}
                                                className="btn btn-danger text-sm py-2 px-3"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {activeTab === 'volunteers' && volunteers.map((volunteer: any) => (
                                    <div key={volunteer.id} className="bg-dark-700 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold">{volunteer.full_name}</h4>
                                            <span className={`badge ${volunteer.volunteer_status === 'online' ? 'badge-success' : 'badge-secondary'
                                                }`}>
                                                {volunteer.volunteer_status || 'offline'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2">ID: {volunteer.volunteer_id}</p>

                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => handleEdit(volunteer, 'user')}
                                                className="btn btn-secondary flex-1 text-sm py-2"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(volunteer.id, 'user')}
                                                className="btn btn-danger flex-1 text-sm py-2"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {activeTab === 'users' && users.map((user: any) => (
                                    <div key={user.id} className="bg-dark-700 rounded-lg p-4">
                                        <h4 className="font-semibold mb-2">{user.full_name}</h4>
                                        <p className="text-sm text-gray-400 mb-2">Phone: {user.phone}</p>

                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => handleEdit(user, 'user')}
                                                className="btn btn-secondary flex-1 text-sm py-2"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id, 'user')}
                                                className="btn btn-danger flex-1 text-sm py-2"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Center - Map */}
                    <div className="lg:col-span-2">
                        <div className="card">
                            <h3 className="text-xl font-bold mb-6">Live Emergency Map</h3>
                            <Map
                                center={sosList[0]?.longitude && sosList[0]?.latitude
                                    ? [sosList[0].longitude, sosList[0].latitude]
                                    : incidents[0]?.longitude && incidents[0]?.latitude
                                        ? [incidents[0].longitude, incidents[0].latitude]
                                        : undefined}
                                zoom={11}
                                sosRequests={sosList}
                                incidents={incidents}
                                volunteers={volunteers}
                                className="h-96"
                            />
                        </div>

                        <div className="card mt-6">
                            <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="btn btn-primary">
                                    📢 Broadcast Message
                                </button>
                                <button className="btn btn-secondary">
                                    📊 View Reports
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4">Assign Volunteer</h2>
                        <div className="mb-4 p-4 bg-dark-700 rounded-lg">
                            <h3 className="font-semibold mb-2">
                                {selectedItem?.type === 'sos' ? 'SOS Emergency' : selectedItem?.title}
                            </h3>
                            <p className="text-sm text-gray-400">
                                {selectedItem?.address || selectedItem?.description}
                            </p>
                        </div>

                        <h3 className="font-semibold mb-3">Available Volunteers</h3>
                        <div className="space-y-2 mb-6">
                            {volunteers.filter(v => v.volunteer_status === 'online').map((volunteer: any) => (
                                <div
                                    key={volunteer.id}
                                    className="flex justify-between items-center p-4 bg-dark-700 rounded-lg"
                                >
                                    <div>
                                        <h4 className="font-semibold">{volunteer.full_name}</h4>
                                        <p className="text-sm text-gray-400">{volunteer.volunteer_id}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAssignTask(volunteer.id)}
                                        className="btn btn-primary text-sm py-2"
                                    >
                                        Assign
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setShowAssignModal(false)} className="btn btn-secondary w-full">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Add Volunteer Modal */}
            {showAddVolunteerModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Add New Volunteer</h2>

                        <form onSubmit={handleCreateVolunteer} className="space-y-4">
                            {/* Auto-generated Volunteer ID */}
                            <div>
                                <label className="block text-sm font-semibold mb-2">Volunteer ID</label>
                                <input
                                    type="text"
                                    value={volunteerForm.volunteer_id}
                                    onChange={(e) => setVolunteerForm({ ...volunteerForm, volunteer_id: e.target.value })}
                                    className="input"
                                    placeholder="Auto-generated"
                                    readOnly
                                />
                                <p className="text-xs text-gray-400 mt-1">Auto-generated unique ID</p>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-semibold mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    value={volunteerForm.full_name}
                                    onChange={(e) => setVolunteerForm({ ...volunteerForm, full_name: e.target.value })}
                                    className="input"
                                    placeholder="Enter volunteer's full name"
                                    required
                                />
                            </div>

                            {/* Email (Optional) */}
                            <div>
                                <label className="block text-sm font-semibold mb-2">Email (Optional)</label>
                                <input
                                    type="email"
                                    value={volunteerForm.email}
                                    onChange={(e) => setVolunteerForm({ ...volunteerForm, email: e.target.value })}
                                    className="input"
                                    placeholder="volunteer@example.com"
                                />
                            </div>

                            {/* Phone (Optional) */}
                            <div>
                                <label className="block text-sm font-semibold mb-2">Phone (Optional)</label>
                                <input
                                    type="tel"
                                    value={volunteerForm.phone}
                                    onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                                    className="input"
                                    placeholder="1234567890"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-semibold mb-2">Temporary Password *</label>
                                <input
                                    type="text"
                                    value={volunteerForm.password}
                                    onChange={(e) => setVolunteerForm({ ...volunteerForm, password: e.target.value })}
                                    className="input"
                                    placeholder="Enter temporary password"
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">Share this with the volunteer</p>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                <p className="text-yellow-400 text-sm">
                                    ⚠️ <strong>Important:</strong> Save the Volunteer ID and password to share with the volunteer. They'll need these credentials to login.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="flex space-x-4 pt-2">
                                <button type="submit" className="btn btn-primary flex-1">
                                    Create Volunteer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddVolunteerModal(false);
                                        setVolunteerForm({
                                            full_name: '',
                                            email: '',
                                            phone: '',
                                            password: '',
                                            volunteer_id: ''
                                        });
                                    }}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedItem && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-6">
                            Edit {selectedItem.itemType === 'sos' ? 'SOS Request' :
                                selectedItem.itemType === 'incident' ? 'Incident' : 'User'}
                        </h2>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            {/* SOS Fields */}
                            {selectedItem.itemType === 'sos' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Address</label>
                                        <input
                                            type="text"
                                            value={editForm.address || ''}
                                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2">Latitude</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={editForm.latitude || ''}
                                                onChange={(e) => setEditForm({ ...editForm, latitude: parseFloat(e.target.value) })}
                                                className="input w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-2">Longitude</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={editForm.longitude || ''}
                                                onChange={(e) => setEditForm({ ...editForm, longitude: parseFloat(e.target.value) })}
                                                className="input w-full"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Status</label>
                                        <select
                                            value={editForm.status || ''}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            className="input w-full"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="responding">Responding</option>
                                            <option value="on_site">On Site</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Incident Fields */}
                            {selectedItem.itemType === 'incident' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Title</label>
                                        <input
                                            type="text"
                                            value={editForm.title || ''}
                                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Description</label>
                                        <textarea
                                            value={editForm.description || ''}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            className="input w-full"
                                            rows={4}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Type</label>
                                        <select
                                            value={editForm.incident_type || ''}
                                            onChange={(e) => setEditForm({ ...editForm, incident_type: e.target.value })}
                                            className="input w-full"
                                        >
                                            <option value="fire">Fire</option>
                                            <option value="medical">Medical</option>
                                            <option value="accident">Accident</option>
                                            <option value="natural_disaster">Natural Disaster</option>
                                            <option value="crime">Crime</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Status</label>
                                        <select
                                            value={editForm.status || ''}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            className="input w-full"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="accepted">Accepted</option>
                                            <option value="responding">Investigating</option>
                                            <option value="completed">Resolved</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* User Fields */}
                            {selectedItem.itemType === 'user' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            value={editForm.full_name || ''}
                                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Address</label>
                                        <input
                                            type="text"
                                            value={editForm.address || ''}
                                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                    {selectedItem.role === 'volunteer' && (
                                        <div>
                                            <label className="block text-sm font-semibold mb-2">Status</label>
                                            <select
                                                value={editForm.volunteer_status || 'offline'}
                                                onChange={(e) => setEditForm({ ...editForm, volunteer_status: e.target.value })}
                                                className="input w-full"
                                            >
                                                <option value="online">Online</option>
                                                <option value="offline">Offline</option>
                                                <option value="busy">Busy</option>
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Buttons */}
                            <div className="flex space-x-4 pt-2">
                                <button type="submit" className="btn btn-primary flex-1">
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
