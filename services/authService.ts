
import { User, UserRole } from '../types';
import { supabase } from './supabaseConfig';

let currentUser: User | null = null;
let pendingRegistrationUser: Partial<User> | null = null;
let isAuthInitialized = false;
let authListeners: ((user: User | null) => void)[] = [];

const ADMIN_EMAIL = 'pithi.deva@gmail.com';

export const TEST_ACCOUNTS = [
  { email: 'pithi.deva@gmail.com', role: UserRole.ADMIN, name: 'Pithi Deva (Admin)', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin' },
  { email: 'organizer@pithi.com', role: UserRole.ORGANIZER, name: 'Dararoth Wedding Planner', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Organizer' },
  { email: 'client@pithi.com', role: UserRole.GENERAL_USER, name: 'Sophea & Chantrea', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Client' },
  { email: 'chef@pithi.com', role: UserRole.CHEF, name: 'Meng Catering Chef', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Chef' },
  { email: 'hall@pithi.com', role: UserRole.HALL, name: 'Phnom Penh Palace Hall', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Hall' },
  { email: 'music@pithi.com', role: UserRole.MUSIC_BAND, name: 'Pleng Khmer Traditional Band', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Music' },
  { email: 'beauty@pithi.com', role: UserRole.BEAUTY_SALON, name: 'Sovannaphumi Beauty Salon', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Beauty' }
];

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
    // 1. Check for mocked fallback session first to support immediate demo flow
    const savedMockUser = localStorage.getItem('pithi_mock_user');
    if (savedMockUser) {
        try {
            const user = JSON.parse(savedMockUser);
            setCurrentUser(user);
            return;
        } catch (e) {
            localStorage.removeItem('pithi_mock_user');
        }
    }

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
        // Only react to authentication changes if we don't have a mock user active
        if (localStorage.getItem('pithi_mock_user')) {
            return;
        }
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
        console.error("Supabase Login Error", error);
        throw error;
    }
};

export const loginWithEmailAndPassword = async (email: string, password: string): Promise<any> => {
    const matchedTest = TEST_ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase());

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error("Supabase Email Login Error:", error);
        
        // AUTO-PROVISIONING / SEEDING TRIGGER ON FIRST ATTEMPT:
        // If the credentials match a known test account and we get invalid credentials or user not found, 
        // we automatically try to sign them up in their Supabase Auth instance and create the database row.
        if (matchedTest && (
            error.message?.includes("Invalid login credentials") || 
            error.status === 400 || 
            error.message?.includes("User not found")
        )) {
            console.log(`Pre-defined test account [${email}] not found on the live Supabase instance. Attempting automatic sandbox auto-provisioning...`);
            try {
                // 1. Register Auth User
                const signUpResult = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: matchedTest.name,
                            avatar_url: matchedTest.avatarUrl
                        }
                    }
                });
                
                if (signUpResult.error) throw signUpResult.error;
                
                // 2. Insert Profile directly inside public.users (bypassing the selection screen for preset roles)
                if (signUpResult.data?.user) {
                    const uId = signUpResult.data.user.id;
                    const newUserProfile = {
                        id: uId,
                        name: matchedTest.name,
                        email: matchedTest.email,
                        avatarUrl: matchedTest.avatarUrl,
                        role: matchedTest.role
                    };
                    
                    const { error: profileError } = await supabase
                        .from('users')
                        .upsert(newUserProfile);
                        
                    if (profileError) {
                        console.error("Auto-provisioning: Failed to insert public.users profile row:", profileError);
                    } else {
                        console.log(`Auto-provisioning: Successfully created profile role [${matchedTest.role}] for ${email}`);
                    }
                }
                
                // 3. Retry authenticating
                const retrySession = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (retrySession.error) throw retrySession.error;
                return retrySession.data;

            } catch (autoRegError: any) {
                console.warn("Interactive Auto-provisioning failed or was blocked by layout. Falling back to local memory simulation.", autoRegError);
                // Fail-safe fallback to mock login if they don't have database connection or it's restricted
                return handleMockLoginFallback(matchedTest);
            }
        }
        
        // If any test account still fails (e.g., Supabase credentials not configured in development environment)
        if (matchedTest) {
            console.log("Supabase API calls failed. Initiating standard client mock session as fallback...");
            return handleMockLoginFallback(matchedTest);
        }
        
        throw error;
    }
};

const handleMockLoginFallback = (matchedTest: any): any => {
    const mockUser: User = {
        id: `mock-id-${matchedTest.role.toLowerCase()}`,
        name: matchedTest.name,
        email: matchedTest.email,
        avatarUrl: matchedTest.avatarUrl,
        role: matchedTest.role
    };
    
    localStorage.setItem('pithi_mock_user', JSON.stringify(mockUser));
    setCurrentUser(mockUser);
    
    // Return a structured shape that resembles a successful session return
    return {
        user: {
            id: mockUser.id,
            email: mockUser.email,
            user_metadata: {
                full_name: mockUser.name,
                avatar_url: mockUser.avatarUrl
            }
        },
        session: {
            access_token: "mock_token",
            user: {
                id: mockUser.id,
                email: mockUser.email
            }
        }
    };
};

export const registerWithEmailAndPassword = async (email: string, password: string, name: string): Promise<any> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
                }
            }
        });
        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error("Supabase Email Register Error", error);
        throw error;
    }
};

export const completeRegistration = async (role: UserRole): Promise<User> => {
    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user;
    
    if (authUser) {
            const newUser: User = {
            id: authUser.id,
            name: authUser.user_metadata.full_name || pendingRegistrationUser?.name || 'Unknown',
            email: authUser.email!,
            avatarUrl: authUser.user_metadata.avatar_url || pendingRegistrationUser?.avatarUrl,
            role: role
        };

        const { error } = await supabase.from('users').insert(newUser);
        if (error) {
            console.error("Registration Error", error);
            throw new Error("Failed to save user profile.");
        }
        setCurrentUser(newUser);
        pendingRegistrationUser = null;
        return newUser;
    } else {
            throw new Error("No active session found.");
    }
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
