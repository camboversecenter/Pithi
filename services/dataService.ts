
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

const isLocalMode = () => {
    return !!localStorage.getItem('pithi_mock_user');
};

const getLocalCeremonies = (): Ceremony[] => {
    try {
        const ceremoniesJson = localStorage.getItem('pithi_local_ceremonies');
        if (!ceremoniesJson) {
            const demoCeremonies: Ceremony[] = [
                {
                    id: 'c1c1c1c1-b2b2-c3c3-d4d4-e5e5e5e5e501',
                    title: 'ពិធីមង្គលការ សុភ័ក្រ្ត & ទេវី (Wedding of Sopheak & Devi)',
                    type: 'WEDDING',
                    date: '2026-11-18',
                    description: 'ពិធីមង្គលការបែបប្រពៃណីខ្មែរប្រណីត នៅសណ្ឋាគារសូហ្វីតែល',
                    organizerId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e502',
                    ownerId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e503',
                    location: 'សណ្ឋាគារ សូហ្វីតែល ភ្នំពេញ (Sofitel Phnom Penh)',
                    budget: 15000,
                    themeColor: '#e11d48'
                }
            ];
            localStorage.setItem('pithi_local_ceremonies', JSON.stringify(demoCeremonies));
            return demoCeremonies;
        }
        return JSON.parse(ceremoniesJson);
    } catch (e) {
        return [];
    }
};

const saveLocalCeremonies = (ceremonies: Ceremony[]) => {
    localStorage.setItem('pithi_local_ceremonies', JSON.stringify(ceremonies));
};

// --- CEREMONIES ---

