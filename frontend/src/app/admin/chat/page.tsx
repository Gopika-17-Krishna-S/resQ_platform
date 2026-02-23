'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { userAPI, messageAPI } from '@/lib/api';
import { socketService } from '@/lib/socket';

export default function AdminChatPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const [volunteers, setVolunteers] = useState<any[]>([]);
    const [selectedVolunteer, setSelectedVolunteer] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'admin') {
            router.push('/');
            return;
        }

        loadVolunteers();

        if (user?.id) {
            socketService.connect(user.id);
        }

        // Listen for new user events (volunteer added/deleted)
        socketService.on('user_updated', loadVolunteers);
        socketService.on('user_deleted', loadVolunteers);

        // Listen for incoming messages
        socketService.on('new_message', (msg: any) => {
            // If the message is from the currently selected volunteer OR sent by me to them
            if (selectedVolunteer) {
                const isFromSelected = msg.sender_id === selectedVolunteer.id;
                const isToSelected = msg.recipient_id === selectedVolunteer.id;

                if (isFromSelected || isToSelected) {
                    setMessages(prev => [...prev, msg]);
                    scrollToBottom();
                }
            }
            // Enhance: You could update an unread count or move the volunteer to top of list
        });

        return () => {
            socketService.disconnect();
        };
    }, [isAuthenticated, user, router, selectedVolunteer]);
    // Note: selectedVolunteer in dependency might cause listener re-binding, which is fine but maybe inefficient. 
    // Ideally use a ref for selectedVolunteer inside the listener or check active state.

    // Re-fetch messages when selected volunteer changes
    useEffect(() => {
        if (selectedVolunteer) {
            loadMessages(selectedVolunteer.id);
        } else {
            setMessages([]);
        }
    }, [selectedVolunteer]);

    const loadVolunteers = async () => {
        try {
            const res = await userAPI.getAll('volunteer');
            setVolunteers(res.data);
        } catch (error) {
            console.error('Failed to load volunteers:', error);
        }
    };

    const loadMessages = async (volunteerId: number) => {
        try {
            setLoading(true);
            // Fetch conversation with this volunteer
            const res = await messageAPI.getAll(undefined, volunteerId);
            setMessages(res.data);
            scrollToBottom();
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedVolunteer) return;

        try {
            const msgContent = newMessage;
            setNewMessage(''); // Clear input immediately

            // Optimistic update
            const tempMsg = {
                id: Date.now(),
                content: msgContent,
                sender_id: user?.id,
                created_at: new Date().toISOString(),
                is_read: false
            };
            setMessages(prev => [...prev, tempMsg]);
            scrollToBottom();

            await messageAPI.send({
                content: msgContent,
                recipient_id: selectedVolunteer.id
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message');
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white flex">
            {/* Sidebar - Volunteers List */}
            <div className="w-80 bg-dark-800 border-r border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <h1 className="text-xl font-bold">💬 Admin Chat</h1>
                    <button
                        onClick={() => router.push('/admin')}
                        className="text-sm text-gray-400 hover:text-white mt-1"
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {volunteers.map(volunteer => (
                        <div
                            key={volunteer.id}
                            onClick={() => setSelectedVolunteer(volunteer)}
                            className={`p-4 border-b border-dark-700 cursor-pointer hover:bg-dark-700 transition ${selectedVolunteer?.id === volunteer.id ? 'bg-dark-700 border-l-4 border-primary' : ''
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="font-semibold">{volunteer.full_name}</h3>
                                {volunteer.volunteer_status === 'online' && (
                                    <span className="w-2 h-2 rounded-full bg-green-500 mt-2"></span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">ID: {volunteer.volunteer_id}</p>
                        </div>
                    ))}
                    {volunteers.length === 0 && (
                        <div className="p-4 text-center text-gray-500">
                            No volunteers found
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-dark-900">
                {selectedVolunteer ? (
                    <>
                        {/* Header */}
                        <div className="p-4 bg-dark-800 border-b border-gray-700 flex justify-between items-center">
                            <div>
                                <h2 className="font-bold text-lg">{selectedVolunteer.full_name}</h2>
                                <p className="text-sm text-gray-400">ID: {selectedVolunteer.volunteer_id}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${selectedVolunteer.volunteer_status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                {selectedVolunteer.volunteer_status || 'offline'}
                            </span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loading ? (
                                <div className="text-center text-gray-500 mt-10">Loading conversation...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">
                                    <p>No messages yet.</p>
                                    <p className="text-sm">Type a message to start chatting!</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === user?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-lg px-4 py-2 ${isMe
                                                        ? 'bg-primary text-white rounded-tr-none'
                                                        : 'bg-dark-700 text-gray-200 rounded-tl-none'
                                                    }`}
                                            >
                                                <p>{msg.content}</p>
                                                <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-4 bg-dark-800 border-t border-gray-700 flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-dark-600 border-none rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="btn btn-primary px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <div className="text-6xl mb-4">💬</div>
                        <h2 className="text-xl font-bold mb-2">Select a volunteer to chat</h2>
                        <p>Choose a name from the list to view conversation history</p>
                    </div>
                )}
            </div>
        </div>
    );
}
