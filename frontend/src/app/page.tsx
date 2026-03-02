'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [activeTab, setActiveTab] = useState<'citizen' | 'volunteer' | 'admin'>('citizen');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                // Register
                const registerData: any = {
                    full_name: fullName,
                    password,
                    role: activeTab,
                };

                if (activeTab === 'citizen') {
                    registerData.phone = identifier;
                } else if (activeTab === 'volunteer') {
                    registerData.volunteer_id = identifier;
                } else {
                    registerData.email = identifier;
                }

                const response = await authAPI.register(registerData);
                const { access_token, refresh_token, user } = response.data;

                setAuth(user, access_token, refresh_token);
                router.push(`/${activeTab}`);
            } else {
                // Login
                const response = await authAPI.login(identifier, password, activeTab);
                const { access_token, refresh_token, user } = response.data;

                setAuth(user, access_token, refresh_token);
                router.push(`/${activeTab}`);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const getPlaceholder = () => {
        if (activeTab === 'citizen') return 'Phone Number';
        if (activeTab === 'volunteer') return 'Volunteer ID';
        return 'Official Email';
    };

    const getButtonText = () => {
        if (activeTab === 'citizen') return isRegister ? 'Register' : 'Login';
        if (activeTab === 'volunteer') return 'Volunteer Login';
        return 'Admin Access';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark via-dark-800 to-dark">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-700">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <img src="/logo.png" alt="resQ Logo" className="w-10 h-10 rounded-lg object-cover" />
                    </div>
                    <button className="btn btn-danger px-8">
                        EMERGENCY SOS
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6">
                        Rapid Response. <br />
                        <span className="text-primary">When Seconds Count.</span>
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
                        Connect with emergency responders instantly. Your safety is our priority.
                    </p>
                </div>

                {/* Role Selection Cards */}
                <div className="max-w-6xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Citizen Card */}
                    <div
                        className={`card card-hover cursor-pointer ${activeTab === 'citizen' ? 'border-primary ring-2 ring-primary/30' : ''}`}
                        onClick={() => setActiveTab('citizen')}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Citizen</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Report emergencies and get help fast
                            </p>

                            {activeTab === 'citizen' && (
                                <form onSubmit={handleSubmit} className="mt-6 text-left">
                                    {isRegister && (
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="input mb-3"
                                            required
                                        />
                                    )}
                                    <input
                                        type="tel"
                                        placeholder={getPlaceholder()}
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="input mb-3"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input mb-4"
                                        required
                                    />
                                    {error && <p className="text-danger text-sm mb-3">{error}</p>}
                                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                                        {loading ? 'Please wait...' : getButtonText()}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsRegister(!isRegister)}
                                        className="text-primary text-sm mt-3 w-full text-center"
                                    >
                                        {isRegister ? 'Already have an account? Login' : 'New user? Register'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Volunteer Card */}
                    <div
                        className={`card card-hover cursor-pointer ${activeTab === 'volunteer' ? 'border-primary ring-2 ring-primary/30' : ''}`}
                        onClick={() => setActiveTab('volunteer')}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Volunteer</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Respond to emergencies in your area
                            </p>

                            {activeTab === 'volunteer' && (
                                <form onSubmit={handleSubmit} className="mt-6 text-left">
                                    <input
                                        type="text"
                                        placeholder={getPlaceholder()}
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="input mb-3"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input mb-4"
                                        required
                                    />
                                    {error && <p className="text-danger text-sm mb-3">{error}</p>}
                                    <button type="submit" className="btn btn-secondary w-full" disabled={loading}>
                                        {loading ? 'Please wait...' : getButtonText()}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Admin Card */}
                    <div
                        className={`card card-hover cursor-pointer ${activeTab === 'admin' ? 'border-primary ring-2 ring-primary/30' : ''}`}
                        onClick={() => setActiveTab('admin')}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Command Center</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Manage and coordinate responses
                            </p>

                            {activeTab === 'admin' && (
                                <form onSubmit={handleSubmit} className="mt-6 text-left">
                                    <input
                                        type="email"
                                        placeholder={getPlaceholder()}
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="input mb-3"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input mb-4"
                                        required
                                    />
                                    {error && <p className="text-danger text-sm mb-3">{error}</p>}
                                    <button type="submit" className="btn btn-secondary w-full" disabled={loading}>
                                        {loading ? 'Please wait...' : getButtonText()}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="max-w-6xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                        <h3 className="text-2xl font-bold mb-6">How resQ Works</h3>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-4">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                    <span className="text-white font-bold">1</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">Report Emergency</h4>
                                    <p className="text-gray-400 text-sm">
                                        Click SOS or report an incident with your location
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                    <span className="text-white font-bold">2</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">Instant Dispatch</h4>
                                    <p className="text-gray-400 text-sm">
                                        Nearest volunteers are notified immediately
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                    <span className="text-white font-bold">3</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">Get Help</h4>
                                    <p className="text-gray-400 text-sm">
                                        Track response in real-time and communicate with responders
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-2xl font-bold mb-4">Get the Mobile App</h3>
                        <p className="text-gray-400 mb-6">
                            Download resQ for instant access to emergency services
                        </p>
                        <div className="flex space-x-4">
                            <button className="flex-1 btn btn-secondary">
                                <span>App Store</span>
                            </button>
                            <button className="flex-1 btn btn-secondary">
                                <span>Play Store</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-dark-700 py-8 mt-20">
                <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
                    <div className="flex justify-center space-x-8 mb-4">
                        <a href="#" className="hover:text-primary transition">Privacy</a>
                        <a href="#" className="hover:text-primary transition">Terms</a>
                        <a href="#" className="hover:text-primary transition">Support</a>
                    </div>
                    <p>&copy; 2026 resQ. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
