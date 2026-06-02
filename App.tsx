
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { User, UserRole } from './types';
import { getCurrentUser, logout, subscribe, isRegistrationPending } from './services/authService';
import { GlobalDialogProvider } from './contexts/GlobalDialogContext';
import { Logo } from './components/Logo';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PWAUpdateNotification } from './components/PWAUpdateNotification';

// Pages
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import Dashboard from './pages/Dashboard';
import OrganizerPortal from './pages/OrganizerPortal';
import OwnerPortal from './pages/OwnerPortal';
import VendorPortal from './pages/VendorPortal';
import Marketplace from './pages/Marketplace';
import InvitationCard from './pages/InvitationCard';
import BookingHistory from './pages/BookingHistory';
import BookingDetail from './pages/BookingDetail';
import InvitedCeremonies from './pages/InvitedCeremonies';
import AdminDashboard from './pages/AdminDashboard';
import UserGuide from './pages/UserGuide';
import CommunityLicense from './pages/CommunityLicense';
import SocialFeed from './pages/SocialFeed';

// Icons
import { LayoutDashboard, Search, Calendar, LogOut, Wallet, List, ShieldCheck, BookOpen, Loader2, Home, Briefcase, MessageSquare, Send } from 'lucide-react';

const PrivateRoute = ({ children }: { children?: React.ReactNode }) => {
  const user = getCurrentUser();
  return user ? <>{children}</> : <Navigate to="/login" />;
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
    if (['CHEF', 'HALL', 'MUSIC_BAND', 'BEAUTY_SALON'].includes(user.role)) {
        navItems.push({ to: "/vendor", icon: Briefcase, label: "សេវា" });
        navItems.push({ to: "/bookings", icon: List, label: "ការកក់" });
    }
    
    // Social Feed for everyone
    navItems.push({ to: "/community", icon: MessageSquare, label: "សហគមន៍" });

    // Marketplace unless Vendor
    if (!['CHEF', 'HALL', 'MUSIC_BAND', 'BEAUTY_SALON'].includes(user.role)) {
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

const DesktopSidebar = ({ user, activePath, onLogout }: { user: User, activePath: string, onLogout: () => void }) => {
    const NavItem = ({ to, icon: Icon, label }: any) => {
        const isActive = activePath === to;
        return (
            <Link 
                to={to} 
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all mb-1 group ${isActive ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
                <Icon size={18} className={isActive ? 'text-rose-600' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-sm tracking-wide">{label}</span>
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
                
                <NavItem to="/community" icon={MessageSquare} label="សហគមន៍" />

                {(!['CHEF', 'HALL', 'MUSIC_BAND', 'BEAUTY_SALON'].includes(user.role)) && (
                    <NavItem to="/marketplace" icon={Search} label="ទីផ្សារសេវាកម្ម" />
                )}
                {['CHEF', 'HALL', 'MUSIC_BAND', 'BEAUTY_SALON'].includes(user.role) && (
                    <>
                        <NavItem to="/vendor" icon={Briefcase} label="សេវាកម្ម" />
                        <NavItem to="/bookings" icon={List} label="ការកក់" />
                    </>
                )}
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
    
    const publicPaths = ['/login', '/guide', '/community-license'];
    const isInvitation = location.pathname.startsWith('/invitation/');
    if (!user) return (!publicPaths.includes(location.pathname) && !isInvitation) ? <Navigate to="/login" /> : <>{children}</>;
    
    if (user && (location.pathname === '/login' || location.pathname === '/select-role')) return <Navigate to="/" />;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-64 transition-all duration-300">
            <DesktopSidebar user={user} activePath={location.pathname} onLogout={handleLogout} />
            
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md z-40 border-b border-slate-200 flex items-center justify-between px-4">
                <Logo variant="full" size="sm" />
                <div className="flex items-center gap-3">
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
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/select-role" element={<Layout><RoleSelection /></Layout>} />
            <Route path="/invitation/:id" element={<Layout><InvitationCard /></Layout>} />
            <Route path="/guide" element={<Layout><UserGuide /></Layout>} />
            <Route path="/community-license" element={<Layout><CommunityLicense /></Layout>} />
            <Route path="/" element={<Layout><PrivateRoute><Dashboard /></PrivateRoute></Layout>} />
            <Route path="/community" element={<Layout><PrivateRoute><SocialFeed /></PrivateRoute></Layout>} />
            <Route path="/admin" element={<Layout><PrivateRoute><AdminDashboard /></PrivateRoute></Layout>} />
            <Route path="/organizer" element={<Layout><PrivateRoute><OrganizerPortal /></PrivateRoute></Layout>} />
            <Route path="/owner" element={<Layout><PrivateRoute><OwnerPortal /></PrivateRoute></Layout>} />
            <Route path="/invited" element={<Layout><PrivateRoute><InvitedCeremonies /></PrivateRoute></Layout>} />
            <Route path="/vendor" element={<Layout><PrivateRoute><VendorPortal /></PrivateRoute></Layout>} />
            <Route path="/marketplace" element={<Layout><PrivateRoute><Marketplace /></PrivateRoute></Layout>} />
            <Route path="/bookings" element={<Layout><PrivateRoute><BookingHistory /></PrivateRoute></Layout>} />
            <Route path="/booking/:id" element={<Layout><PrivateRoute><BookingDetail /></PrivateRoute></Layout>} />
        </Routes>
        </Router>
        <PWAInstallPrompt />
        <PWAUpdateNotification />
    </GlobalDialogProvider>
  );
};

export default App;
