
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/authService';
import { getNotifications, deleteNotification } from '../services/notificationService';
import { useNotifications } from '../contexts/NotificationContext';
import { AppNotification, NotificationType } from '../types';
import { Card, Pagination } from '../components/UIComponents';
import {
    ArrowLeft, Bell, BellOff, CalendarPlus, CalendarCheck, MessageSquare,
    UserCheck, Star, Gift, CheckCheck, Trash2, Send, Megaphone
} from 'lucide-react';

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
    BOOKING_CREATED: CalendarPlus,
    BOOKING_STATUS: CalendarCheck,
    BOOKING_COMMENT: MessageSquare,
    GUEST_RSVP: UserCheck,
    REVIEW: Star,
    GIFT_REPORTED: Gift,
    MESSAGE: Send,
    ANNOUNCEMENT: Megaphone
};

const timeAgo = (iso: string): string => {
    const diffMinutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (diffMinutes < 1) return 'អម្បាញ់មិញ';
    if (diffMinutes < 60) return `${diffMinutes} នាទីមុន`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours} ម៉ោងមុន`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ថ្ងៃមុន`;
    return new Date(iso).toLocaleDateString('km-KH', { day: 'numeric', month: 'long', year: 'numeric' });
};

const Notifications = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const { unreadCount, markRead, markAllRead } = useNotifications();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 15;

    const loadData = useCallback(async (page: number) => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await getNotifications(user.id, page, itemsPerPage);
            setNotifications(response.data);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadData(currentPage);
    }, [currentPage, loadData]);

    if (!user) return null;

    const handleOpen = async (notification: AppNotification) => {
        if (!notification.isRead) {
            setNotifications(list => list.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
            await markRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const handleMarkAllRead = async () => {
        setNotifications(list => list.map(n => ({ ...n, isRead: true })));
        await markAllRead();
    };

    const handleDelete = async (e: React.MouseEvent, notification: AppNotification) => {
        e.stopPropagation();
        setNotifications(list => list.filter(n => n.id !== notification.id));
        await deleteNotification(notification.id);
        if (!notification.isRead) {
            await markRead(notification.id); // refreshes the unread badge
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-3 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-full transition-all text-slate-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 font-serif flex items-center gap-3">
                            ការជូនដំណឹង
                            {unreadCount > 0 && (
                                <span className="text-sm bg-rose-600 text-white font-bold px-2.5 py-0.5 rounded-full">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-500 mt-1">តាមដានការកក់ ការឆ្លើយតបភ្ញៀវ និងព័ត៌មានថ្មីៗរបស់អ្នក។</p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-lg transition-colors w-fit"
                    >
                        <CheckCheck size={16} />
                        សម្គាល់ថាបានអានទាំងអស់
                    </button>
                )}
            </div>

            {loading ? (
                <Card className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
                </Card>
            ) : notifications.length === 0 ? (
                <Card className="py-20">
                    <div className="flex flex-col items-center text-slate-400">
                        <BellOff size={40} className="mb-4 opacity-30" />
                        <p className="font-medium">មិនទាន់មានការជូនដំណឹងទេ។</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card noPadding className="overflow-hidden divide-y divide-slate-100">
                        {notifications.map(notification => {
                            const Icon = TYPE_ICONS[notification.type] || Bell;
                            return (
                                <button
                                    key={notification.id}
                                    onClick={() => handleOpen(notification)}
                                    className={`w-full text-left flex items-start gap-4 px-5 py-4 transition-colors group ${notification.isRead ? 'bg-white hover:bg-slate-50' : 'bg-rose-50/50 hover:bg-rose-50'}`}
                                >
                                    <div className={`mt-0.5 p-2.5 rounded-xl flex-shrink-0 ${notification.isRead ? 'bg-slate-100 text-slate-400' : 'bg-rose-100 text-rose-600'}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm truncate ${notification.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                                                {notification.title}
                                            </p>
                                            {!notification.isRead && <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>}
                                        </div>
                                        {notification.body && (
                                            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{notification.body}</p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-1.5 font-medium">{timeAgo(notification.createdAt)}</p>
                                    </div>
                                    <span
                                        role="button"
                                        onClick={(e) => handleDelete(e, notification)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                                        title="លុប"
                                    >
                                        <Trash2 size={16} />
                                    </span>
                                </button>
                            );
                        })}
                    </Card>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            )}
        </div>
    );
};

export default Notifications;
