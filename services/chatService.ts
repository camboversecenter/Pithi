
import { ChatAttachmentType, Conversation, DirectMessage, User } from '../types';
import { supabase } from './supabaseConfig';

// --- HELPERS ---

const isLocalMode = () => !!localStorage.getItem('pithi_mock_user');

const LOCAL_KEY = 'pithi_local_direct_messages';

const getLocalMessages = (): DirectMessage[] => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {
        return [];
    }
};

const saveLocalMessages = (messages: DirectMessage[]) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(messages));
};

const sortByCreatedAt = (a: DirectMessage, b: DirectMessage) =>
    (a.createdAt || '').localeCompare(b.createdAt || '');

// Groups a flat message list into one entry per conversation partner.
const buildConversations = (messages: DirectMessage[], userId: string): Conversation[] => {
    const byPartner = new Map<string, Conversation>();

    for (const m of [...messages].sort(sortByCreatedAt)) {
        const isIncoming = m.recipientId === userId;
        const partnerId = isIncoming ? m.senderId : m.recipientId;
        const partnerName = isIncoming ? m.senderName : m.recipientName;
        const preview = m.attachmentType === 'IMAGE'
            ? '📷 រូបភាព'
            : m.attachmentType === 'AUDIO'
                ? '🎤 សារជាសំឡេង'
                : m.content;

        const existing = byPartner.get(partnerId);
        const unreadCount = (existing?.unreadCount || 0) + (isIncoming && !m.isRead ? 1 : 0);

        byPartner.set(partnerId, {
            partnerId,
            partnerName: partnerName || existing?.partnerName || 'User',
            partnerRole: existing?.partnerRole,
            partnerAvatarUrl: existing?.partnerAvatarUrl,
            lastMessage: preview,
            lastMessageAt: m.createdAt,
            unreadCount
        });
    }

    return Array.from(byPartner.values()).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
};

// --- QUERIES ---

export const getConversations = async (userId: string): Promise<Conversation[]> => {
    const fallback = () => buildConversations(
        getLocalMessages().filter(m => m.senderId === userId || m.recipientId === userId),
        userId
    );

    if (isLocalMode()) return fallback();

    try {
        const { data, error } = await supabase
            .from('direct_messages')
            .select('*')
            .or(`senderId.eq.${userId},recipientId.eq.${userId}`)
            .is('deletedAt', null)
            .order('createdAt', { ascending: false })
            .limit(500);
        if (error) throw error;

        const conversations = buildConversations((data as DirectMessage[]) || [], userId);

        // Decorate with the partner's avatar/role so the inbox looks like a
        // contact list rather than a list of UUIDs.
        const partnerIds = conversations.map(c => c.partnerId);
        if (partnerIds.length > 0) {
            const { data: profiles } = await supabase.from('users').select('id, name, role, avatarUrl').in('id', partnerIds);
            const byId = new Map((profiles as User[] || []).map(p => [p.id, p]));
            for (const c of conversations) {
                const profile = byId.get(c.partnerId);
                if (profile) {
                    c.partnerName = profile.name || c.partnerName;
                    c.partnerRole = profile.role;
                    c.partnerAvatarUrl = profile.avatarUrl;
                }
            }
        }
        return conversations;
    } catch (err) {
        console.warn('getConversations Supabase error, falling back to local storage:', err);
        return fallback();
    }
};

export const getConversation = async (userId: string, partnerId: string): Promise<DirectMessage[]> => {
    const fallback = () => getLocalMessages()
        .filter(m =>
            (m.senderId === userId && m.recipientId === partnerId) ||
            (m.senderId === partnerId && m.recipientId === userId))
        .sort(sortByCreatedAt);

    if (isLocalMode()) return fallback();

    try {
        const { data, error } = await supabase
            .from('direct_messages')
            .select('*')
            .or(
                `and(senderId.eq.${userId},recipientId.eq.${partnerId}),` +
                `and(senderId.eq.${partnerId},recipientId.eq.${userId})`
            )
            .is('deletedAt', null)
            .order('createdAt', { ascending: true });
        if (error) throw error;
        return (data as DirectMessage[]) || [];
    } catch (err) {
        console.warn('getConversation Supabase error, falling back to local storage:', err);
        return fallback();
    }
};

