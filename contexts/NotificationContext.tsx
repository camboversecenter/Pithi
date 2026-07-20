
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { getCurrentUser, subscribe as subscribeToAuth } from '../services/authService';
import {
    getUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    subscribeToNotifications
} from '../services/notificationService';

interface NotificationContextType {
    unreadCount: number;
    refreshUnread: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Keeps the unread badge current app-wide: refreshes on login, every minute,
// and instantly via Supabase Realtime when a new notification row arrives.
export const NotificationProvider = ({ children }: { children?: ReactNode }) => {
    const [user, setUser] = useState<User | null>(getCurrentUser());
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const unsubscribe = subscribeToAuth(setUser);
        return () => unsubscribe();
    }, []);

    const userId = user?.id;

    const refreshUnread = useCallback(async () => {
        if (!userId) {
            setUnreadCount(0);
            return;
        }
        setUnreadCount(await getUnreadNotificationCount(userId));
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setUnreadCount(0);
            return;
        }
        refreshUnread();
        const interval = setInterval(refreshUnread, 60_000);
        const unsubscribe = subscribeToNotifications(userId, () => {
            setUnreadCount(count => count + 1);
        });
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [userId, refreshUnread]);

    const markRead = useCallback(async (id: string) => {
        await markNotificationRead(id);
        await refreshUnread();
    }, [refreshUnread]);

    const markAllRead = useCallback(async () => {
        if (!userId) return;
        await markAllNotificationsRead(userId);
        setUnreadCount(0);
    }, [userId]);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnread, markRead, markAllRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
