
import { 
    Ceremony, Service, Booking, UserRole, Guest, BookingStatus, GuestStatus, 
    Transaction, Invitation, InvitationTemplate, Review, BookingComment, 
    BookingLog, ReportedTransaction, PaginatedResponse, SocialPost, PostReactionType, PostComment
} from '../types';
import { supabase } from './supabaseConfig';

// --- HELPER ---
const handleSupabaseError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    throw new Error(error.message || `Error in ${context}`);
};

// --- CEREMONIES ---

export const getCeremonies = async (userId: string, role: UserRole, page: number, limit: number, filter: 'UPCOMING' | 'PAST' | 'ALL'): Promise<PaginatedResponse<Ceremony>> => {
    let query = supabase.from('ceremonies').select('*', { count: 'exact' });
    
    if (role === UserRole.ORGANIZER) {
        query = query.eq('organizerId', userId);
    } else {
        query = query.eq('ownerId', userId);
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (filter === 'UPCOMING') {
        query = query.gte('date', today);
    } else if (filter === 'PAST') {
        query = query.lt('date', today);
    }

    query = query.order('date', { ascending: false });
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) handleSupabaseError(error, 'getCeremonies');
    
    return {
        data: (data as Ceremony[]) || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    };
};

export const getCeremonyById = async (id: string): Promise<Ceremony | null> => {
    const { data, error } = await supabase.from('ceremonies').select('*').eq('id', id).single();
    if (error) return null;
    return data as Ceremony;
};

export const createCeremony = async (data: Partial<Ceremony>): Promise<Ceremony> => {
    const { data: result, error } = await supabase.from('ceremonies').insert(data).select().single();
    if (error) handleSupabaseError(error, 'createCeremony');
    return result as Ceremony;
};

export const updateCeremony = async (id: string, data: Partial<Ceremony>): Promise<Ceremony | null> => {
    const { data: result, error } = await supabase.from('ceremonies').update(data).eq('id', id).select().single();
    if (error) handleSupabaseError(error, 'updateCeremony');
    return result as Ceremony;
};

export const deleteCeremony = async (id: string): Promise<void> => {
    const { error } = await supabase.from('ceremonies').delete().eq('id', id);
    if (error) handleSupabaseError(error, 'deleteCeremony');
};

// --- SERVICES ---

export const getServices = async (role?: UserRole, page = 1, limit = 10, search?: string): Promise<PaginatedResponse<Service>> => {
    let query = supabase.from('services').select('*', { count: 'exact' });
    
    if (role) query = query.eq('role', role);
    
    if (search) {
        query = query.or(`name.ilike.%${search}%,providerName.ilike.%${search}%`);
    }
    
    query = query.order('id', { ascending: false });
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) handleSupabaseError(error, 'getServices');

    return {
        data: (data as Service[]) || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    };
};

export const getMyServices = async (userId: string, page = 1, limit = 10): Promise<PaginatedResponse<Service>> => {
    let query = supabase.from('services').select('*', { count: 'exact' }).eq('providerId', userId);
    query = query.order('id', { ascending: false });
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) handleSupabaseError(error, 'getMyServices');

    return {
        data: (data as Service[]) || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    };
};

export const getServiceById = async (id: string): Promise<Service | null> => {
    const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
    if (error) return null;
    return data as Service;
};

export const createService = async (data: Partial<Service>): Promise<Service> => {
    const { data: result, error } = await supabase.from('services').insert(data).select().single();
    if (error) handleSupabaseError(error, 'createService');
    return result as Service;
};

export const updateService = async (id: string, data: Partial<Service>): Promise<Service> => {
    const { data: result, error } = await supabase.from('services').update(data).eq('id', id).select().single();
    if (error) handleSupabaseError(error, 'updateService');
    return result as Service;
};

export const deleteService = async (id: string): Promise<void> => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) handleSupabaseError(error, 'deleteService');
};

