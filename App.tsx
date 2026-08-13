
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { User, UserRole } from './types';
import { getCurrentUser, logout, subscribe, isRegistrationPending, isSuperAdmin } from './services/authService';
import { GlobalDialogProvider } from './contexts/GlobalDialogContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { Logo } from './components/Logo';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PWAUpdateNotification } from './components/PWAUpdateNotification';

// Pages — lazy-loaded so each route ships as its own chunk instead of one bundle
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const RoleSelection = lazy(() => import('./pages/RoleSelection'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OrganizerPortal = lazy(() => import('./pages/OrganizerPortal'));
const OwnerPortal = lazy(() => import('./pages/OwnerPortal'));
const VendorPortal = lazy(() => import('./pages/VendorPortal'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const InvitationCard = lazy(() => import('./pages/InvitationCard'));
const BookingHistory = lazy(() => import('./pages/BookingHistory'));
const BookingDetail = lazy(() => import('./pages/BookingDetail'));
const InvitedCeremonies = lazy(() => import('./pages/InvitedCeremonies'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UserGuide = lazy(() => import('./pages/UserGuide'));
const SocialFeed = lazy(() => import('./pages/SocialFeed'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Messages = lazy(() => import('./pages/Messages'));
const AboutUs = lazy(() => import('./pages/AboutUs'));

// Icons
import { LayoutDashboard, Search, Calendar, LogOut, Wallet, List, ShieldCheck, BookOpen, Loader2, Home, Briefcase, MessageSquare, Send, Bell, MessagesSquare } from 'lucide-react';
import { getUnreadMessageCount, subscribeToMessages } from './services/chatService';

const PrivateRoute = ({ children }: { children?: React.ReactNode }) => {
  const user = getCurrentUser();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

// Restricts a route to specific roles. The super admin can reach any page
// (needed for the admin "perspective switch" feature); everyone else is sent
// back to the dashboard if their role isn't allowed.
const RoleRoute = ({ roles, children }: { roles: UserRole[], children?: React.ReactNode }) => {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" />;
  if (isSuperAdmin() || roles.includes(user.role)) return <>{children}</>;
  return <Navigate to="/" />;
};

const VENDOR_ROLES = [UserRole.CHEF, UserRole.HALL, UserRole.MUSIC_BAND, UserRole.BEAUTY_SALON];
// Organizers sell their coordination service in the same marketplace as the
// vendors, so they get the same service-management portal.
const SERVICE_PROVIDER_ROLES = [...VENDOR_ROLES, UserRole.ORGANIZER];

const isVendorRole = (role: UserRole | string) =>
    ['CHEF', 'HALL', 'MUSIC_BAND', 'BEAUTY_SALON'].includes(role as string);

// Unread direct messages, kept live for the nav badge.
const useUnreadMessages = (userId?: string) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!userId) {
            setCount(0);
            return;
        }
        let cancelled = false;
        const refresh = async () => {
            const value = await getUnreadMessageCount(userId);
            if (!cancelled) setCount(value);
        };
        refresh();
        const interval = setInterval(refresh, 60_000);
        const unsubscribe = subscribeToMessages(userId, () => setCount(c => c + 1));
        return () => {
            cancelled = true;
            clearInterval(interval);
            unsubscribe();
        };
    }, [userId]);

    return count;
};

// --- NAVIGATION COMPONENTS ---

const MobileBottomNav = ({ user, activePath }: { user: User, activePath: string }) => {
    const navItems = [
        { to: "/", icon: Home, label: "ដើម" },
    ];

    if (user.role === UserRole.ORGANIZER) {
        navItems.push({ to: "/organizer", icon: Calendar, label: "កម្មវិធី" });
    }
    if (user.role === UserRole.GENERAL_USER) {
        navItems.push({ to: "/owner", icon: Wallet, label: "របស់ខ្ញុំ" });
    }
    if (isVendorRole(user.role)) {
        navItems.push({ to: "/vendor", icon: Briefcase, label: "សេវា" });
    }

    // Everyone who can hold a booking needs to reach it — the client side of a
    // booking was previously only reachable from the dashboard feed.
    navItems.push({ to: "/bookings", icon: List, label: "ការកក់" });
    navItems.push({ to: "/messages", icon: MessagesSquare, label: "សារ" });

    // Marketplace unless Vendor
    if (!isVendorRole(user.role)) {
         navItems.push({ to: "/marketplace", icon: Search, label: "ទីផ្សារ" });
    }

    const displayItems = navItems.slice(0, 5);

    return (
        <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe z-50 flex justify-around items-center h-16 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            {displayItems.map((item) => {
                const isActive = activePath === item.to;
                return (
                    <Link 
                        key={item.to} 
                        to={item.to}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
                    </Link>
                )
            })}
        </nav>
    );
};

const UnreadCountBadge = ({ count, className = '' }: { count: number, className?: string }) => {
    if (count <= 0) return null;
    return (
        <span className={`bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ${className}`}>
            {count > 99 ? '99+' : count}
        </span>
    );
};

const DesktopSidebar = ({ user, activePath, onLogout }: { user: User, activePath: string, onLogout: () => void }) => {
    const { unreadCount } = useNotifications();
    const unreadMessages = useUnreadMessages(user.id);
    const NavItem = ({ to, icon: Icon, label, badge = 0 }: any) => {
        const isActive = activePath === to;
        return (
            <Link
                to={to}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all mb-1 group ${isActive ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
                <Icon size={18} className={isActive ? 'text-rose-600' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm tracking-wide flex-1">{label}</span>
                <UnreadCountBadge count={badge} />
            </Link>
        );
    };

    return (
        <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-30">
            {/* Header */}
            <div className="flex items-center p-6 h-20 border-b border-slate-100">
                <Logo variant="full" size="sm" />
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-4">ម៉ឺនុយ</p>
                <NavItem to="/" icon={LayoutDashboard} label="ផ្ទាំងព័ត៌មាន" />
                {user.role === UserRole.ORGANIZER && <NavItem to="/organizer" icon={Calendar} label="គ្រប់គ្រងកម្មវិធី" />}
                {user.role === UserRole.GENERAL_USER && <NavItem to="/owner" icon={Wallet} label="កម្មវិធីរបស់ខ្ញុំ" />}
                
                <NavItem to="/messages" icon={MessagesSquare} label="សារឆ្លើយឆ្លង" badge={unreadMessages} />
                <NavItem to="/community" icon={MessageSquare} label="សហគមន៍" />
                <NavItem to="/notifications" icon={Bell} label="ការជូនដំណឹង" badge={unreadCount} />

                {!isVendorRole(user.role) && (
                    <NavItem to="/marketplace" icon={Search} label="ទីផ្សារសេវាកម្ម" />
                )}
                {SERVICE_PROVIDER_ROLES.includes(user.role) && (
                    <NavItem to="/vendor" icon={Briefcase} label="សេវាកម្ម" />
                )}
                <NavItem to="/bookings" icon={List} label="ការកក់" />
                {user.role === UserRole.ADMIN && (
                    <NavItem to="/admin" icon={ShieldCheck} label="គ្រប់គ្រងប្រព័ន្ធ" />
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100">
                <Link to="/guide" className="flex items-center px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-1">
                    <BookOpen size={16} className="mr-3" /> សៀវភៅណែនាំ
                </Link>
                <a 
                    href="https://t.me/+DBOU-zZhP_lkNTg9" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors mb-2"
                >
                    <Send size={16} className="mr-3 -rotate-12" /> Telegram Support
                </a>
                <button 
                    onClick={onLogout} 
                    className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut size={16} className="mr-3" /> ចាកចេញ
                </button>
                <div className="flex items-center gap-3 mt-4 px-4 bg-slate-50 p-2 rounded-xl">
                    <img 
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                        className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" 
                        alt="Profile"
                    />
                    <div className="overflow-hidden">
                        <p className="font-bold text-slate-800 text-xs truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{user.role.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const Layout = ({ children }: { children?: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(getCurrentUser());
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const { unreadCount } = useNotifications();

    useEffect(() => {
        const unsubscribe = subscribe((updatedUser) => {
            setUser(updatedUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await logout();
        setUser(null);
        window.location.hash = '#/login';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-rose-300" />
            </div>
        );
    }

    if (!user && isRegistrationPending()) return location.pathname !== '/select-role' ? <Navigate to="/select-role" /> : <>{children}</>;
    
    const publicPaths = ['/welcome', '/login', '/guide', '/about'];
    const isInvitation = location.pathname.startsWith('/invitation/');
    if (!user) return (!publicPaths.includes(location.pathname) && !isInvitation) ? <Navigate to="/welcome" /> : <>{children}</>;

    if (user && (location.pathname === '/login' || location.pathname === '/select-role' || location.pathname === '/welcome')) return <Navigate to="/" />;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-64 transition-all duration-300">
            <DesktopSidebar user={user} activePath={location.pathname} onLogout={handleLogout} />
            
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md z-40 border-b border-slate-200 flex items-center justify-between px-4">
                <Logo variant="full" size="sm" />
                <div className="flex items-center gap-3">
                    <Link to="/notifications" className="relative">
                        <Bell size={20} className="text-slate-400" />
                        <UnreadCountBadge count={unreadCount} className="absolute -top-2 -right-2 border-2 border-white h-auto min-w-[16px] text-[9px]" />
                    </Link>
                    <Link to="/guide">
                        <BookOpen size={20} className="text-slate-400" />
                    </Link>
                    <button onClick={handleLogout} className="text-slate-400">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            <main className="pt-16 md:pt-8 px-4 md:px-10 max-w-7xl mx-auto animate-fade-in min-h-screen">
                {children}
            </main>

            <MobileBottomNav user={user} activePath={location.pathname} />
        </div>
    );
};

const App = () => {
  return (
    <GlobalDialogProvider>
        <NotificationProvider>
        {/* startTransition and relativeSplatPath are the default behaviour in
            React Router v7, so the opt-in future flags are no longer needed. */}
        <Router>
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-rose-300" />
            </div>
        }>
        <Routes>
            <Route path="/welcome" element={<Layout><Landing /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/select-role" element={<Layout><RoleSelection /></Layout>} />
            <Route path="/invitation/:id" element={<Layout><InvitationCard /></Layout>} />
            <Route path="/guide" element={<Layout><UserGuide /></Layout>} />
            <Route path="/about" element={<Layout><AboutUs /></Layout>} />
            <Route path="/" element={<Layout><PrivateRoute><Dashboard /></PrivateRoute></Layout>} />
            <Route path="/community" element={<Layout><PrivateRoute><SocialFeed /></PrivateRoute></Layout>} />
            <Route path="/notifications" element={<Layout><PrivateRoute><Notifications /></PrivateRoute></Layout>} />
            <Route path="/messages" element={<Layout><PrivateRoute><Messages /></PrivateRoute></Layout>} />
            <Route path="/admin" element={<Layout><RoleRoute roles={[UserRole.ADMIN]}><AdminDashboard /></RoleRoute></Layout>} />
            <Route path="/organizer" element={<Layout><RoleRoute roles={[UserRole.ORGANIZER]}><OrganizerPortal /></RoleRoute></Layout>} />
            <Route path="/owner" element={<Layout><RoleRoute roles={[UserRole.GENERAL_USER]}><OwnerPortal /></RoleRoute></Layout>} />
            <Route path="/invited" element={<Layout><PrivateRoute><InvitedCeremonies /></PrivateRoute></Layout>} />
            <Route path="/vendor" element={<Layout><RoleRoute roles={SERVICE_PROVIDER_ROLES}><VendorPortal /></RoleRoute></Layout>} />
            <Route path="/marketplace" element={<Layout><PrivateRoute><Marketplace /></PrivateRoute></Layout>} />
            <Route path="/bookings" element={<Layout><PrivateRoute><BookingHistory /></PrivateRoute></Layout>} />
            <Route path="/booking/:id" element={<Layout><PrivateRoute><BookingDetail /></PrivateRoute></Layout>} />
        </Routes>
        </Suspense>
        </Router>
        <PWAInstallPrompt />
        <PWAUpdateNotification />
        </NotificationProvider>
    </GlobalDialogProvider>
  );
};

export default App;
