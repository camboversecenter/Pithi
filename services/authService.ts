
import { User, UserRole } from '../types';
import { supabase } from './supabaseConfig';

let currentUser: User | null = null;
let pendingRegistrationUser: Partial<User> | null = null;
let isAuthInitialized = false;
let authListeners: ((user: User | null) => void)[] = [];

const ADMIN_EMAIL = 'pithi.deva@gmail.com';

export const TEST_ACCOUNTS = [
  { id: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e501', email: 'pithi.deva@gmail.com', role: UserRole.ADMIN, name: 'Pithi Deva (Admin)', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin' },
  { id: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e502', email: 'organizer@pithi.com', role: UserRole.ORGANIZER, name: 'Dararoth Wedding Planner', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Organizer' },
  { id: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e503', email: 'client@pithi.com', role: UserRole.GENERAL_USER, name: 'Sophea & Chantrea', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Client' },
  { id: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e504', email: 'chef@pithi.com', role: UserRole.CHEF, name: 'Meng Catering Chef', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Chef' },
  { id: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e505', email: 'hall@pithi.com', role: UserRole.HALL, name: 'Phnom Penh Palace Hall', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Hall' },
  { id: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e506', email: 'music@pithi.com', role: UserRole.MUSIC_BAND, name: 'Pleng Khmer Traditional Band', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Music' },
  { id: 'a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e507', email: 'beauty@pithi.com', role: UserRole.BEAUTY_SALON, name: 'Sovannaphumi Beauty Salon', avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Beauty' }
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
            if (user && user.id && (user.id.startsWith('mock-id-') || !user.id.includes('-') || user.id.length < 32)) {
                // Migrate legacy non-UUID mock user ids
                const matchedTest = TEST_ACCOUNTS.find(a => a.email.toLowerCase() === user.email?.toLowerCase() || a.role === user.role);
                if (matchedTest) {
                    user.id = matchedTest.id;
                    localStorage.setItem('pithi_mock_user', JSON.stringify(user));
                }
            }
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
        console.warn("Supabase Login Warning:", error);
        throw error;
    }
};

export const simulateGoogleLogin = async (email: string, name: string = ''): Promise<{ status: 'SUCCESS' | 'NEEDS_ROLE', user?: any }> => {
    const cleanEmail = email.trim();
    const displayName = name || cleanEmail.split('@')[0] || 'Google User';
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`;

    const mockGoogleUser = {
        id: crypto.randomUUID ? crypto.randomUUID() : `google-id-${Date.now()}`,
        email: cleanEmail,
        name: displayName,
        avatarUrl: avatarUrl,
        provider: 'google'
    };

    // Try to get profile from Supabase first
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .single();

        if (!error && data) {
            const userWithRole: User = {
                id: data.id,
                name: data.name,
                email: data.email,
                avatarUrl: data.avatarUrl || avatarUrl,
                role: data.role as UserRole
            };
            localStorage.setItem('pithi_mock_user', JSON.stringify(userWithRole));
            setCurrentUser(userWithRole);
            return { status: 'SUCCESS', user: userWithRole };
        }
    } catch (e) {
        console.warn("Simulation Database Fetch Failed, using local matching:", e);
    }

    // Check if user exists in test accounts
    const matchedTest = TEST_ACCOUNTS.find(a => a.email.toLowerCase() === cleanEmail.toLowerCase());
    if (matchedTest) {
        const fallbackRes = handleMockLoginFallback(matchedTest);
        return { status: 'SUCCESS', user: fallbackRes.user };
    }

    // Check local registered accounts
    try {
        const savedUsersJson = localStorage.getItem('pithi_local_registered_users') || '[]';
        const savedUsers = JSON.parse(savedUsersJson);
        const localMatchedUser = savedUsers.find((u: any) => u.email === cleanEmail.toLowerCase());
        if (localMatchedUser && localMatchedUser.isRoleSelected !== false) {
            const userWithRole: User = {
                id: localMatchedUser.id,
                name: localMatchedUser.name,
                email: localMatchedUser.email,
                avatarUrl: localMatchedUser.avatarUrl || avatarUrl,
                role: localMatchedUser.role as UserRole
            };
            localStorage.setItem('pithi_mock_user', JSON.stringify(userWithRole));
            setCurrentUser(userWithRole);
            return { status: 'SUCCESS', user: userWithRole };
        }
    } catch (e) {
        console.warn("Failed to check local registered users in simulator:", e);
    }

    // Otherwise, set registration pending with role selection
    pendingRegistrationUser = {
        id: mockGoogleUser.id,
        email: mockGoogleUser.email,
        name: mockGoogleUser.name,
        avatarUrl: mockGoogleUser.avatarUrl
    };
    setCurrentUser(null);
    return { status: 'NEEDS_ROLE', user: pendingRegistrationUser };
};

export const loginWithEmailAndPassword = async (email: string, password: string): Promise<any> => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // 1. Check TEST_ACCOUNTS list - instantly authorize locally to provide reliable sandboxed experience with Cambodian demo content
    const matchedTest = TEST_ACCOUNTS.find(a => a.email.toLowerCase() === cleanEmail.toLowerCase());
    if (matchedTest) {
        console.log(`[Pithi Demo Sandbox]: Instantly authorized test account [${cleanEmail}] locally for high-performance wedding planning simulation.`);
        return handleMockLoginFallback(matchedTest);
    }

    // 2. Check local registered mock users registry
    let localMatchedUser: any = null;
    try {
        const savedUsersJson = localStorage.getItem('pithi_local_registered_users') || '[]';
        const savedUsers = JSON.parse(savedUsersJson);
        localMatchedUser = savedUsers.find((u: any) => u.email === cleanEmail.toLowerCase());
    } catch (e) {
        console.warn("Failed to check local registered users registry:", e);
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword
        });
        if (error) throw error;
        return data;
    } catch (error: any) {
        console.warn("Supabase Email Login Warning:", error);
        
        // If it's a locally registered mock user
        if (localMatchedUser && localMatchedUser.password === cleanPassword) {
            console.log("Supabase API calls failed for locally registered user. Initializing local session...");
            if (localMatchedUser.isRoleSelected === false) {
                pendingRegistrationUser = {
                    id: localMatchedUser.id,
                    email: localMatchedUser.email,
                    name: localMatchedUser.name,
                    avatarUrl: localMatchedUser.avatarUrl,
                };
                setCurrentUser(null);
                
                return {
                    user: {
                        id: localMatchedUser.id,
                        email: localMatchedUser.email,
                        user_metadata: {
                            full_name: localMatchedUser.name,
                            avatar_url: localMatchedUser.avatarUrl
                        }
                    },
                    session: {
                        access_token: "mock_token",
                        user: {
                            id: localMatchedUser.id,
                            email: localMatchedUser.email
                        }
                    }
                };
            } else {
                const mockUser: User = {
                    id: localMatchedUser.id,
                    name: localMatchedUser.name,
                    email: localMatchedUser.email,
                    avatarUrl: localMatchedUser.avatarUrl,
                    role: localMatchedUser.role
                };
                
                localStorage.setItem('pithi_mock_user', JSON.stringify(mockUser));
                setCurrentUser(mockUser);
                
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
            }
        }
        
        throw error;
    }
};

const handleMockLoginFallback = (matchedTest: any): any => {
    const mockUser: User = {
        id: matchedTest.id,
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
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    // Generate a new clean UUID for the newly registered user
    const uId = crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`;
    const testRegisteredUser = {
        id: uId,
        email: cleanEmail,
        password: cleanPassword,
        name: name,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        role: UserRole.GENERAL_USER,
        isRoleSelected: false // role not yet chosen via RoleSelection
    };

    // Save to local registry so they can log in even if Supabase email confirmation blocks them
    try {
        const savedUsersJson = localStorage.getItem('pithi_local_registered_users') || '[]';
        const savedUsers = JSON.parse(savedUsersJson);
        const filtered = savedUsers.filter((u: any) => u.email !== testRegisteredUser.email);
        filtered.push(testRegisteredUser);
        localStorage.setItem('pithi_local_registered_users', JSON.stringify(filtered));
    } catch (err) {
        console.warn("Failed to update local registered users registry:", err);
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPassword,
            options: {
                data: {
                    full_name: name,
                    avatar_url: testRegisteredUser.avatarUrl
                }
            }
        });
        if (error) {
            console.warn("Supabase signUp failed, proceeding with local fallback", error);
        }
        return data || { user: { id: uId, email: cleanEmail } };
    } catch (error: any) {
        console.warn("Supabase Email Register Exception, proceeding with local registration fallback", error);
        return { user: { id: uId, email: cleanEmail } };
    }
};