// --- BOOKINGS ---

export const getBookings = async (userId: string, role: UserRole, page: number, limit: number, timeFilter: 'UPCOMING' | 'PAST' | 'ALL'): Promise<PaginatedResponse<Booking>> => {
    let query = supabase.from('bookings').select('*, ceremonies(title)', { count: 'exact' });

    if (role === UserRole.ORGANIZER || role === UserRole.GENERAL_USER) {
        query = query.eq('bookedByUserId', userId);
    } else {
        query = query.eq('providerId', userId);
    }

    const today = new Date().toISOString().split('T')[0];
    if (timeFilter === 'UPCOMING') {
        query = query.gte('date', today);
    } else if (timeFilter === 'PAST') {
        query = query.lt('date', today);
    }

    query = query.order('date', { ascending: true });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) handleSupabaseError(error, 'getBookings');

    const mappedData = (data as any[] || []).map(b => ({
        ...b,
        ceremonyTitle: b.ceremonies?.title || 'Unknown Ceremony'
    }));

    return {
        data: mappedData as Booking[],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    };
};

export const getBookingsByService = async (serviceId: string): Promise<Booking[]> => {
    const { data, error } = await supabase.from('bookings').select('*, ceremonies(title)')
        .eq('serviceId', serviceId)
        .neq('status', BookingStatus.CANCELLED);
    
    if (error) handleSupabaseError(error, 'getBookingsByService');
    
    return (data as any[] || []).map(b => ({
        ...b,
        ceremonyTitle: b.ceremonies?.title || 'Unknown Ceremony'
    })) as Booking[];
};

export const getBookingById = async (id: string): Promise<Booking | null> => {
    const { data, error } = await supabase.from('bookings').select('*, ceremonies(title)').eq('id', id).single();
    if (error || !data) return null;
    
    return {
        ...data,
        ceremonyTitle: (data as any).ceremonies?.title || 'Unknown Ceremony'
    } as Booking;
};

export const createBooking = async (data: Partial<Booking>): Promise<Booking> => {
    const { data: result, error } = await supabase.from('bookings').insert({
        ...data,
        status: BookingStatus.PENDING,
        createdAt: new Date().toISOString()
    }).select().single();
    if (error) handleSupabaseError(error, 'createBooking');
    return result as Booking;
};

export const updateBookingStatus = async (id: string, status: BookingStatus): Promise<void> => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) handleSupabaseError(error, 'updateBookingStatus');
};

export const updateBookingSchedule = async (id: string, date: string, startTime: string, endTime: string, userId: string, userName: string): Promise<Booking> => {
    const { data, error } = await supabase.from('bookings').update({ date, startTime, endTime }).eq('id', id).select('*, ceremonies(title)').single();
    if (error) handleSupabaseError(error, 'updateBookingSchedule');
    
    await addBookingLog(id, "SCHEDULE_CHANGE", `Updated to ${date} ${startTime}-${endTime}`, userId, userName);
    
    return {
        ...data,
        ceremonyTitle: (data as any).ceremonies?.title || 'Unknown Ceremony'
    } as Booking;
};

export const deleteBooking = async (id: string): Promise<void> => {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) handleSupabaseError(error, 'deleteBooking');
};

export const getBookingComments = async (bookingId: string): Promise<BookingComment[]> => {
    const { data, error } = await supabase.from('booking_comments').select('*').eq('bookingId', bookingId).order('timestamp', { ascending: true });
    if (error) return [];
    return data as BookingComment[];
};

export const addBookingComment = async (bookingId: string, userId: string, userName: string, role: UserRole, content: string): Promise<BookingComment> => {
    const { data, error } = await supabase.from('booking_comments').insert({
        bookingId, userId, userName, role, content, timestamp: new Date().toISOString()
    }).select().single();
    if (error) handleSupabaseError(error, 'addBookingComment');
    return data as BookingComment;
};

