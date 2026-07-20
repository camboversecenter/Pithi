
import { User, UserRole } from '../types';
import { supabase } from './supabaseConfig';

let currentUser: User | null = null;
let pendingRegistrationUser: Partial<User> | null = null;
let isAuthInitialized = false;
let authListeners: ((user: User | null) => void)[] = [];

const ADMIN_EMAIL = 'pithi.deva@gmail.com';

// Subscribe to auth changes
export const subscribe = (listener: (user: User | null) => void) => {
    authListeners.push(listener);
    if (isAuthInitialized) {
        listener(currentUser);
    }
    return () => {
        authListeners = authListeners.filter(l => l !== listener);
    };
};

const setCurrentUser = (user: User | null) => {
    currentUser = user;
    isAuthInitialized = true;
    authListeners.forEach(l => l(user));
};

// --- RESTORE SESSION ---
const restoreSession = async () => {
    // Drop any stale local demo session left over from earlier test-account logins
    // so every returning user is authenticated through real Google OAuth.
    localStorage.removeItem('pithi_mock_user');

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            await handleSupabaseUser(session.user);
        } else {
            setCurrentUser(null);
        }
    } catch (e) {
        console.warn("Supabase session restore failed, probably missing configuration:", e);
        setCurrentUser(null);
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
            await handleSupabaseUser(session.user);
        } else {
            setCurrentUser(null);
        }
    });
};

const handleSupabaseUser = async (authUser: any) => {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

        // --- SUPER ADMIN AUTO-PROMOTION & ENFORCEMENT ---
        if (authUser.email === ADMIN_EMAIL) {
            if (!data) {
                // Case 1: First time login, create the admin profile
                const newAdmin: User = {
                    id: authUser.id,
                    name: authUser.user_metadata?.full_name || 'Super Admin',
                    email: authUser.email,
                    avatarUrl: authUser.user_metadata?.avatar_url,
                    role: UserRole.ADMIN
                };
                const { error: insertError } = await supabase.from('users').insert(newAdmin);
                if (!insertError) {
                    data = newAdmin;
                    error = null;
                }
            } else if (data.role !== UserRole.ADMIN) {
                // Case 2: User exists but role is not ADMIN, upgrade automatically
                const { data: updatedAdmin, error: updateError } = await supabase
                    .from('users')
                    .update({ role: UserRole.ADMIN })
                    .eq('id', authUser.id)
                    .select()
                    .single();

                if (!updateError && updatedAdmin) {
                    data = updatedAdmin;
                }
            }
        }

        if (error || !data) {
            console.log("User authenticated but no profile found. Setting pending state.");
            pendingRegistrationUser = {
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                avatarUrl: authUser.user_metadata?.avatar_url
            };
            setCurrentUser(null);
        } else {
            pendingRegistrationUser = null;
            setCurrentUser(data as User);
        }
    } catch (e) {
        console.error("Supabase Profile Fetch Error:", e);
        setCurrentUser(null);
    }
};

restoreSession();

export const getCurrentUser = (): User | null => {
  return currentUser;
};

export const isSuperAdmin = (): boolean => {
    return currentUser?.email === ADMIN_EMAIL;
};

export const switchMyRole = async (newRole: UserRole): Promise<void> => {
    if (!currentUser) return;
    const { data, error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', currentUser.id)
        .select()
        .single();

    if (error) throw error;
    setCurrentUser(data as User);
};

export const getUsers = async (role?: UserRole): Promise<User[]> => {
    try {
        let query = supabase.from('users').select('*');
        if (role) {
            query = query.eq('role', role);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data as User[];
    } catch (error) {
        console.error("Error fetching users from Supabase:", error);
        return [];
    }
};

export const getUserById = async (id: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
        if (error) return null;
        return data as User;
    } catch (e) {
        return null;
    }
}

export const logout = async (): Promise<void> => {
  localStorage.removeItem('pithi_mock_user');
  try {
      await supabase.auth.signOut();
  } catch (e) {
      console.warn("Supabase auth signout failed", e);
  }
  setCurrentUser(null);
  pendingRegistrationUser = null;
  return Promise.resolve();
};

export const loginUser = async (): Promise<{ status: 'SUCCESS' | 'NEEDS_ROLE', user?: User }> => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                redirectTo: window.location.origin
            },
        });

        if (error) throw error;
        return { status: 'SUCCESS' };

    } catch (error: any) {
        console.warn("Supabase Login Warning:", error);
        throw error;
    }
};

