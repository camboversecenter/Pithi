
import { 
    Ceremony, Service, Booking, UserRole, Guest, BookingStatus, GuestStatus, 
    Transaction, Invitation, InvitationTemplate, Review, BookingComment, 
    BookingLog, ReportedTransaction, PaginatedResponse, SocialPost, PostReactionType, PostComment
} from '../types';
import { supabase } from './supabaseConfig';

// --- HELPER ---
const isLocalMode = () => {
    return !!localStorage.getItem('pithi_mock_user');
};

// For a real (signed-in) user, a database write error must surface to the UI
// instead of silently falling back to browser storage — otherwise the write
// looks successful but never persists to Supabase, and the list (which reads
// from Supabase) never shows it. The localStorage fallback is kept only for
// genuine local/demo mode.
const surfaceOrFallback = <T>(context: string, err: any, fallback: () => T): T => {
    if (!isLocalMode()) {
        console.error(`${context} failed:`, err);
        throw new Error(err?.message || `${context} failed`);
    }
    console.warn(`${context} local fallback:`, err);
    return fallback();
};

// The live database uses `created_at` (with a default) and maintains its
// updated timestamp via trigger — it does NOT have camelCase createdAt /
// updatedAt / deletedAt columns. Sending those keys makes every insert/update
// fail with "column createdAt does not exist", so strip them before writing.
const stripClientTimestamps = <T extends Record<string, any>>(obj: T): Partial<T> => {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj || {})) {
        if (key === 'createdAt' || key === 'updatedAt' || key === 'deletedAt') continue;
        clean[key] = obj[key];
    }
    return clean as Partial<T>;
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
            bannerUrl: data.bannerUrl || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        ceremonies.push(newCeremony);
        saveLocalCeremonies(ceremonies);
        return newCeremony;
    };

    if (isLocalMode()) {
        return fallbackCreate();
    }
    try {
        const { data: result, error } = await supabase.from('ceremonies')
            .insert(stripClientTimestamps(data))
            .select().single();
        if (error) throw error;
        return result as Ceremony;
    } catch (err) {
        return surfaceOrFallback('createCeremony', err, fallbackCreate);
    }
};