export const getBookingLogs = async (bookingId: string): Promise<BookingLog[]> => {
    const { data, error } = await supabase.from('booking_logs').select('*').eq('bookingId', bookingId).order('timestamp', { ascending: true });
    if (error) return [];
    return data as BookingLog[];
};

const addBookingLog = async (bookingId: string, action: string, details: string, userId: string, userName: string) => {
    await supabase.from('booking_logs').insert({
        bookingId, action, details, userId, userName, timestamp: new Date().toISOString()
    });
};

// --- GUESTS & INVITATIONS ---

export const getGuests = async (ceremonyId: string, page = 1, limit = 1000): Promise<PaginatedResponse<Guest>> => {
    const { data, error, count } = await supabase.from('guests').select('*', { count: 'exact' }).eq('ceremonyId', ceremonyId);
    if (error) handleSupabaseError(error, 'getGuests');
    
    return {
        data: (data as Guest[]) || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    };
};

export const addGuest = async (data: Partial<Guest>): Promise<Guest> => {
    const { data: result, error } = await supabase.from('guests').insert({
        ...data,
        status: data.status || GuestStatus.PENDING
    }).select().single();
    
    if (error) handleSupabaseError(error, 'addGuest');
    return result as Guest;
};

export const deleteGuest = async (id: string): Promise<void> => {
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) handleSupabaseError(error, 'deleteGuest');
};

export const getMyInvitations = async (userId: string, page = 1, limit = 10, status: 'UPCOMING' | 'PAST' | 'ALL' = 'UPCOMING'): Promise<PaginatedResponse<Invitation>> => {
    const { data: guests, error: guestError } = await supabase.from('guests').select('*').eq('userId', userId);
    if (guestError) handleSupabaseError(guestError, 'getMyInvitations - Guests');
    
    if (!guests || guests.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const ceremonyIds = guests.map((g: Guest) => g.ceremonyId);
    
    let query = supabase.from('ceremonies').select('*').in('id', ceremonyIds);
    const today = new Date().toISOString().split('T')[0];
    
    if (status === 'UPCOMING') query = query.gte('date', today);
    else if (status === 'PAST') query = query.lt('date', today);
    
    query = query.order('date', { ascending: true });
    
    const { data: ceremonies, error: cerError } = await query;
    if (cerError) handleSupabaseError(cerError, 'getMyInvitations - Ceremonies');

    const invitations: Invitation[] = [];
    if (ceremonies) {
        for (const c of ceremonies) {
            const guestRecord = guests.find((g: Guest) => g.ceremonyId === c.id);
            if (guestRecord) {
                invitations.push({
                    ...guestRecord,
                    ceremonyTitle: c.title,
                    ceremonyDate: c.date,
                    ceremonyLocation: c.location,
                    bannerUrl: c.bannerUrl
                });
            }
        }
    }

    const startIndex = (page - 1) * limit;
    const paginatedItems = invitations.slice(startIndex, startIndex + limit);

    return {
        data: paginatedItems,
        total: invitations.length,
        page,
        limit,
        totalPages: Math.ceil(invitations.length / limit)
    };
};

export const respondToInvitation = async (guestId: string, status: GuestStatus): Promise<void> => {
    const { error } = await supabase.from('guests').update({ status }).eq('id', guestId);
    if (error) handleSupabaseError(error, 'respondToInvitation');
};

export const getInvitationTemplates = async (ceremonyId: string): Promise<InvitationTemplate[]> => {
    const { data, error } = await supabase.from('invitation_templates').select('*').eq('ceremonyId', ceremonyId);
    if (error) return [];
    return data as InvitationTemplate[];
};

export const saveInvitationTemplate = async (data: Partial<InvitationTemplate>): Promise<InvitationTemplate> => {
    if (data.id) {
        const { data: res, error } = await supabase.from('invitation_templates').update(data).eq('id', data.id).select().single();
        if (error) handleSupabaseError(error, 'saveInvitationTemplate Update');
        return res as InvitationTemplate;
    } else {
        const { data: res, error } = await supabase.from('invitation_templates').insert(data).select().single();
        if (error) handleSupabaseError(error, 'saveInvitationTemplate Insert');
        return res as InvitationTemplate;
    }
};

export const deleteInvitationTemplate = async (id: string): Promise<void> => {
    const { error } = await supabase.from('invitation_templates').delete().eq('id', id);
    if (error) handleSupabaseError(error, 'deleteInvitationTemplate');
};

// --- TRANSACTIONS ---

export const getTransactions = async (ceremonyId: string, page = 1, limit = 1000): Promise<PaginatedResponse<Transaction>> => {
    const { data, error, count } = await supabase.from('transactions').select('*', { count: 'exact' }).eq('ceremonyId', ceremonyId);
    if (error) handleSupabaseError(error, 'getTransactions');
    
    return {
        data: (data as Transaction[]) || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    };
};

export const addTransaction = async (data: Partial<Transaction>): Promise<Transaction> => {
    const { data: result, error } = await supabase.from('transactions').insert(data).select().single();
    if (error) handleSupabaseError(error, 'addTransaction');
    return result as Transaction;
};

export const deleteTransaction = async (id: string): Promise<void> => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) handleSupabaseError(error, 'deleteTransaction');
};