export const getUnreadMessageCount = async (userId: string): Promise<number> => {
    if (isLocalMode()) {
        return getLocalMessages().filter(m => m.recipientId === userId && !m.isRead && !m.deletedAt).length;
    }
    try {
        const { count, error } = await supabase
            .from('direct_messages')
            .select('id', { count: 'exact', head: true })
            .eq('recipientId', userId)
            .eq('isRead', false)
            .is('deletedAt', null);
        if (error) throw error;
        return count || 0;
    } catch (err) {
        console.warn('getUnreadMessageCount Supabase error:', err);
        return 0;
    }
};

// --- MUTATIONS ---

export interface SendMessageInput {
    sender: Pick<User, 'id' | 'name'>;
    recipientId: string;
    recipientName: string;
    content?: string;
    attachmentUrl?: string;
    attachmentType?: ChatAttachmentType | null;
}

export const sendDirectMessage = async ({
    sender, recipientId, recipientName, content = '', attachmentUrl, attachmentType
}: SendMessageInput): Promise<DirectMessage> => {
    const trimmed = content.trim();
    if (!trimmed && !attachmentUrl) {
        throw new Error('សារទទេមិនអាចផ្ញើបានទេ។');
    }

    const fallbackSend = (): DirectMessage => {
        const messages = getLocalMessages();
        const message: DirectMessage = {
            id: 'dm-' + Math.random().toString(36).slice(2, 11),
            senderId: sender.id,
            senderName: sender.name,
            recipientId,
            recipientName,
            content: trimmed,
            attachmentUrl,
            attachmentType: attachmentType || null,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        messages.push(message);
        saveLocalMessages(messages);
        return message;
    };

    if (isLocalMode()) return fallbackSend();

    try {
        const { data, error } = await supabase.from('direct_messages').insert({
            senderId: sender.id,
            senderName: sender.name,
            recipientId,
            recipientName,
            content: trimmed,
            attachmentUrl: attachmentUrl || null,
            attachmentType: attachmentType || null
        }).select().single();
        if (error) throw error;
        return data as DirectMessage;
    } catch (err: any) {
        // A failed send must be visible: silently "succeeding" into local
        // storage would hide the message from the person it was meant for.
        console.error('sendDirectMessage failed:', err);
        throw new Error(err?.message || 'មិនអាចផ្ញើសារបានទេ។');
    }
};

export const markConversationRead = async (userId: string, partnerId: string): Promise<void> => {
    if (isLocalMode()) {
        saveLocalMessages(getLocalMessages().map(m =>
            m.recipientId === userId && m.senderId === partnerId ? { ...m, isRead: true } : m
        ));
        return;
    }
    try {
        const { error } = await supabase
            .from('direct_messages')
            .update({ isRead: true })
            .eq('recipientId', userId)
            .eq('senderId', partnerId)
            .eq('isRead', false);
        if (error) throw error;
    } catch (err) {
        console.warn('markConversationRead Supabase error:', err);
    }
};

// Streams incoming messages for this user (RLS keeps the stream to their rows).
// Returns an unsubscribe function.
export const subscribeToMessages = (userId: string, onNew: (message: DirectMessage) => void): (() => void) => {
    if (isLocalMode()) return () => {};
    try {
        const channel = supabase
            .channel(`direct-messages-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `recipientId=eq.${userId}`
                },
                payload => onNew(payload.new as DirectMessage)
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    } catch (err) {
        console.warn('subscribeToMessages error:', err);
        return () => {};
    }
};
