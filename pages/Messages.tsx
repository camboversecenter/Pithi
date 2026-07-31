
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserById } from '../services/authService';
import {
    getConversation, getConversations, markConversationRead, sendDirectMessage, subscribeToMessages
} from '../services/chatService';
import { uploadImage } from '../services/storageService';
import { Conversation, DirectMessage, User } from '../types';
import { Card } from '../components/UIComponents';
import { ChatComposer, ChatAttachmentView, ComposedMessage } from '../components/ChatComposer';
import { ArrowLeft, MessagesSquare, Loader2, Search } from 'lucide-react';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';

const ROLE_LABELS: Record<string, string> = {
    GENERAL_USER: 'ម្ចាស់កម្មវិធី',
    ORGANIZER: 'អ្នករៀបចំកម្មវិធី',
    CHEF: 'ចុងភៅ',
    HALL: 'សាលពិធី',
    MUSIC_BAND: 'ក្រុមតន្ត្រី',
    BEAUTY_SALON: 'សម្អាងការ',
    ADMIN: 'អ្នកគ្រប់គ្រង'
};

const Messages = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const partnerId = searchParams.get('with');
    const { showAlert } = useGlobalDialog();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [partner, setPartner] = useState<User | null>(null);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const loadConversations = useCallback(async () => {
        if (!user) return;
        setLoadingList(true);
        try {
            setConversations(await getConversations(user.id));
        } finally {
            setLoadingList(false);
        }
    }, [user?.id]);

    const loadThread = useCallback(async () => {
        if (!user || !partnerId) {
            setMessages([]);
            setPartner(null);
            return;
        }
        setLoadingThread(true);
        try {
            const [thread, profile] = await Promise.all([
                getConversation(user.id, partnerId),
                getUserById(partnerId)
            ]);
            setMessages(thread);
            setPartner(profile);
            await markConversationRead(user.id, partnerId);
            setConversations(list => list.map(c => c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c));
        } finally {
            setLoadingThread(false);
        }
    }, [user?.id, partnerId]);

    useEffect(() => { loadConversations(); }, [loadConversations]);
    useEffect(() => { loadThread(); }, [loadThread]);

    // Live updates: append to the open thread, refresh the list otherwise.
    useEffect(() => {
        if (!user) return;
        return subscribeToMessages(user.id, message => {
            if (message.senderId === partnerId) {
                setMessages(list => (list.some(m => m.id === message.id) ? list : [...list, message]));
                markConversationRead(user.id, partnerId);
            } else {
                loadConversations();
            }
        });
    }, [user?.id, partnerId, loadConversations]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const filteredConversations = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return conversations;
        return conversations.filter(c => c.partnerName.toLowerCase().includes(query));
    }, [conversations, search]);

    if (!user) return null;

    const handleSend = async ({ text, file, kind }: ComposedMessage) => {
        if (!partnerId) return;
        setSending(true);
        try {
            let attachmentUrl: string | undefined;
            if (file && kind) {
                attachmentUrl = await uploadImage(file, 'chat');
            }
            const sent = await sendDirectMessage({
                sender: { id: user.id, name: user.name },
                recipientId: partnerId,
                recipientName: partner?.name || 'User',
                content: text,
                attachmentUrl,
                attachmentType: kind || null
            });
            setMessages(list => [...list, sent]);
            loadConversations();
        } catch (error: any) {
            await showAlert('បរាជ័យ', error.message || 'មិនអាចផ្ញើសារបានទេ។', 'danger');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                <button onClick={() => navigate('/')} className="p-3 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-full transition-all text-slate-500">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-serif">សារឆ្លើយឆ្លង</h1>
                    <p className="text-slate-500 mt-1">ពិភាក្សា និងចរចាដោយផ្ទាល់ជាមួយអ្នកផ្តល់សេវា អ្នករៀបចំ ឬម្ចាស់កម្មវិធី។</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Conversation list */}
                <Card noPadding className={`overflow-hidden ${partnerId ? 'hidden lg:block' : ''}`}>
                    <div className="p-3 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                            <input
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-100"
                                placeholder="ស្វែងរក..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
                        {loadingList ? (
                            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-rose-400" /></div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-sm px-6">
                                <MessagesSquare size={32} className="mx-auto mb-3 opacity-30" />
                                មិនទាន់មានការសន្ទនាទេ។ ចាប់ផ្តើមពីទីផ្សារ ឬពីទំព័រការកក់។
                            </div>
                        ) : filteredConversations.map(conversation => (
                            <button
                                key={conversation.partnerId}
                                onClick={() => setSearchParams({ with: conversation.partnerId })}
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                                    conversation.partnerId === partnerId ? 'bg-rose-50' : 'hover:bg-slate-50'
                                }`}
                            >
                                <img
                                    src={conversation.partnerAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.partnerName)}&background=random`}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                                    alt=""
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-bold text-slate-800 text-sm truncate">{conversation.partnerName}</p>
                                        {conversation.unreadCount > 0 && (
                                            <span className="bg-rose-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                                                {conversation.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{conversation.lastMessage || '—'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Thread */}
                <div className="lg:col-span-2">
                    {!partnerId ? (
                        <Card className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
                            <MessagesSquare size={40} className="mb-4 opacity-30" />
                            <p className="text-sm">ជ្រើសរើសការសន្ទនាមួយដើម្បីចាប់ផ្តើម។</p>
                        </Card>
                    ) : (
                        <Card noPadding className="flex flex-col h-[65vh]">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                                <button
                                    onClick={() => setSearchParams({})}
                                    className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <img
                                    src={partner?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner?.name || 'User')}&background=random`}
                                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                    alt=""
                                />
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{partner?.name || 'អ្នកប្រើប្រាស់'}</p>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">
                                        {ROLE_LABELS[partner?.role || ''] || partner?.role || ''}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
                                {loadingThread ? (
                                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-rose-400" /></div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-slate-400 text-sm py-12">
                                        មិនទាន់មានសារទេ។ សរសេរសារដំបូងដើម្បីចាប់ផ្តើមការចរចា។
                                    </div>
                                ) : messages.map(message => {
                                    const isMine = message.senderId === user.id;
                                    return (
                                        <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                                                isMine ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                                            }`}>
                                                {message.content && <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>}
                                                <ChatAttachmentView url={message.attachmentUrl} type={message.attachmentType} />
                                                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                                                    {new Date(message.createdAt).toLocaleString('km-KH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            <div className="p-3 border-t border-slate-100 bg-white">
                                <ChatComposer onSend={handleSend} sending={sending} />
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;