export const getCeremonies = async (userId: string, role: UserRole, page: number, limit: number, filter: 'UPCOMING' | 'PAST' | 'ALL'): Promise<PaginatedResponse<Ceremony>> => {
    const handleLocalGet = (): PaginatedResponse<Ceremony> => {
        const local = getLocalCeremonies();
        let filtered = local.filter(c => role === UserRole.ORGANIZER ? c.organizerId === userId : c.ownerId === userId);
        
        const today = new Date().toISOString().split('T')[0];
        if (filter === 'UPCOMING') {
            filtered = filtered.filter(c => c.date >= today);
        } else if (filter === 'PAST') {
            filtered = filtered.filter(c => c.date < today);
        }
        
        filtered.sort((a, b) => b.date.localeCompare(a.date));
        
        const from = (page - 1) * limit;
        const to = from + limit;
        const pageData = filtered.slice(from, to);
        
        return {
            data: pageData,
            total: filtered.length,
            page,
            limit,
            totalPages: Math.ceil(filtered.length / limit)
        };
    };

    if (isLocalMode()) {
        return handleLocalGet();
    }

    try {
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
        if (error) throw error;
        
        return {
            data: (data as Ceremony[]) || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    } catch (err) {
        console.warn("getCeremonies Supabase error, falling back to local storage:", err);
        return handleLocalGet();
    }
};

export const getCeremonyById = async (id: string): Promise<Ceremony | null> => {
    if (isLocalMode()) {
        const ceremonies = getLocalCeremonies();
        return ceremonies.find(c => c.id === id) || null;
    }
    try {
        const { data, error } = await supabase.from('ceremonies').select('*').eq('id', id).single();
        if (error) throw error;
        return data as Ceremony;
    } catch (err) {
        console.warn("getCeremonyById Supabase error, falling back to local storage:", err);
        const ceremonies = getLocalCeremonies();
        return ceremonies.find(c => c.id === id) || null;
    }
};

export const createCeremony = async (data: Partial<Ceremony>): Promise<Ceremony> => {
    const fallbackCreate = (): Ceremony => {
        const ceremonies = getLocalCeremonies();
        const newCeremony: Ceremony = {
            id: data.id || (crypto.randomUUID ? crypto.randomUUID() : `ceremony-${Date.now()}`),
            title: data.title || 'Untitled Ceremony',
            type: data.type || 'WEDDING',
            date: data.date || new Date().toISOString().split('T')[0],
            description: data.description || '',
            organizerId: data.organizerId || '',
            ownerId: data.ownerId || undefined,
            location: data.location || '',
            budget: data.budget || 0,
            invitationMessage: data.invitationMessage || '',
            themeColor: data.themeColor || '#e11d48',
            khqrUrl: data.khqrUrl || undefined,
            bannerUrl: data.bannerUrl || undefined
        };
        ceremonies.push(newCeremony);
        saveLocalCeremonies(ceremonies);
        return newCeremony;
    };

    if (isLocalMode()) {
        return fallbackCreate();
    }
    try {
        const { data: result, error } = await supabase.from('ceremonies').insert(data).select().single();
        if (error) throw error;
        return result as Ceremony;
    } catch (err) {
        console.warn("createCeremony Supabase error (possibly RLS), falling back to local storage:", err);
        return fallbackCreate();
    }
};

export const updateCeremony = async (id: string, data: Partial<Ceremony>): Promise<Ceremony | null> => {
    const fallbackUpdate = (): Ceremony | null => {
        const ceremonies = getLocalCeremonies();
        const index = ceremonies.findIndex(c => c.id === id);
        if (index === -1) return null;
        ceremonies[index] = { ...ceremonies[index], ...data };
        saveLocalCeremonies(ceremonies);
        return ceremonies[index];
    };

    if (isLocalMode()) {
        return fallbackUpdate();
    }
    try {
        const { data: result, error } = await supabase.from('ceremonies').update(data).eq('id', id).select().single();
        if (error) throw error;
        return result as Ceremony;
    } catch (err) {
        console.warn("updateCeremony Supabase error, falling back to local storage:", err);
        return fallbackUpdate();
    }
};

export const deleteCeremony = async (id: string): Promise<void> => {
    const fallbackDelete = () => {
        const ceremonies = getLocalCeremonies();
        const filtered = ceremonies.filter(c => c.id !== id);
        saveLocalCeremonies(filtered);
    };

    if (isLocalMode()) {
        fallbackDelete();
        return;
    }
    try {
        const { error } = await supabase.from('ceremonies').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn("deleteCeremony Supabase error, falling back to local storage:", err);
        fallbackDelete();
    }
};

// --- SERVICES ---

const getLocalServices = (): Service[] => {
    try {
        const servicesJson = localStorage.getItem('pithi_local_services');
        if (!servicesJson) {
            const demoServices: Service[] = [
                {
                    id: '1',
                    providerId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e505',
                    providerName: 'តន្ត្រីបុរាណ ភ្នំពេញ (Phnom Penh Classical Music)',
                    role: UserRole.MUSIC_BAND,
                    name: 'ក្រុមតន្ត្រីបុរាណខ្មែរប្រណីត (Premium Khmer Classical Band)',
                    description: 'ផ្តល់ជូនសេវាកម្មភ្លេងការខ្មែរគូប្រគំដោយឧបករណ៍បុរាណពិតៗ និងសម្លេងពីរោះរណ្តំចិត្ត។',
                    price: 350,
                    priceNote: 'ក្នុងមួយកម្មវិធី',
                    location: 'ភ្នំពេញ (Phnom Penh)',
                    imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&auto=format&fit=crop&q=60'
                },
                {
                    id: '2',
                    providerId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e506',
                    providerName: 'វិមានអាពាហ៍ពិពាហ៍ (Vimean Wedding Hall)',
                    role: UserRole.HALL,
                    name: 'សាលពិធីមង្គលការលំដាប់តារាប្រាំ (Five-Star Wedding Hall)',
                    description: 'សាលដ៏ធំទូលាយ មានម៉ាស៊ីនត្រជាក់ត្រជាក់ខ្លាំង តុបតែងលម្អផ្កាស្រស់ស្អាតឥតខ្ចោះ។',
                    price: 2500,
                    priceNote: 'ក្នុងមួយថ្ងៃ',
                    location: 'ភ្នំពេញ (Phnom Penh)',
                    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=500&auto=format&fit=crop&q=60'
                }
            ];
            localStorage.setItem('pithi_local_services', JSON.stringify(demoServices));
            return demoServices;
        }
        return JSON.parse(servicesJson);
    } catch (e) {
        return [];
    }
};

const saveLocalServices = (services: Service[]) => {
    localStorage.setItem('pithi_local_services', JSON.stringify(services));
};

export const getServices = async (role?: UserRole, page = 1, limit = 10, search?: string): Promise<PaginatedResponse<Service>> => {
    const handleLocalGet = (): PaginatedResponse<Service> => {
        let local = getLocalServices();
        if (role) {
            local = local.filter(s => s.role === role);
        }
        if (search) {
            const cleanSearch = search.toLowerCase();
            local = local.filter(s => (s.name || '').toLowerCase().includes(cleanSearch) || (s.providerName || '').toLowerCase().includes(cleanSearch));
        }
        
        local.sort((a, b) => b.id.localeCompare(a.id));
        
        const from = (page - 1) * limit;
        const to = from + limit;
        const pageData = local.slice(from, to);
        
        return {
            data: pageData,
            total: local.length,
            page,
            limit,
            totalPages: Math.ceil(local.length / limit)
        };
    };

    if (isLocalMode()) {
        return handleLocalGet();
    }

    try {
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
        if (error) throw error;

        return {
            data: (data as Service[]) || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    } catch (err) {
        console.warn("getServices Supabase error, falling back to local storage:", err);
        return handleLocalGet();
    }
};

export const getMyServices = async (userId: string, page = 1, limit = 10): Promise<PaginatedResponse<Service>> => {
    const handleLocalGetMy = (): PaginatedResponse<Service> => {
        let local = getLocalServices().filter(s => s.providerId === userId);
        local.sort((a, b) => b.id.localeCompare(a.id));
        
        const from = (page - 1) * limit;
        const to = from + limit;
        const pageData = local.slice(from, to);
        
        return {
            data: pageData,
            total: local.length,
            page,
            limit,
            totalPages: Math.ceil(local.length / limit)
        };
    };

    if (isLocalMode()) {
        return handleLocalGetMy();
    }

    try {
        let query = supabase.from('services').select('*', { count: 'exact' }).eq('providerId', userId);
        query = query.order('id', { ascending: false });
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        return {
            data: (data as Service[]) || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    } catch (err) {
        console.warn("getMyServices Supabase error, falling back to local storage:", err);
        return handleLocalGetMy();
    }
};

export const getServiceById = async (id: string): Promise<Service | null> => {
    if (isLocalMode()) {
        const local = getLocalServices();
        return local.find(s => s.id === id) || null;
    }
    try {
        const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
        if (error) throw error;
        return data as Service;
    } catch (err) {
        console.warn("getServiceById Supabase error, falling back to local storage:", err);
        const local = getLocalServices();
        return local.find(s => s.id === id) || null;
    }
};

export const createService = async (data: Partial<Service>): Promise<Service> => {
    const fallbackCreate = (): Service => {
        const local = getLocalServices();
        const newService: Service = {
            id: data.id || `service-${Date.now()}`,
            providerId: data.providerId || 'unknown',
            providerName: data.providerName || 'Provider',
            role: data.role || UserRole.ORGANIZER,
            name: data.name || '',
            description: data.description || '',
            price: data.price || 0,
            priceNote: data.priceNote || undefined,
            location: data.location || '',
            locationType: data.locationType || 'FIXED',
            mapUrl: data.mapUrl || undefined,
            imageUrl: data.imageUrl || undefined
        };
        local.push(newService);
        saveLocalServices(local);
        return newService;
    };

    if (isLocalMode()) {
        return fallbackCreate();
    }

    try {
        const { data: result, error } = await supabase.from('services').insert(data).select().single();
        if (error) throw error;
        return result as Service;
    } catch (err) {
        console.warn("createService Supabase error (RLS or otherwise), falling back to local storage:", err);
        return fallbackCreate();
    }
};

export const updateService = async (id: string, data: Partial<Service>): Promise<Service> => {
    const fallbackUpdate = (): Service => {
        const local = getLocalServices();
        const index = local.findIndex(s => s.id === id);
        if (index === -1) {
            const newService = { ...data, id } as Service;
            local.push(newService);
            saveLocalServices(local);
            return newService;
        }
        local[index] = { ...local[index], ...data };
        saveLocalServices(local);
        return local[index];
    };

    if (isLocalMode()) {
        return fallbackUpdate();
    }

    try {
        const { data: result, error } = await supabase.from('services').update(data).eq('id', id).select().single();
        if (error) throw error;
        return result as Service;
    } catch (err) {
        console.warn("updateService Supabase error, falling back to local storage:", err);
        return fallbackUpdate();
    }
};

export const deleteService = async (id: string): Promise<void> => {
    const fallbackDelete = () => {
        const local = getLocalServices();
        const filtered = local.filter(s => s.id !== id);
        saveLocalServices(filtered);
    };

    if (isLocalMode()) {
        fallbackDelete();
        return;
    }

    try {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn("deleteService Supabase error, falling back to local storage:", err);
        fallbackDelete();
    }
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

const getLocalSocialPosts = (): SocialPost[] => {
    try {
        const postsJson = localStorage.getItem('pithi_local_social_posts');
        if (!postsJson) {
            const demoPosts: SocialPost[] = [
                {
                    id: 'p1',
                    authorId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e502',
                    authorName: 'ទេវី សាយ (Devi Say)',
                    authorRole: 'ORGANIZER',
                    title: 'គន្លឹះសំខាន់ៗក្នុងការរៀបចំពិធីមង្គលការឱ្យរលូន (Core Tips for a Smooth Wedding Ceremony)',
                    content: 'ការរៀបចំពិធីមង្គលការបែបប្រពៃណីខ្មែរ តម្រូវឱ្យមានការត្រៀមលម្អិតតាំងពីព្រលឹមស្រាងៗ។ គន្លឹះធំៗគឺ៖ ១. រៀបចំបញ្ជីភ្ញៀវឱ្យបានច្បាស់លាស់ ២. ជ្រើសរើសសេវាកម្មចុងភៅ និងតន្ត្រីដែលគួរឱ្យទុកចិត្ត ៣. ពិភាក្សាជាមួយអាចារ្យមង្គលការពីពេលវេលាឱ្យបានហ្មត់ចត់បំផុត។',
                    likes: 12,
                    useful: 8,
                    fakes: 0,
                    bookmarksCount: 4,
                    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
                },
                {
                    id: 'p2',
                    authorId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e503',
                    authorName: 'សុភ័ក្រ្ត ប៊ុន (Sopheak Bun)',
                    authorRole: 'GENERAL_USER',
                    title: 'សំណួរ៖ តើគួរជ្រើសរើសសម្លៀកបំពាក់មង្គលការបុរាណប៉ុន្មានកំប្លេសម្រាប់ពិធីពេញមួយថ្ងៃ?',
                    content: 'ខ្ញុំកំពុងរៀបចំអាពាហ៍ពិពាហ៍នៅខែវិច្ឆិកាខាងមុខនេះ។ ចង់សួរមតិបងៗថា ជាទូទៅក្នុងពិធីមួយថ្ងៃពេញ តើយើងគួរផ្លាស់ប្តូរសម្លៀកបំពាក់បុរាណខ្មែរប៉ុន្មានកំប្លេដើម្បីកុំឱ្យខាតពេល និងហត់នឿយហួសហេតុ? អរគុណទុកជាមុន!',
                    likes: 5,
                    useful: 15,
                    fakes: 1,
                    bookmarksCount: 2,
                    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
                }
            ];
            localStorage.setItem('pithi_local_social_posts', JSON.stringify(demoPosts));
            return demoPosts;
        }
        return JSON.parse(postsJson);
    } catch (e) {
        return [];
    }
};

const saveLocalSocialPosts = (posts: SocialPost[]) => {
    localStorage.setItem('pithi_local_social_posts', JSON.stringify(posts));
};

const getLocalPostComments = (): PostComment[] => {
    try {
        const commentsJson = localStorage.getItem('pithi_local_post_comments');
        if (!commentsJson) {
            const demoComments: PostComment[] = [
                {
                    id: 'comment1',
                    postId: 'p2',
                    authorId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e502',
                    authorName: 'ទេវី សាយ (Devi Say)',
                    content: 'ជាទូទៅពិធីពេញមួយថ្ងៃគឺប្រហែល ៧ ទៅ ៨ ឈុតបង! ប៉ុន្តែបើចង់កាត់បន្ថយការហត់ អាចជ្រើសយកត្រឹម ៥ ឬ ៦ ឈុតសំខាន់ៗបានហើយបង ដើម្បីមានពេលសម្រាក និងទទួលភ្ញៀវអបអរសាទរបានច្រើន។',
                    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
                }
            ];
            localStorage.setItem('pithi_local_post_comments', JSON.stringify(demoComments));
            return demoComments;
        }
        return JSON.parse(commentsJson);
    } catch (e) {
        return [];
    }
};

const saveLocalPostComments = (comments: PostComment[]) => {
    localStorage.setItem('pithi_local_post_comments', JSON.stringify(comments));
};

const getLocalPostReactions = (): any[] => {
    try {
        return JSON.parse(localStorage.getItem('pithi_local_post_reactions') || '[]');
    } catch (e) {
        return [];
    }
};

const saveLocalPostReactions = (reactions: any[]) => {
    localStorage.setItem('pithi_local_post_reactions', JSON.stringify(reactions));
};

const getLocalPostBookmarks = (): any[] => {
    try {
        return JSON.parse(localStorage.getItem('pithi_local_post_bookmarks') || '[]');
    } catch (e) {
        return [];
    }
};

const saveLocalPostBookmarks = (bookmarks: any[]) => {
    localStorage.setItem('pithi_local_post_bookmarks', JSON.stringify(bookmarks));
};

const handleLocalGetSocialPosts = (userId: string, page: number, limit: number, search?: string, onlyBookmarked = false): PaginatedResponse<SocialPost> => {
    const posts = getLocalSocialPosts();
    const bookmarks = getLocalPostBookmarks();
    const reactions = getLocalPostReactions();

    let mapped = posts.map(p => {
        const isBookmarked = bookmarks.some(b => b.postId === p.id && b.userId === userId);
        const myReaction = reactions.find(r => r.postId === p.id && r.userId === userId)?.reactionType || null;
        return {
            ...p,
            isBookmarked,
            myReaction
        };
    });

    if (search) {
        const queryClean = search.toLowerCase();
        mapped = mapped.filter(p => (p.title || '').toLowerCase().includes(queryClean) || (p.content || '').toLowerCase().includes(queryClean));
    }

    if (onlyBookmarked) {
        mapped = mapped.filter(p => p.isBookmarked);
    }

    mapped.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const from = (page - 1) * limit;
    const to = from + limit;
    const paged = mapped.slice(from, to);

    return {
        data: paged,
        total: mapped.length,
        page,
        limit,
        totalPages: Math.ceil(mapped.length / limit)
    };
};

export const getSocialPosts = async (userId: string, page = 1, limit = 10, search?: string, onlyBookmarked = false): Promise<PaginatedResponse<SocialPost>> => {
    if (isLocalMode()) {
        return handleLocalGetSocialPosts(userId, page, limit, search, onlyBookmarked);
    }

    try {
        let query = supabase.from('social_posts').select('*, post_bookmarks(userId), post_reactions(userId, reactionType)', { count: 'exact' });

        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        query = query.order('createdAt', { ascending: false });

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

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
    } catch (err) {
        console.warn("getSocialPosts Supabase error, falling back to local storage:", err);
        return handleLocalGetSocialPosts(userId, page, limit, search, onlyBookmarked);
    }
};

export const createSocialPost = async (data: Partial<SocialPost>): Promise<SocialPost> => {
    const fallbackCreate = (): SocialPost => {
        const posts = getLocalSocialPosts();
        const newPost: SocialPost = {
            id: data.id || `post-${Date.now()}`,
            authorId: data.authorId || 'unknown',
            authorName: data.authorName || 'User',
            authorRole: data.authorRole || 'GENERAL_USER',
            title: data.title || '',
            content: data.content || '',
            likes: 0,
            useful: 0,
            fakes: 0,
            bookmarksCount: 0,
            createdAt: new Date().toISOString()
        };
        posts.unshift(newPost);
        saveLocalSocialPosts(posts);
        return newPost;
    };

    if (isLocalMode()) {
        return fallbackCreate();
    }

    try {
        const { data: result, error } = await supabase.from('social_posts').insert({
            ...data,
            createdAt: new Date().toISOString(),
            likes: 0, useful: 0, fakes: 0, bookmarksCount: 0
        }).select().single();
        if (error) throw error;
        return result as SocialPost;
    } catch (err) {
        console.warn("createSocialPost Supabase error (RLS check), falling back to local storage:", err);
        return fallbackCreate();
    }
};

export const reactToPost = async (postId: string, userId: string, type: PostReactionType): Promise<void> => {
    const handleLocalReact = () => {
        const reactions = getLocalPostReactions();
        const posts = getLocalSocialPosts();
        const existingIndex = reactions.findIndex(r => r.postId === postId && r.userId === userId && r.reactionType === type);

        const post = posts.find(p => p.id === postId);

        if (existingIndex !== -1) {
            reactions.splice(existingIndex, 1);
            if (post) {
                if (type === 'LIKE') post.likes = Math.max(0, post.likes - 1);
                else if (type === 'USEFUL') post.useful = Math.max(0, post.useful - 1);
                else if (type === 'FAKE') post.fakes = Math.max(0, post.fakes - 1);
            }
        } else {
            const userReactionsOnPost = reactions.filter(r => r.postId === postId && r.userId === userId);
            userReactionsOnPost.forEach(r => {
                const idx = reactions.indexOf(r);
                if (idx !== -1) reactions.splice(idx, 1);
                if (post) {
                    if (r.reactionType === 'LIKE') post.likes = Math.max(0, post.likes - 1);
                    else if (r.reactionType === 'USEFUL') post.useful = Math.max(0, post.useful - 1);
                    else if (r.reactionType === 'FAKE') post.fakes = Math.max(0, post.fakes - 1);
                }
            });

            reactions.push({
                id: `react-${Date.now()}`,
                postId,
                userId,
                reactionType: type
            });

            if (post) {
                if (type === 'LIKE') post.likes += 1;
                else if (type === 'USEFUL') post.useful += 1;
                else if (type === 'FAKE') post.fakes += 1;
            }
        }

        saveLocalPostReactions(reactions);
        saveLocalSocialPosts(posts);
    };

    if (isLocalMode()) {
        handleLocalReact();
        return;
    }

    try {
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
    } catch (err) {
        console.warn("reactToPost Supabase error, falling back to local storage:", err);
        handleLocalReact();
    }
};

export const bookmarkPost = async (postId: string, userId: string): Promise<boolean> => {
    const handleLocalBookmark = (): boolean => {
        const bookmarks = getLocalPostBookmarks();
        const posts = getLocalSocialPosts();
        const existingIndex = bookmarks.findIndex(b => b.postId === postId && b.userId === userId);
        const post = posts.find(p => p.id === postId);

        let bookmarked = false;
        if (existingIndex !== -1) {
            bookmarks.splice(existingIndex, 1);
            if (post) {
                post.bookmarksCount = Math.max(0, post.bookmarksCount - 1);
            }
        } else {
            bookmarks.push({
                id: `bookmark-${Date.now()}`,
                postId,
                userId
            });
            if (post) {
                post.bookmarksCount += 1;
            }
            bookmarked = true;
        }

        saveLocalPostBookmarks(bookmarks);
        saveLocalSocialPosts(posts);
        return bookmarked;
    };

    if (isLocalMode()) {
        return handleLocalBookmark();
    }

    try {
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
    } catch (err) {
        console.warn("bookmarkPost Supabase error, falling back to local storage:", err);
        return handleLocalBookmark();
    }
};

export const getPostComments = async (postId: string): Promise<PostComment[]> => {
    if (isLocalMode()) {
        return handleLocalGetPostComments(postId);
    }

    try {
        const { data, error } = await supabase.from('post_comments').select('*').eq('postId', postId).order('createdAt', { ascending: true });
        if (error) throw error;
        return data as PostComment[];
    } catch (err) {
        console.warn("getPostComments Supabase error, falling back to local storage:", err);
        return handleLocalGetPostComments(postId);
    }
};

const handleLocalGetPostComments = (postId: string): PostComment[] => {
    const comments = getLocalPostComments();
    return comments.filter(c => c.postId === postId).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
};

export const addPostComment = async (postId: string, userId: string, userName: string, content: string): Promise<PostComment> => {
    const fallbackAddComment = (): PostComment => {
        const comments = getLocalPostComments();
        const newComment: PostComment = {
            id: `comment-${Date.now()}`,
            postId,
            authorId: userId,
            authorName: userName,
            content,
            createdAt: new Date().toISOString()
        };
        comments.push(newComment);
        saveLocalPostComments(comments);
        return newComment;
    };

    if (isLocalMode()) {
        return fallbackAddComment();
    }

    try {
        const { data, error } = await supabase.from('post_comments').insert({
            postId, authorId: userId, authorName: userName, content, createdAt: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        return data as PostComment;
    } catch (err) {
        console.warn("addPostComment Supabase error, falling back to local storage:", err);
        return fallbackAddComment();
    }
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