export const completeRegistration = async (role: UserRole): Promise<User> => {
    // A real Google session is required to create a profile — the users table RLS
    // demands auth.uid() === id, so there is no offline path here.
    let sessionUser: any = null;
    try {
        const { data } = await supabase.auth.getSession();
        sessionUser = data.session?.user || null;
    } catch (e) {
        console.warn("completeRegistration: failed to read session", e);
    }

    if (!sessionUser) {
        throw new Error("សម័យ​ចូល​គណនី​បាន​ផុត​កំណត់។ សូម​ចូល​គណនី​ជាមួយ Google ម្តង​ទៀត។ (Your session expired. Please sign in with Google again.)");
    }

    // Preferred path: a SECURITY DEFINER RPC that creates the profile server-side.
    // This is robust even if the granular INSERT row-level-security policy on the
    // users table is missing or misconfigured (the common cause of
    // "new row violates row-level security policy for table users").
    try {
        const { data, error } = await supabase.rpc('register_profile', { p_role: role });
        if (!error && data) {
            const profile = (Array.isArray(data) ? data[0] : data) as User;
            pendingRegistrationUser = null;
            setCurrentUser(profile);
            return profile;
        }
        if (error) {
            console.warn("register_profile RPC unavailable, trying direct insert:", error.message);
        }
    } catch (rpcErr) {
        console.warn("register_profile RPC threw, trying direct insert:", rpcErr);
    }

    // Fallback: direct insert (works when the users INSERT policy is present).
    const newUser: User = {
        id: sessionUser.id,
        name: sessionUser.user_metadata?.full_name || pendingRegistrationUser?.name || sessionUser.email?.split('@')[0] || 'User',
        email: sessionUser.email!,
        avatarUrl: sessionUser.user_metadata?.avatar_url || pendingRegistrationUser?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sessionUser.email!)}`,
        role: role
    };

    const { data: inserted, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

    if (error || !inserted) {
        console.error("completeRegistration insert failed:", error);
        throw new Error("មិន​អាច​បង្កើត​ប្រវត្តិរូប​បាន​ទេ។ សូម​ដំណើរការ​ឯកសារ migration ក្នុង Supabase។ (Could not create your profile: " + (error?.message || "Unknown error") + ")");
    }

    pendingRegistrationUser = null;
    setCurrentUser(inserted as User);
    return inserted as User;
};

export const getPendingUser = () => pendingRegistrationUser;
export const isRegistrationPending = () => !!pendingRegistrationUser && !currentUser;

// --- ADMIN MANAGEMENT ---

export const getAdmins = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*').eq('role', 'ADMIN');
    if (error) {
        console.error("Error fetching admins:", error);
        return [];
    }
    return data as User[];
};

export const addAdminByEmail = async (email: string): Promise<User> => {
    // 1. Find user by email
    const { data: users, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);

    if (findError || !users || users.length === 0) {
        throw new Error("រកមិនឃើញអ្នកប្រើប្រាស់ដែលមានអ៊ីមែលនេះទេ។ (User not found)");
    }
    const user = users[0];

    // 2. Update role to ADMIN
    const { data, error: updateError } = await supabase
        .from('users')
        .update({ role: UserRole.ADMIN })
        .eq('id', user.id)
        .select()
        .single();

    if (updateError) throw updateError;
    return data as User;
};

export const removeAdmin = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update({ role: UserRole.GENERAL_USER })
        .eq('id', userId);

    if (error) throw error;
    return;
};
