
import { AppNotification, PaginatedResponse } from '../types';
import { supabase } from './supabaseConfig';

// --- HELPER ---
const isLocalMode = () => {
    return !!localStorage.getItem('pithi_mock_user');
};

const LOCAL_KEY = 'pithi_local_notifications';

const getLocalNotifications = (userId: string): AppNotification[] => {
    try {
        const json = localStorage.getItem(LOCAL_KEY);
        if (!json) {
            const now = Date.now();
            const demo: AppNotification[] = [
                {
                    id: 'demo-notification-1',
                    userId,
                    type: 'BOOKING_STATUS',
                    title: 'ស្ថានភាពការកក់បានផ្លាស់ប្តូរ',
                    body: 'ការកក់ « អាហារពិធីមង្គលការ » ត្រូវបានបញ្ជាក់។',
                    link: '/bookings',
                    isRead: false,
                    createdAt: new Date(now - 60 * 60 * 1000).toISOString()
                },
                {
                    id: 'demo-notification-2',
                    userId,
                    type: 'GUEST_RSVP',
                    title: 'ការឆ្លើយតបនឹងការអញ្ជើញ',
                    body: 'សុខ ដារ៉ា បានទទួលយកការអញ្ជើញចូលរួម « ពិធីមង្គលការ សុភ័ក្រ្ត & ទេវី »។',
                    isRead: true,
                    createdAt: new Date(now - 26 * 60 * 60 * 1000).toISOString()
                }
            ];
            localStorage.setItem(LOCAL_KEY, JSON.stringify(demo));
            return demo;
        }
        return JSON.parse(json);
    } catch (e) {
        return [];
    }
};

const saveLocalNotifications = (notifications: AppNotification[]) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(notifications));
};

// Writes a notification into the local demo inbox. Live databases create
// notifications through SECURITY DEFINER triggers instead — a client is never
// allowed to insert a row for somebody else.
export const pushLocalNotification = (notification: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => {
    if (!isLocalMode()) return;
    const all = getLocalNotifications(notification.userId);
    all.unshift({
        ...notification,
        id: 'local-' + Math.random().toString(36).slice(2, 11),
        isRead: false,
        createdAt: new Date().toISOString()
    });
    saveLocalNotifications(all);
};

// --- QUERIES ---

export const getNotifications = async (userId: string, page: number, limit: number): Promise<PaginatedResponse<AppNotification>> => {
    const emptyResponse: PaginatedResponse<AppNotification> = { data: [], total: 0, page, limit, totalPages: 0 };

    if (isLocalMode()) {
        const all = getLocalNotifications(userId)
            .filter(n => n.userId === userId && !n.deletedAt)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const from = (page - 1) * limit;
        return {
            data: all.slice(from, from + limit),
            total: all.length,
            page,
            limit,
            totalPages: Math.ceil(all.length / limit)
        };
    }

    try {
        const from = (page - 1) * limit;
        const { data, error, count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('userId', userId)
            .is('deletedAt', null)
            .order('createdAt', { ascending: false })
            .range(from, from + limit - 1);
        if (error) throw error;
        return {
            data: (data as AppNotification[]) || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    } catch (err) {
        console.warn('getNotifications Supabase error:', err);
        return emptyResponse;
    }
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
    if (isLocalMode()) {
        return getLocalNotifications(userId).filter(n => n.userId === userId && !n.isRead && !n.deletedAt).length;
    }
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('userId', userId)
            .eq('isRead', false)
            .is('deletedAt', null);
        if (error) throw error;
        return count || 0;
    } catch (err) {
        console.warn('getUnreadNotificationCount Supabase error:', err);
        return 0;
    }
};

export const markNotificationRead = async (id: string): Promise<void> => {
    if (isLocalMode()) {
        const all = getLocalNotifications('');
        saveLocalNotifications(all.map(n => n.id === id ? { ...n, isRead: true, updatedAt: new Date().toISOString() } : n));
        return;
    }
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ isRead: true, updatedAt: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn('markNotificationRead Supabase error:', err);
    }
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
    if (isLocalMode()) {
        const all = getLocalNotifications(userId);
        saveLocalNotifications(all.map(n => n.userId === userId ? { ...n, isRead: true, updatedAt: new Date().toISOString() } : n));
        return;
    }
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ isRead: true, updatedAt: new Date().toISOString() })
            .eq('userId', userId)
            .eq('isRead', false);
        if (error) throw error;
    } catch (err) {
        console.warn('markAllNotificationsRead Supabase error:', err);
    }
};

export const deleteNotification = async (id: string): Promise<void> => {
    if (isLocalMode()) {
        const all = getLocalNotifications('');
        saveLocalNotifications(all.filter(n => n.id !== id));
        return;
    }
    try {
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn('deleteNotification Supabase error:', err);
    }
};

// --- REALTIME ---

// Streams newly inserted notifications for this user. RLS restricts the
// stream to the user's own rows; the filter just avoids useless wakeups.
// Returns an unsubscribe function.
export const subscribeToNotifications = (userId: string, onNew: (notification: AppNotification) => void): (() => void) => {
    if (isLocalMode()) {
        return () => {};
    }
    try {
        const channel = supabase
            .channel(`notifications-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `userId=eq.${userId}`
                },
                (payload) => onNew(payload.new as AppNotification)
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    } catch (err) {
        console.warn('subscribeToNotifications error:', err);
        return () => {};
    }
};