export const reportTransaction = async (data: Partial<ReportedTransaction>): Promise<ReportedTransaction> => {
    const { data: result, error } = await supabase.from('reported_transactions').insert({
        ...data,
        status: 'PENDING',
        timestamp: new Date().toISOString()
    }).select().single();
    if (error) handleSupabaseError(error, 'reportTransaction');
    return result as ReportedTransaction;
};

export const getMyReportedTransactions = async (ceremonyId: string, guestId: string): Promise<ReportedTransaction[]> => {
    const { data, error } = await supabase.from('reported_transactions').select('*').eq('ceremonyId', ceremonyId).eq('guestId', guestId);
    if (error) return [];
    return data as ReportedTransaction[];
};

export const getPendingReportedTransactions = async (ceremonyId: string): Promise<ReportedTransaction[]> => {
    const { data, error } = await supabase.from('reported_transactions').select('*').eq('ceremonyId', ceremonyId).eq('status', 'PENDING');
    if (error) return [];
    return data as ReportedTransaction[];
};

export const confirmReportedTransaction = async (reportId: string): Promise<void> => {
    const { data: report, error } = await supabase.from('reported_transactions').update({ status: 'CONFIRMED' }).eq('id', reportId).select().single();
    if (error || !report) handleSupabaseError(error || {}, 'confirmReportedTransaction');

    let amountUSD = report.amount;
    if(report.currency === 'KHR') amountUSD = report.amount / 4000;

    await addTransaction({
        ceremonyId: report.ceremonyId,
        amount: amountUSD,
        type: 'INCOME',
        category: 'Gift',
        donorName: report.guestName,
        date: report.date,
        giftDescription: `Bank Transfer (${report.currency} ${report.amount})`
    });
};

export const rejectReportedTransaction = async (reportId: string): Promise<void> => {
    const { error } = await supabase.from('reported_transactions').delete().eq('id', reportId);
    if (error) handleSupabaseError(error, 'rejectReportedTransaction');
};

// --- REVIEWS ---

export const getReviews = async (): Promise<Review[]> => {
    const { data, error } = await supabase.from('reviews').select('*').order('date', { ascending: false });
    if (error) return [];
    return data as Review[];
};

export const addReview = async (data: Partial<Review>): Promise<Review> => {
    const { data: result, error } = await supabase.from('reviews').insert({
        ...data,
        date: new Date().toISOString().split('T')[0]
    }).select().single();
    if (error) handleSupabaseError(error, 'addReview');
    return result as Review;
};

// --- SOCIAL POSTS ---