export const updateCeremony = async (id: string, data: Partial<Ceremony>): Promise<Ceremony | null> => {
    const fallbackUpdate = (): Ceremony | null => {
        const ceremonies = getLocalCeremonies();
        const index = ceremonies.findIndex(c => c.id === id);
        if (index === -1) return null;
        ceremonies[index] = { ...ceremonies[index], ...data, updatedAt: new Date().toISOString() };
        saveLocalCeremonies(ceremonies);
        return ceremonies[index];
    };

    if (isLocalMode()) {
        return fallbackUpdate();
    }
    try {
        const { data: result, error } = await supabase.from('ceremonies')
            .update(stripClientTimestamps(data))
            .eq('id', id).select().single();
        if (error) throw error;
        return result as Ceremony;
    } catch (err) {
        return surfaceOrFallback('updateCeremony', err, fallbackUpdate);
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

export interface ServiceFilters {
    minPrice?: number;
    maxPrice?: number;
    locationType?: 'FIXED' | 'FLEXIBLE';
    sort?: 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC';
}

export const getServices = async (role?: UserRole, page = 1, limit = 10, search?: string, filters?: ServiceFilters): Promise<PaginatedResponse<Service>> => {
    const handleLocalGet = (): PaginatedResponse<Service> => {
        let local = getLocalServices();
        if (role) {
            local = local.filter(s => s.role === role);
        }
        if (search) {
            const cleanSearch = search.toLowerCase();
            local = local.filter(s => (s.name || '').toLowerCase().includes(cleanSearch) || (s.providerName || '').toLowerCase().includes(cleanSearch));
        }
        if (filters?.minPrice !== undefined) {
            local = local.filter(s => s.price >= filters.minPrice!);
        }
        if (filters?.maxPrice !== undefined) {
            local = local.filter(s => s.price <= filters.maxPrice!);
        }
        if (filters?.locationType) {
            local = local.filter(s => (s.locationType || 'FIXED') === filters.locationType);
        }

        if (filters?.sort === 'PRICE_ASC') {
            local.sort((a, b) => a.price - b.price);
        } else if (filters?.sort === 'PRICE_DESC') {
            local.sort((a, b) => b.price - a.price);
        } else {
            local.sort((a, b) => b.id.localeCompare(a.id));
        }

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

        if (filters?.minPrice !== undefined) query = query.gte('price', filters.minPrice);
        if (filters?.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);
        if (filters?.locationType) query = query.eq('locationType', filters.locationType);

        if (filters?.sort === 'PRICE_ASC') {
            query = query.order('price', { ascending: true });
        } else if (filters?.sort === 'PRICE_DESC') {
            query = query.order('price', { ascending: false });
        } else {
            query = query.order('id', { ascending: false });
        }

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
            imageUrl: data.imageUrl || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        local.push(newService);
        saveLocalServices(local);
        return newService;
    };

    if (isLocalMode()) {
        return fallbackCreate();
    }

    try {
        const { data: result, error } = await supabase.from('services')
            .insert(stripClientTimestamps(data))
            .select().single();
        if (error) throw error;
        return result as Service;
    } catch (err) {
        return surfaceOrFallback('createService', err, fallbackCreate);
    }
};

export const updateService = async (id: string, data: Partial<Service>): Promise<Service> => {
    const fallbackUpdate = (): Service => {
        const local = getLocalServices();
        const index = local.findIndex(s => s.id === id);
        if (index === -1) {
            const newService = {
                ...data,
                id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null
            } as Service;
            local.push(newService);
            saveLocalServices(local);
            return newService;
        }
        local[index] = { ...local[index], ...data, updatedAt: new Date().toISOString() };
        saveLocalServices(local);
        return local[index];
    };

    if (isLocalMode()) {
        return fallbackUpdate();
    }

    try {
        const { data: result, error } = await supabase.from('services')
            .update(stripClientTimestamps(data))
            .eq('id', id).select().single();
        if (error) throw error;
        return result as Service;
    } catch (err) {
        return surfaceOrFallback('updateService', err, fallbackUpdate);
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

// --- LOCAL FALLBACK HELPERS FOR BOOKINGS, GUESTS, COMMONS, TRANSACTIONS, ETC. ---

const getLocalBookings = (): Booking[] => {
    try {
        const bookingsJson = localStorage.getItem('pithi_local_bookings');
        if (!bookingsJson) {
            const demoBookings: Booking[] = [
                {
                    id: 'b1',
                    serviceId: '1',
                    ceremonyId: 'c1c1c1c1-b2b2-c3c3-d4d4-e5e5e5e5e501',
                    bookedByUserId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e503',
                    providerId: 'provider-1',
                    providerName: 'Classic Band Team',
                    date: '2026-11-18',
                    startTime: '07:30',
                    endTime: '12:00',
                    status: BookingStatus.PENDING,
                    serviceName: 'ក្រុមតន្ត្រីបុរាណខ្មែរប្រណីត (Premium Khmer Classical Band)',
                    price: 350,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                },
                {
                    id: 'b2',
                    serviceId: '2',
                    ceremonyId: 'c1c1c1c1-b2b2-c3c3-d4d4-e5e5e5e5e501',
                    bookedByUserId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e503',
                    providerId: 'provider-2',
                    providerName: 'Wedding Venue Service',
                    date: '2026-11-18',
                    startTime: '13:30',
                    endTime: '22:00',
                    status: BookingStatus.CONFIRMED,
                    serviceName: 'សាលពិធីមង្គលការលំដាប់តារាប្រាំ (Five-Star Wedding Hall)',
                    price: 1500,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                }
            ];
            localStorage.setItem('pithi_local_bookings', JSON.stringify(demoBookings));
            return demoBookings;
        }
        return JSON.parse(bookingsJson);
    } catch {
        return [];
    }
};

const saveLocalBookings = (bookings: Booking[]) => {
    localStorage.setItem('pithi_local_bookings', JSON.stringify(bookings));
};

const getLocalGuests = (): Guest[] => {
    try {
        const guestsJson = localStorage.getItem('pithi_local_guests');
        if (!guestsJson) {
            const demoGuests: Guest[] = [
                {
                    id: 'g1',
                    ceremonyId: 'c1c1c1c1-b2b2-c3c3-d4d4-e5e5e5e5e501',
                    name: 'កែវ សុខា (Keo Sokha)',
                    phoneNumber: '012345678',
                    status: GuestStatus.PENDING,
                    guestType: 'FAMILY',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                },
                {
                    id: 'g2',
                    ceremonyId: 'c1c1c1c1-b2b2-c3c3-d4d4-e5e5e5e5e501',
                    name: 'ចាន់ មុន្នី (Chan Mony)',
                    phoneNumber: '087654321',
                    status: GuestStatus.ACCEPTED,
                    guestType: 'FRIEND',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                }
            ];
            localStorage.setItem('pithi_local_guests', JSON.stringify(demoGuests));
            return demoGuests;
        }
        return JSON.parse(guestsJson);
    } catch {
        return [];
    }
};

const saveLocalGuests = (guests: Guest[]) => {
    localStorage.setItem('pithi_local_guests', JSON.stringify(guests));
};

const getLocalBookingComments = (): BookingComment[] => {
    try {
        const commentsJson = localStorage.getItem('pithi_local_booking_comments');
        if (!commentsJson) return [];
        return JSON.parse(commentsJson);
    } catch {
        return [];
    }
};

const saveLocalBookingComments = (comments: BookingComment[]) => {
    localStorage.setItem('pithi_local_booking_comments', JSON.stringify(comments));
};

const getLocalBookingLogs = (): BookingLog[] => {
    try {
        const logsJson = localStorage.getItem('pithi_local_booking_logs');
        if (!logsJson) return [];
        return JSON.parse(logsJson);
    } catch {
        return [];
    }
};

const saveLocalBookingLogs = (logs: BookingLog[]) => {
    localStorage.setItem('pithi_local_booking_logs', JSON.stringify(logs));
};

const getLocalInvitationTemplates = (): InvitationTemplate[] => {
    try {
        const key = 'pithi_local_invitation_templates';
        const templatesJson = localStorage.getItem(key);
        if (!templatesJson) {
            const demoTemplates: InvitationTemplate[] = [
                {
                    id: 't1',
                    ceremonyId: 'c1c1c1c1-b2b2-c3c3-d4d4-e5e5e5e5e501',
                    type: 'Standard',
                    message: 'សូមគោរពអញ្ជើញឯកឧត្តម លោកជំទាវ លោកប្រុស លោកស្រី ចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយសក្នុងពិធីមង្គលការកូនរបស់យើងខ្ញុំ។',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                }
            ];
            localStorage.setItem(key, JSON.stringify(demoTemplates));
            return demoTemplates;
        }
        return JSON.parse(templatesJson);
    } catch {
        return [];
    }
};

const saveLocalInvitationTemplates = (templates: InvitationTemplate[]) => {
    localStorage.setItem('pithi_local_invitation_templates', JSON.stringify(templates));
};

const getLocalTransactions = (): Transaction[] => {
    try {
        const key = 'pithi_local_transactions';
        const transJson = localStorage.getItem(key);
        if (!transJson) {
            const demoTrans: Transaction[] = [
                {
                    id: 'tr1',
                    ceremonyId: 'c1c1c1c1-b2b2-c3c3-d4d4-e5e5e5e5e501',
                    donorName: 'ហេង ស្រីពៅ (Heng Sreypov)',
                    amount: 50,
                    type: 'INCOME',
                    category: 'Gift',
                    date: '2026-11-18',
                    giftDescription: 'ចងដៃមង្គលការ',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                }
            ];
            localStorage.setItem(key, JSON.stringify(demoTrans));
            return demoTrans;
        }
        return JSON.parse(transJson);
    } catch {
        return [];
    }
};

const saveLocalTransactions = (trans: Transaction[]) => {
    localStorage.setItem('pithi_local_transactions', JSON.stringify(trans));
};

const getLocalReportedTransactions = (): ReportedTransaction[] => {
    try {
        const key = 'pithi_local_reported_transactions';
        const repJson = localStorage.getItem(key);
        if (!repJson) return [];
        return JSON.parse(repJson);
    } catch {
        return [];
    }
};

const saveLocalReportedTransactions = (reps: ReportedTransaction[]) => {
    localStorage.setItem('pithi_local_reported_transactions', JSON.stringify(reps));
};

const getLocalReviews = (): Review[] => {
    try {
        const key = 'pithi_local_reviews';
        const revsJson = localStorage.getItem(key);
        if (!revsJson) {
            const demoReviews: Review[] = [
                {
                    id: 'r1',
                    serviceId: '1',
                    userId: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e503',
                    userName: 'Sophea & Chantrea',
                    rating: 5,
                    comment: 'ក្រុមភ្លេងលេងបានពីរោះរណ្តំចិត្តណាស់! ភ្ញៀវសរសើរគ្រប់គ្នាតែម្តង។ សេវាកម្មល្អឥតខ្ចោះ!',
                    date: '2026-05-15',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null
                }
            ];
            localStorage.setItem(key, JSON.stringify(demoReviews));
            return demoReviews;
        }
        return JSON.parse(revsJson);
    } catch {
        return [];
    }
};

const saveLocalReviews = (reviews: Review[]) => {
    localStorage.setItem('pithi_local_reviews', JSON.stringify(reviews));
};

// --- BOOKINGS ---

export const getBookings = async (userId: string, role: UserRole, page: number, limit: number, timeFilter: 'UPCOMING' | 'PAST' | 'ALL'): Promise<PaginatedResponse<Booking>> => {
    const fallbackGet = () => {
        let local = getLocalBookings();
        if (role === UserRole.ORGANIZER || role === UserRole.GENERAL_USER) {
            local = local.filter(b => b.bookedByUserId === userId);
        } else {
            local = local.filter(b => b.providerId === userId);
        }

        const today = new Date().toISOString().split('T')[0];
        if (timeFilter === 'UPCOMING') {
            local = local.filter(b => b.date >= today);
        } else if (timeFilter === 'PAST') {
            local = local.filter(b => b.date < today);
        }

        local.sort((a, b) => a.date.localeCompare(b.date));

        const from = (page - 1) * limit;
        const to = from + limit;
        const pageItems = local.slice(from, to);

        const ceremonies = getLocalCeremonies();
        const mappedData = pageItems.map(b => {
            const ceremony = ceremonies.find(c => c.id === b.ceremonyId);
            return {
                ...b,
                ceremonyTitle: ceremony?.title || 'Unknown Ceremony'
            };
        });

        return {
            data: mappedData,
            total: local.length,
            page,
            limit,
            totalPages: Math.ceil(local.length / limit)
        };
    };

    if (isLocalMode()) {
        return fallbackGet();
    }

    try {
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
        if (error) throw error;

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
    } catch (err) {
        console.warn("getBookings Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const getBookingsByService = async (serviceId: string): Promise<Booking[]> => {
    const fallbackGet = () => {
        const local = getLocalBookings().filter(b => b.serviceId === serviceId && b.status !== BookingStatus.CANCELLED);
        const ceremonies = getLocalCeremonies();
        return local.map(b => {
            const ceremony = ceremonies.find(c => c.id === b.ceremonyId);
            return {
                ...b,
                ceremonyTitle: ceremony?.title || 'Unknown Ceremony'
            };
        });
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error } = await supabase.from('bookings').select('*, ceremonies(title)')
            .eq('serviceId', serviceId)
            .neq('status', BookingStatus.CANCELLED);
        
        if (error) throw error;
        
        return (data as any[] || []).map(b => ({
            ...b,
            ceremonyTitle: b.ceremonies?.title || 'Unknown Ceremony'
        })) as Booking[];
    } catch (err) {
        console.warn("getBookingsByService Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

const timesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
    aStart < bEnd && aEnd > bStart;

// CONFIRMED bookings of the same service that clash with the given slot.
// Works in local mode too since it builds on getBookingsByService.
export const getConfirmedBookingConflicts = async (serviceId: string, date: string, startTime: string, endTime: string, excludeBookingId?: string): Promise<Booking[]> => {
    const all = await getBookingsByService(serviceId);
    return all.filter(b =>
        b.date === date &&
        b.status === BookingStatus.CONFIRMED &&
        String(b.id) !== String(excludeBookingId ?? '') &&
        timesOverlap(b.startTime, b.endTime, startTime, endTime)
    );
};

// Matches the raise message of the enforce_booking_no_overlap DB trigger.
const isBookingConflictError = (err: any) =>
    typeof err?.message === 'string' && err.message.includes('កក់រួចហើយ');

export const getBookingById = async (id: string): Promise<Booking | null> => {
    const fallbackGet = () => {
        const b = getLocalBookings().find(x => x.id === id);
        if (!b) return null;
        const ceremony = getLocalCeremonies().find(c => c.id === b.ceremonyId);
        return {
            ...b,
            ceremonyTitle: ceremony?.title || 'Unknown Ceremony'
        };
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error } = await supabase.from('bookings').select('*, ceremonies(title)').eq('id', id).single();
         if (error || !data) throw error || new Error('Not found');
        
        return {
            ...data,
            ceremonyTitle: (data as any).ceremonies?.title || 'Unknown Ceremony'
        } as Booking;
    } catch (err) {
        console.warn("getBookingById Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const createBooking = async (data: Partial<Booking>): Promise<Booking> => {
    const fallbackCreate = () => {
        const local = getLocalBookings();
        const service = getLocalServices().find(s => s.id === data.serviceId);
        const newBooking: Booking = {
            id: 'b-' + Math.random().toString(36).substr(2, 9),
            serviceId: data.serviceId || '',
            ceremonyId: data.ceremonyId || '',
            bookedByUserId: data.bookedByUserId || '',
            bookedByUserName: data.bookedByUserName || 'Guest',
            providerId: data.providerId || service?.providerId || '',
            providerName: service?.providerName || '',
            date: data.date || '',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            status: BookingStatus.PENDING,
            serviceName: data.serviceName || service?.name || 'Unknown Service',
            price: data.price || service?.price || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        local.push(newBooking);
        saveLocalBookings(local);
        addLocalBookingLog(newBooking.id, "CREATED", "Booking created", newBooking.bookedByUserId, newBooking.bookedByUserName || 'Guest');
        return newBooking;
    };

    if (isLocalMode()) return fallbackCreate();

    try {
        const { data: result, error } = await supabase.from('bookings').insert({
            ...stripClientTimestamps(data),
            status: BookingStatus.PENDING
        }).select().single();
        if (error) throw error;
        return result as Booking;
    } catch (err) {
        return surfaceOrFallback('createBooking', err, fallbackCreate);
    }
};

export const updateBookingStatus = async (id: string, status: BookingStatus): Promise<void> => {
    // Confirming must not double-book the service's time slot.
    if (status === BookingStatus.CONFIRMED) {
        const booking = await getBookingById(id);
        if (booking) {
            const conflicts = await getConfirmedBookingConflicts(booking.serviceId, booking.date, booking.startTime, booking.endTime, id);
            if (conflicts.length > 0) {
                throw new Error(`ម៉ោងនេះត្រូវបានកក់រួចហើយ (${conflicts[0].startTime} - ${conflicts[0].endTime})។ សូមកែកាលវិភាគការកក់ណាមួយជាមុនសិន។`);
            }
        }
    }

    const fallbackUpdate = () => {
        const local = getLocalBookings();
        const index = local.findIndex(b => b.id === id);
        if (index !== -1) {
            local[index].status = status;
            local[index].updatedAt = new Date().toISOString();
            saveLocalBookings(local);
        }
    };

    if (isLocalMode()) {
        fallbackUpdate();
        return;
    }

    try {
        const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
        if (error) throw error;
    } catch (err) {
        // A double-booking rejection from the DB trigger is a real answer,
        // not an outage — surface it instead of "succeeding" locally.
        if (isBookingConflictError(err)) throw err;
        console.warn("updateBookingStatus Supabase error, falling back to local storage:", err);
        fallbackUpdate();
    }
};

export const updateBookingSchedule = async (id: string, date: string, startTime: string, endTime: string, userId: string, userName: string): Promise<Booking> => {
    // Rescheduling a CONFIRMED booking must not land on an occupied slot.
    const existing = await getBookingById(id);
    if (existing && existing.status === BookingStatus.CONFIRMED) {
        const conflicts = await getConfirmedBookingConflicts(existing.serviceId, date, startTime, endTime, id);
        if (conflicts.length > 0) {
            throw new Error(`ម៉ោងនេះត្រូវបានកក់រួចហើយ (${conflicts[0].startTime} - ${conflicts[0].endTime})។ សូមជ្រើសរើសម៉ោងផ្សេង។`);
        }
    }

    const fallbackUpdate = () => {
        const local = getLocalBookings();
        const index = local.findIndex(b => b.id === id);
        if (index === -1) throw new Error('Booking not found');
        
        local[index] = {
            ...local[index],
            date,
            startTime,
            endTime,
            updatedAt: new Date().toISOString()
        };
        saveLocalBookings(local);
        addLocalBookingLog(id, "SCHEDULE_CHANGE", `Updated to ${date} ${startTime}-${endTime}`, userId, userName);
        
        const ceremony = getLocalCeremonies().find(c => c.id === local[index].ceremonyId);
        return {
            ...local[index],
            ceremonyTitle: ceremony?.title || 'Unknown Ceremony'
        };
    };

    if (isLocalMode()) return fallbackUpdate();

    try {
        const { data, error } = await supabase.from('bookings').update({
            date,
            startTime,
            endTime
        }).eq('id', id).select('*, ceremonies(title)').single();
        if (error) throw error;
        
        await addBookingLog(id, "SCHEDULE_CHANGE", `Updated to ${date} ${startTime}-${endTime}`, userId, userName);
        
        return {
            ...data,
            ceremonyTitle: (data as any).ceremonies?.title || 'Unknown Ceremony'
        } as Booking;
    } catch (err) {
        if (isBookingConflictError(err)) throw err;
        console.warn("updateBookingSchedule Supabase error, falling back to local storage:", err);
        return fallbackUpdate();
    }
};

export const deleteBooking = async (id: string): Promise<void> => {
    const fallbackDelete = () => {
        const local = getLocalBookings();
        const filtered = local.filter(b => b.id !== id);
        saveLocalBookings(filtered);
    };

    if (isLocalMode()) {
        fallbackDelete();
        return;
    }

    try {
        const { error } = await supabase.from('bookings').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn("deleteBooking Supabase error, falling back to local storage:", err);
        fallbackDelete();
    }
};

export const getBookingComments = async (bookingId: string): Promise<BookingComment[]> => {
    const fallbackGet = () => {
        return getLocalBookingComments().filter(c => c.bookingId === bookingId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error } = await supabase.from('booking_comments').select('*').eq('bookingId', bookingId).order('timestamp', { ascending: true });
        if (error) throw error;
        return data as BookingComment[];
    } catch (err) {
        console.warn("getBookingComments Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const addBookingComment = async (bookingId: string, userId: string, userName: string, role: UserRole, content: string): Promise<BookingComment> => {
    const fallbackAdd = () => {
        const local = getLocalBookingComments();
        const newComment: BookingComment = {
            id: 'bc-' + Math.random().toString(36).substr(2, 9),
            bookingId,
            userId,
            userName,
            role,
            content,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        local.push(newComment);
        saveLocalBookingComments(local);
        return newComment;
    };

    if (isLocalMode()) return fallbackAdd();

    try {
        const { data, error } = await supabase.from('booking_comments').insert({
            bookingId, userId, userName, role, content,
            timestamp: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        return data as BookingComment;
    } catch (err) {
        console.warn("addBookingComment Supabase error, falling back to local storage:", err);
        return fallbackAdd();
    }
};

export const getBookingLogs = async (bookingId: string): Promise<BookingLog[]> => {
    const fallbackGet = () => {
        return getLocalBookingLogs().filter(l => l.bookingId === bookingId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error } = await supabase.from('booking_logs').select('*').eq('bookingId', bookingId).order('timestamp', { ascending: true });
        if (error) throw error;
        return data as BookingLog[];
    } catch (err) {
        console.warn("getBookingLogs Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

const addLocalBookingLog = (bookingId: string, action: string, details: string, userId: string, userName: string) => {
    const local = getLocalBookingLogs();
    const newLog: BookingLog = {
        id: 'bl-' + Math.random().toString(36).substr(2, 9),
        bookingId,
        action,
        details,
        userId,
        userName,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
    };
    local.push(newLog);
    saveLocalBookingLogs(local);
};

const addBookingLog = async (bookingId: string, action: string, details: string, userId: string, userName: string) => {
    if (isLocalMode()) {
        addLocalBookingLog(bookingId, action, details, userId, userName);
        return;
    }

    try {
        const { error } = await supabase.from('booking_logs').insert({
            bookingId, action, details, userId, userName,
            timestamp: new Date().toISOString()
        });
        if (error) throw error;
    } catch (err) {
        console.warn("addBookingLog Supabase error, falling back to local storage:", err);
        addLocalBookingLog(bookingId, action, details, userId, userName);
    }
};

// --- GUESTS & INVITATIONS ---

export const getGuests = async (ceremonyId: string, page = 1, limit = 1000): Promise<PaginatedResponse<Guest>> => {
    const fallbackGet = () => {
        const local = getLocalGuests().filter(g => g.ceremonyId === ceremonyId);
        const from = (page - 1) * limit;
        const to = from + limit;
        const pageItems = local.slice(from, to);
        return {
            data: pageItems,
            total: local.length,
            page,
            limit,
            totalPages: Math.ceil(local.length / limit)
        };
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error, count } = await supabase.from('guests').select('*', { count: 'exact' }).eq('ceremonyId', ceremonyId);
        if (error) throw error;
        
        return {
            data: (data as Guest[]) || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    } catch (err) {
        console.warn("getGuests Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const addGuest = async (data: Partial<Guest>): Promise<Guest> => {
    const fallbackAdd = () => {
        const local = getLocalGuests();
        const newGuest: Guest = {
            id: 'g-' + Math.random().toString(36).substr(2, 9),
            ceremonyId: data.ceremonyId || '',
            userId: data.userId || undefined,
            name: data.name || '',
            phoneNumber: data.phoneNumber || '',
            status: data.status || GuestStatus.PENDING,
            guestType: data.guestType || 'FRIEND',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        local.push(newGuest);
        saveLocalGuests(local);
        return newGuest;
    };

    if (isLocalMode()) return fallbackAdd();

    try {
        const { data: result, error } = await supabase.from('guests').insert({
            ...stripClientTimestamps(data),
            status: data.status || GuestStatus.PENDING
        }).select().single();
        if (error) throw error;
        return result as Guest;
    } catch (err) {
        console.warn("addGuest Supabase error, falling back to local storage:", err);
        return fallbackAdd();
    }
};

export const setGuestCheckIn = async (guestId: string, checkedIn: boolean): Promise<Guest | null> => {
    const checkedInAt = checkedIn ? new Date().toISOString() : null;

    const fallbackUpdate = (): Guest | null => {
        const local = getLocalGuests();
        const index = local.findIndex(g => g.id === guestId);
        if (index === -1) return null;
        local[index] = { ...local[index], checkedInAt, updatedAt: new Date().toISOString() };
        saveLocalGuests(local);
        return local[index];
    };

    if (isLocalMode()) return fallbackUpdate();

    try {
        const { data, error } = await supabase.from('guests').update({
            checkedInAt
        }).eq('id', guestId).select().single();
        if (error) throw error;
        return data as Guest;
    } catch (err) {
        console.warn("setGuestCheckIn Supabase error, falling back to local storage:", err);
        return fallbackUpdate();
    }
};

export const deleteGuest = async (id: string): Promise<void> => {
    const fallbackDelete = () => {
        const local = getLocalGuests();
        const filtered = local.filter(g => g.id !== id);
        saveLocalGuests(filtered);
    };

    if (isLocalMode()) {
        fallbackDelete();
        return;
    }

    try {
        const { error } = await supabase.from('guests').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn("deleteGuest Supabase error, falling back to local storage:", err);
        fallbackDelete();
    }
};

export const getMyInvitations = async (userId: string, page = 1, limit = 10, status: 'UPCOMING' | 'PAST' | 'ALL' = 'UPCOMING'): Promise<PaginatedResponse<Invitation>> => {
    const fallbackGet = () => {
        const guests = getLocalGuests().filter(g => g.userId === userId);
        if (guests.length === 0) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }

        const ceremonies = getLocalCeremonies();
        const invitations: Invitation[] = [];

        const today = new Date().toISOString().split('T')[0];

        for (const c of ceremonies) {
            if (status === 'UPCOMING' && c.date < today) continue;
            if (status === 'PAST' && c.date >= today) continue;

            const guestRecord = guests.find(g => g.ceremonyId === c.id);
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

    if (isLocalMode()) return fallbackGet();

    try {
        const { data: guests, error: guestError } = await supabase.from('guests').select('*').eq('userId', userId);
        if (guestError) throw guestError;

        if (!guests || guests.length === 0) {
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0
            };
        }

        const ceremonyIds = guests.map((g: Guest) => g.ceremonyId);
        let ceremonyQuery = supabase.from('ceremonies').select('*').in('id', ceremonyIds);

        const today = new Date().toISOString().split('T')[0];
        if (status === 'UPCOMING') {
            ceremonyQuery = ceremonyQuery.gte('date', today);
        } else if (status === 'PAST') {
            ceremonyQuery = ceremonyQuery.lt('date', today);
        }

        const { data: ceremonies, error: ceremonyError } = await ceremonyQuery;
        if (ceremonyError) throw ceremonyError;

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
    } catch (err) {
        console.warn("getMyInvitations Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const respondToInvitation = async (guestId: string, status: GuestStatus): Promise<void> => {
    const fallbackUpdate = () => {
        const local = getLocalGuests();
        const index = local.findIndex(g => g.id === guestId);
        if (index !== -1) {
            local[index].status = status;
            local[index].updatedAt = new Date().toISOString();
            saveLocalGuests(local);
        }
    };

    if (isLocalMode()) {
        fallbackUpdate();
        return;
    }

    try {
        const { error } = await supabase.from('guests').update({ status }).eq('id', guestId);
        if (error) throw error;
    } catch (err) {
        console.warn("respondToInvitation Supabase error, falling back to local storage:", err);
        fallbackUpdate();
    }
};

export const getInvitationTemplates = async (ceremonyId: string): Promise<InvitationTemplate[]> => {
    const fallbackGet = () => {
        return getLocalInvitationTemplates().filter(t => t.ceremonyId === ceremonyId);
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error } = await supabase.from('invitation_templates').select('*').eq('ceremonyId', ceremonyId);
        if (error) throw error;
        return data as InvitationTemplate[];
    } catch (err) {
        console.warn("getInvitationTemplates Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const saveInvitationTemplate = async (data: Partial<InvitationTemplate>): Promise<InvitationTemplate> => {
    const fallbackSave = () => {
        const local = getLocalInvitationTemplates();
        if (data.id) {
            const index = local.findIndex(t => t.id === data.id);
            if (index !== -1) {
                local[index] = {
                    ...local[index],
                    ...data,
                    updatedAt: new Date().toISOString()
                };
                saveLocalInvitationTemplates(local);
                return local[index];
            }
        }
        
        const newTemplate: InvitationTemplate = {
            id: data.id || 't-' + Math.random().toString(36).substr(2, 9),
            ceremonyId: data.ceremonyId || '',
            type: data.type || 'Standard',
            message: data.message || '',
            bannerUrl: data.bannerUrl,
            expirationDate: data.expirationDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        local.push(newTemplate);
        saveLocalInvitationTemplates(local);
        return newTemplate;
    };

    if (isLocalMode()) return fallbackSave();

    try {
        if (data.id) {
            const { data: res, error } = await supabase.from('invitation_templates')
                .update(stripClientTimestamps(data))
                .eq('id', data.id).select().single();
            if (error) throw error;
            return res as InvitationTemplate;
        } else {
            const { data: res, error } = await supabase.from('invitation_templates')
                .insert(stripClientTimestamps(data))
                .select().single();
            if (error) throw error;
            return res as InvitationTemplate;
        }
    } catch (err) {
        console.warn("saveInvitationTemplate Supabase error, falling back to local storage:", err);
        return fallbackSave();
    }
};

export const deleteInvitationTemplate = async (id: string): Promise<void> => {
    const fallbackDelete = () => {
        const local = getLocalInvitationTemplates();
        const filtered = local.filter(t => t.id !== id);
        saveLocalInvitationTemplates(filtered);
    };

    if (isLocalMode()) {
        fallbackDelete();
        return;
    }

    try {
        const { error } = await supabase.from('invitation_templates').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn("deleteInvitationTemplate Supabase error, falling back to local storage:", err);
        fallbackDelete();
    }
};

// --- TRANSACTIONS ---

export const getTransactions = async (ceremonyId: string, page = 1, limit = 1000): Promise<PaginatedResponse<Transaction>> => {
    const fallbackGet = () => {
        const local = getLocalTransactions().filter(t => t.ceremonyId === ceremonyId);
        const from = (page - 1) * limit;
        const to = from + limit;
        const pageItems = local.slice(from, to);
        return {
            data: pageItems,
            total: local.length,
            page,
            limit,
            totalPages: Math.ceil(local.length / limit)
        };
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error, count } = await supabase.from('transactions').select('*', { count: 'exact' }).eq('ceremonyId', ceremonyId);
        if (error) throw error;
        
        return {
            data: (data as Transaction[]) || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    } catch (err) {
        console.warn("getTransactions Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const addTransaction = async (data: Partial<Transaction>): Promise<Transaction> => {
    const fallbackAdd = () => {
        const local = getLocalTransactions();
        const newTrans: Transaction = {
            id: 'tr-' + Math.random().toString(36).substr(2, 9),
            ceremonyId: data.ceremonyId || '',
            donorName: data.donorName,
            expenseName: data.expenseName,
            category: data.category || 'Gift',
            amount: data.amount || 0,
            giftDescription: data.giftDescription,
            type: data.type || 'INCOME',
            date: data.date || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        local.push(newTrans);
        saveLocalTransactions(local);
        return newTrans;
    };

    if (isLocalMode()) return fallbackAdd();

    try {
        const { data: result, error } = await supabase.from('transactions')
            .insert(stripClientTimestamps(data))
            .select().single();
        if (error) throw error;
        return result as Transaction;
    } catch (err) {
        console.warn("addTransaction Supabase error, falling back to local storage:", err);
        return fallbackAdd();
    }
};

export const deleteTransaction = async (id: string): Promise<void> => {
    const fallbackDelete = () => {
        const local = getLocalTransactions();
        const filtered = local.filter(t => t.id !== id);
        saveLocalTransactions(filtered);
    };

    if (isLocalMode()) {
        fallbackDelete();
        return;
    }

    try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        console.warn("deleteTransaction Supabase error, falling back to local storage:", err);
        fallbackDelete();
    }
};

export const reportTransaction = async (data: Partial<ReportedTransaction>): Promise<ReportedTransaction> => {
    const fallbackReport = () => {
        const local = getLocalReportedTransactions();
        const newRep: ReportedTransaction = {
            id: 'rep-' + Math.random().toString(36).substr(2, 9),
            ceremonyId: data.ceremonyId || '',
            guestId: data.guestId || '',
            guestName: data.guestName || '',
            amount: data.amount || 0,
            currency: data.currency || 'USD',
            date: data.date || new Date().toISOString().split('T')[0],
            senderNameFromReceipt: data.senderNameFromReceipt,
            receiptImageUrl: data.receiptImageUrl || '',
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        local.push(newRep);
        saveLocalReportedTransactions(local);
        return newRep;
    };

    if (isLocalMode()) return fallbackReport();

    try {
        const { data: result, error } = await supabase.from('reported_transactions').insert({
            ...stripClientTimestamps(data),
            status: 'PENDING',
            timestamp: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        return result as ReportedTransaction;
    } catch (err) {
        console.warn("reportTransaction Supabase error, falling back to local storage:", err);
        return fallbackReport();
    }
};

export const getMyReportedTransactions = async (ceremonyId: string, guestId: string): Promise<ReportedTransaction[]> => {
    const fallbackGet = () => {
        return getLocalReportedTransactions().filter(r => r.ceremonyId === ceremonyId && r.guestId === guestId);
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error } = await supabase.from('reported_transactions').select('*').eq('ceremonyId', ceremonyId).eq('guestId', guestId);
        if (error) throw error;
        return data as ReportedTransaction[];
    } catch (err) {
        console.warn("getMyReportedTransactions Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const getPendingReportedTransactions = async (ceremonyId: string): Promise<ReportedTransaction[]> => {
    const fallbackGet = () => {
        return getLocalReportedTransactions().filter(r => r.ceremonyId === ceremonyId && r.status === 'PENDING');
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error } = await supabase.from('reported_transactions').select('*').eq('ceremonyId', ceremonyId).eq('status', 'PENDING');
        if (error) throw error;
        return data as ReportedTransaction[];
    } catch (err) {
        console.warn("getPendingReportedTransactions Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const confirmReportedTransaction = async (reportId: string): Promise<void> => {
    const fallbackConfirm = async () => {
        const local = getLocalReportedTransactions();
        const index = local.findIndex(r => r.id === reportId);
        if (index === -1) throw new Error('Report not found');

        local[index].status = 'CONFIRMED';
        local[index].updatedAt = new Date().toISOString();
        saveLocalReportedTransactions(local);

        const report = local[index];
        let amountUSD = report.amount;
        if (report.currency === 'KHR') amountUSD = report.amount / 4000;

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

    if (isLocalMode()) {
        await fallbackConfirm();
        return;
    }

    try {
        const { data: report, error } = await supabase.from('reported_transactions').update({
            status: 'CONFIRMED'
        }).eq('id', reportId).select().single();
        if (error || !report) throw error || new Error('Report empty');

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
    } catch (err) {
        console.warn("confirmReportedTransaction Supabase error, falling back to local storage:", err);
        await fallbackConfirm();
    }
};

export const rejectReportedTransaction = async (reportId: string): Promise<void> => {
    const fallbackReject = () => {
        const local = getLocalReportedTransactions();
        const filtered = local.filter(r => r.id !== reportId);
        saveLocalReportedTransactions(filtered);
    };

    if (isLocalMode()) {
        fallbackReject();
        return;
    }

    try {
        const { error } = await supabase.from('reported_transactions').delete().eq('id', reportId);
        if (error) throw error;
    } catch (err) {
        console.warn("rejectReportedTransaction Supabase error, falling back to local storage:", err);
        fallbackReject();
    }
};

// --- REVIEWS ---

export const getReviews = async (): Promise<Review[]> => {
    const fallbackGet = () => {
        return getLocalReviews().sort((a, b) => b.date.localeCompare(a.date));
    };

    if (isLocalMode()) return fallbackGet();

    try {
        const { data, error } = await supabase.from('reviews').select('*').order('date', { ascending: false });
        if (error) throw error;
        return data as Review[];
    } catch (err) {
        console.warn("getReviews Supabase error, falling back to local storage:", err);
        return fallbackGet();
    }
};

export const addReview = async (data: Partial<Review>): Promise<Review> => {
    const fallbackAdd = () => {
        const local = getLocalReviews();
        const newReview: Review = {
            id: 'rev-' + Math.random().toString(36).substr(2, 9),
            serviceId: data.serviceId || '',
            userId: data.userId || '',
            userName: data.userName || 'Guest',
            rating: data.rating || 5,
            comment: data.comment || '',
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        };
        local.push(newReview);
        saveLocalReviews(local);
        return newReview;
    };

    if (isLocalMode()) return fallbackAdd();

    try {
        const { data: result, error } = await supabase.from('reviews').insert({
            ...stripClientTimestamps(data),
            date: new Date().toISOString().split('T')[0]
        }).select().single();
        if (error) throw error;
        return result as Review;
    } catch (err) {
        console.warn("addReview Supabase error, falling back to local storage:", err);
        return fallbackAdd();
    }
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

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const mapRows = (rows: any[]): SocialPost[] => (rows || []).map(p => ({
        ...p,
        isBookmarked: p.post_bookmarks?.some((b: any) => b.userId === userId),
        myReaction: p.post_reactions?.find((r: any) => r.userId === userId)?.reactionType
    }));

    try {
        let query = supabase.from('social_posts').select('*, post_bookmarks(userId), post_reactions(userId, reactionType)', { count: 'exact' });

        if (onlyBookmarked) {
            // Restrict to the posts this user bookmarked BEFORE paginating, so the
            // page size and total count are correct (filtering after range() would
            // drop rows from the page and report the wrong total).
            const { data: bookmarkRows } = await supabase.from('post_bookmarks').select('postId').eq('userId', userId);
            const bookmarkedIds = (bookmarkRows || []).map((b: any) => b.postId);
            if (bookmarkedIds.length === 0) {
                return { data: [], total: 0, page, limit, totalPages: 0 };
            }
            query = query.in('id', bookmarkedIds);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        query = query.order('createdAt', { ascending: false }).range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        return {
            data: mapRows(data as any[]),
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
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
            ...stripClientTimestamps(data),
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

    const colFor = (t: string) => t === 'LIKE' ? 'likes' : t === 'USEFUL' ? 'useful' : 'fakes';

    try {
        // A user has at most one reaction per post. Look up whatever they had.
        const { data: priorRows } = await supabase.from('post_reactions').select('*').eq('postId', postId).eq('userId', userId).limit(1);
        const prior = priorRows && priorRows[0];

        if (prior && prior.reactionType === type) {
            // Same reaction tapped again -> toggle it off.
            await supabase.from('post_reactions').delete().eq('id', prior.id);
            await supabase.rpc('decrement_post_stat', { post_id: postId, col_name: colFor(type) });
        } else {
            // Switching from a different reaction -> decrement the OLD counter too,
            // otherwise the previous reaction's count is left inflated.
            if (prior) {
                await supabase.from('post_reactions').delete().eq('id', prior.id);
                await supabase.rpc('decrement_post_stat', { post_id: postId, col_name: colFor(prior.reactionType) });
            }
            await supabase.from('post_reactions').insert({ postId, userId, reactionType: type });
            await supabase.rpc('increment_post_stat', { post_id: postId, col_name: colFor(type) });
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
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
            postId,
            authorId: userId,
            authorName: userName,
            content,
            createdAt: new Date().toISOString()
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