export const completeRegistration = async (role: UserRole): Promise<User> => {
    // Check if there is an active mock session
    const savedMockUser = localStorage.getItem('pithi_mock_user');
    let mockUserObj: any = null;
    if (savedMockUser) {
        try {
            mockUserObj = JSON.parse(savedMockUser);
        } catch (e) {}
    }

    let sessionObj: any = null;
    try {
        const { data } = await supabase.auth.getSession();
        sessionObj = data.session;
    } catch (e) {}

    const authUser = sessionObj?.user;
    
    if (authUser) {
        const newUser: User = {
            id: authUser.id,
            name: authUser.user_metadata?.full_name || pendingRegistrationUser?.name || 'Unknown',
            email: authUser.email!,
            avatarUrl: authUser.user_metadata?.avatar_url || pendingRegistrationUser?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(authUser.email!)}`,
            role: role
        };

        try {
            const { error } = await supabase.from('users').insert(newUser);
            if (error) {
                console.warn("Registration Error on Supabase insert, but proceeding with client state:", error);
            }
        } catch (dbErr) {
            console.warn("Complete registration DB exception, proceeding with client state:", dbErr);
        }

        localStorage.setItem('pithi_mock_user', JSON.stringify(newUser));
        setCurrentUser(newUser);
        pendingRegistrationUser = null;
        return newUser;
    } else if (pendingRegistrationUser) {
        const newUser: User = {
            id: pendingRegistrationUser.id || `mock-user-${Date.now()}`,
            name: pendingRegistrationUser.name || 'Unknown',
            email: pendingRegistrationUser.email || 'unknown@example.com',
            avatarUrl: pendingRegistrationUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(pendingRegistrationUser.email || 'unknown')}`,
            role: role
        };

        // Save users profile in local mock registry so we can retrieve correct role on subsequent loads
        try {
            const savedUsersJson = localStorage.getItem('pithi_local_registered_users') || '[]';
            const savedUsers = JSON.parse(savedUsersJson);
            const foundUser = savedUsers.find((u: any) => u.email === newUser.email.toLowerCase());
            if (foundUser) {
                foundUser.role = role;
                foundUser.isRoleSelected = true;
                localStorage.setItem('pithi_local_registered_users', JSON.stringify(savedUsers));
            }
        } catch (e) {
            console.warn("Failed to update user role in local registered users:", e);
        }

        localStorage.setItem('pithi_mock_user', JSON.stringify(newUser));
        setCurrentUser(newUser);
        pendingRegistrationUser = null;
        return newUser;
    } else if (mockUserObj) {
        mockUserObj.role = role;
        localStorage.setItem('pithi_mock_user', JSON.stringify(mockUserObj));
        setCurrentUser(mockUserObj);
        pendingRegistrationUser = null;
        return mockUserObj;
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