export const getSocialPosts = async (userId: string, page = 1, limit = 10, search?: string, onlyBookmarked = false): Promise<PaginatedResponse<SocialPost>> => {
    let query = supabase.from('social_posts').select('*, post_bookmarks(userId), post_reactions(userId, reactionType)', { count: 'exact' });

    if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    query = query.order('createdAt', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) handleSupabaseError(error, 'getSocialPosts');

    let mapped = (data as any[] || []).map(p => {
        const isBookmarked = p.post_bookmarks?.some((b: any) => b.userId === userId);
        const myReaction = p.post_reactions?.find((r: any) => r.userId === userId)?.reactionType;
        return {
            ...p,
            isBookmarked,
            myReaction
        };
    });

    if (onlyBookmarked) {
        mapped = mapped.filter(p => p.isBookmarked);
    }

    return {
        data: mapped as SocialPost[],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    };
};

export const createSocialPost = async (data: Partial<SocialPost>): Promise<SocialPost> => {
    const { data: result, error } = await supabase.from('social_posts').insert({
        ...data,
        createdAt: new Date().toISOString(),
        likes: 0, useful: 0, fakes: 0, bookmarksCount: 0
    }).select().single();
    if (error) handleSupabaseError(error, 'createSocialPost');
    return result as SocialPost;
};

export const reactToPost = async (postId: string, userId: string, type: PostReactionType): Promise<void> => {
    const { data: existing } = await supabase.from('post_reactions').select('*').eq('postId', postId).eq('userId', userId).eq('reactionType', type).single();
    
    if (existing) {
        await supabase.from('post_reactions').delete().eq('id', existing.id);
        const col = type === 'LIKE' ? 'likes' : type === 'USEFUL' ? 'useful' : 'fakes';
        await supabase.rpc('decrement_post_stat', { post_id: postId, col_name: col });
    } else {
        await supabase.from('post_reactions').delete().eq('postId', postId).eq('userId', userId);
        await supabase.from('post_reactions').insert({ postId, userId, reactionType: type });
        const col = type === 'LIKE' ? 'likes' : type === 'USEFUL' ? 'useful' : 'fakes';
        await supabase.rpc('increment_post_stat', { post_id: postId, col_name: col });
    }
};

export const bookmarkPost = async (postId: string, userId: string): Promise<boolean> => {
    const { data: existing } = await supabase.from('post_bookmarks').select('*').eq('postId', postId).eq('userId', userId).single();
    
    if (existing) {
        await supabase.from('post_bookmarks').delete().eq('id', existing.id);
        await supabase.rpc('decrement_post_stat', { post_id: postId, col_name: 'bookmarksCount' });
        return false;
    } else {
        await supabase.from('post_bookmarks').insert({ postId, userId });
        await supabase.rpc('increment_post_stat', { post_id: postId, col_name: 'bookmarksCount' });
        return true;
    }
};

export const getPostComments = async (postId: string): Promise<PostComment[]> => {
    const { data, error } = await supabase.from('post_comments').select('*').eq('postId', postId).order('createdAt', { ascending: true });
    if (error) return [];
    return data as PostComment[];
};

export const addPostComment = async (postId: string, userId: string, userName: string, content: string): Promise<PostComment> => {
    const { data, error } = await supabase.from('post_comments').insert({
        postId, authorId: userId, authorName: userName, content, createdAt: new Date().toISOString()
    }).select().single();
    if (error) handleSupabaseError(error, 'addPostComment');
    return data as PostComment;
};

// --- MISC & SYSTEM ---

