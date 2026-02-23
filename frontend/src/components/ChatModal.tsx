import { useState, useEffect, useRef } from 'react';
import { messageAPI } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId?: number;
    contactId?: number;
    contactName: string;
    title?: string;
}

export default function ChatModal({ isOpen, onClose, taskId, contactId, contactName, title }: ChatModalProps) {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch messages on open
    useEffect(() => {
        if (isOpen && (taskId || contactId)) {
            loadMessages();
            // Connect to socket if not connected
            if (!socketService.isConnected()) {
                if (user?.id) socketService.connect(user.id);
            }
        }
    }, [isOpen, taskId, contactId, user]);

    // Listen for new messages
    useEffect(() => {
        if (!isOpen) return;

        const handleNewMessage = (msg: any) => {
            // Check if message belongs to this chat
            if (taskId && msg.task_id === taskId) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            } else if (contactId && (msg.sender_id === contactId || msg.recipient_id === contactId)) {
                // For 1-on-1 chat
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            }
        };

        socketService.on('new_message', handleNewMessage);

        // Also listen for broadcasts if applicable? Probably not for specific chat.

        return () => {
            socketService.off('new_message', handleNewMessage);
        };
    }, [isOpen, taskId, contactId]);

    const loadMessages = async () => {
        try {
            setLoading(true);
            const res = await messageAPI.getAll(taskId, contactId);
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
        if (!newMessage.trim()) return;

        try {
            const msgData: any = {
                content: newMessage,
                task_id: taskId,
                recipient_id: contactId
            };

            // Optimistic update
            const tempMsg = {
                id: Date.now(),
                content: newMessage,
                sender_id: user?.id,
                created_at: new Date().toISOString(),
                is_read: false
            };
            setMessages(prev => [...prev, tempMsg]);
            setNewMessage('');
            scrollToBottom();

            await messageAPI.send(msgData);
            // Actual message will come via socket or we can replace the temp one, 
            // but for simplicity we rely on socket or key stability
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="bg-dark-700 p-4 flex justify-between items-center border-b border-gray-700">
                    <div>
                        <h3 className="font-bold text-lg">{contactName}</h3>
                        {title && <p className="text-xs text-gray-400">{title}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-900">
                    {loading ? (
                        <div className="text-center text-gray-500 py-4">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            <p>No messages yet.</p>
                            <p className="text-sm">Start the conversation!</p>
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
                                        className={`max-w-[80%] rounded-lg px-4 py-2 ${isMe
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
                <form onSubmit={handleSend} className="p-4 bg-dark-700 border-t border-gray-700 flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-dark-600 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="btn btn-primary px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