export const runCleanup = async () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const date90 = ninetyDaysAgo.toISOString().split('T')[0];

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const date60 = sixtyDaysAgo.toISOString().split('T')[0];

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateOneYear = oneYearAgo.toISOString();

    const { data: oldReports } = await supabase.from('reported_transactions').select('receiptImageUrl').lt('date', date90);
    if (oldReports && oldReports.length > 0) {
        const paths = oldReports.map(r => r.receiptImageUrl).filter(url => url && url.includes('/PITHI/')).map(url => {
            try { const parts = url.split('/PITHI/'); return parts.length >= 2 ? decodeURIComponent(parts[1]) : null; } catch { return null; }
        }).filter(p => p !== null) as string[];
        if (paths.length > 0) await supabase.storage.from('PITHI').remove(paths);
    }

    const { count: count1 } = await supabase.from('reported_transactions').delete({ count: 'exact' }).lt('date', date90);
    const { count: count2 } = await supabase.from('bookings').delete({ count: 'exact' }).eq('status', 'CANCELLED').lt('date', date60);
    const { count: countSocial1 } = await supabase.from('social_posts').delete({ count: 'exact' }).gte('fakes', 300);
    
    const { count: countSocial2 } = await supabase.from('social_posts').delete({ count: 'exact' })
        .lt('createdAt', dateOneYear)
        .lt('bookmarksCount', 100)
        .lt('likes', 500)
        .lt('useful', 500);

    return `Cleanup executed. Deleted ${count1 || 0} reports, ${count2 || 0} bookings, and ${((countSocial1 || 0) + (countSocial2 || 0))} social posts.`;
};

// --- STATS ---

export const getSystemStats = async () => {
    const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: ceremonies } = await supabase.from('ceremonies').select('*', { count: 'exact', head: true });
    const { count: bookings } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
    const { data: tx } = await supabase.from('transactions').select('amount');
    const volume = tx ? tx.reduce((acc: number, t: any) => acc + (t.amount || 0), 0) : 0;

    return { totalUsers: users || 0, totalCeremonies: ceremonies || 0, totalBookings: bookings || 0, totalVolume: volume };
};

export const getCleanupStats = async () => {
    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const date90 = ninetyDaysAgo.toISOString().split('T')[0];
    const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const date60 = sixtyDaysAgo.toISOString().split('T')[0];

    const { count: receiptsCount } = await supabase.from('reported_transactions').select('*', { count: 'exact', head: true }).lt('date', date90);
    const { count: cancelledBookingsCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'CANCELLED').lt('date', date60);

    return { receiptsCount: receiptsCount || 0, cancelledBookingsCount: cancelledBookingsCount || 0 };
};

export const getUserCalendarEvents = async (userId: string) => {
    const events: any[] = [];
    const { data: owned } = await supabase.from('ceremonies').select('id, date, title').or(`ownerId.eq.${userId},organizerId.eq.${userId}`);
    if (owned) owned.forEach((c: any) => events.push({ id: c.id, date: c.date, type: 'OWNED', title: c.title }));
    const { data: guests } = await supabase.from('guests').select('ceremonyId').eq('userId', userId).eq('status', GuestStatus.ACCEPTED);
    if (guests && guests.length > 0) {
        const ids = guests.map((g: any) => g.ceremonyId);
        const { data: invited } = await supabase.from('ceremonies').select('id, date, title').in('id', ids);
        if (invited) invited.forEach((c: any) => events.push({ id: c.id, date: c.date, type: 'INVITED', title: c.title }));
    }
    return events;
};

export const getRecentActivities = async (userId: string, role: UserRole) => {
    let bookingQuery = supabase.from('bookings').select('*').order('createdAt', { ascending: false }).limit(5);
    if (role === UserRole.ORGANIZER || role === UserRole.GENERAL_USER) bookingQuery = bookingQuery.eq('bookedByUserId', userId);
    else bookingQuery = bookingQuery.eq('providerId', userId);
    const { data: bookings } = await bookingQuery;
    if (!bookings) return [];
    return bookings.map((b: Booking) => ({ id: b.id, description: `Booking: ${b.serviceName} (${b.status})`, timestamp: b.createdAt || new Date().toISOString(), isNew: false }));
};
