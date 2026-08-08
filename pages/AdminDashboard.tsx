
import { useState, useEffect } from 'react';
import { getCurrentUser, getUsers, addAdminByEmail, removeAdmin, getAdmins, isSuperAdmin, isSuperAdminEmail, switchMyRole } from '../services/authService';
import { getSystemStats, getCleanupStats, runCleanup } from '../services/dataService';
import { User, UserRole } from '../types';
import { Card, Button, ConfirmationModal, Pagination } from '../components/UIComponents';
import { ShieldCheck, Users, Calendar, DollarSign, Trash2, Plus, Search, Shield, Briefcase, Database, ChefHat, Music, Home, Sparkles, Heart, RefreshCw } from 'lucide-react';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const currentUser = getCurrentUser();
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useGlobalDialog();
    
    // Perspective State
    const [isSwitching, setIsSwitching] = useState(false);

    // Stats
    const [stats, setStats] = useState({ totalUsers: 0, totalCeremonies: 0, totalBookings: 0, totalVolume: 0 });
    
    // Cleanup Stats
    const [cleanupStats, setCleanupStats] = useState({ receiptsCount: 0, cancelledBookingsCount: 0 });
    const [isCleaning, setIsCleaning] = useState(false);

    // Admin Management
    const [admins, setAdmins] = useState<User[]>([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [isAddingAdmin, setIsAddingAdmin] = useState(false);
    const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);
    const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);

    // User List Management
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [userPage, setUserPage] = useState(1);
    const usersPerPage = 10;

    useEffect(() => {
        if (currentUser?.role === UserRole.ADMIN) {
            loadDashboardData();
        }
    }, [currentUser]);

    const loadDashboardData = async () => {
        // Load Stats
        const systemStats = await getSystemStats();
        setStats(systemStats);

        // Load Cleanup Stats
        const cleanStats = await getCleanupStats();
        setCleanupStats(cleanStats);

        // Load Admins
        const adminList = await getAdmins();
        setAdmins(adminList);

        // Load All Users
        const users = await getUsers();
        setAllUsers(users);
    };

    const handleAddAdmin = async () => {
        if (!newAdminEmail) return;
        setIsAddingAdmin(true);
        try {
            await addAdminByEmail(newAdminEmail);
            setNewAdminEmail('');
            await loadDashboardData();
            await showAlert("ជោគជ័យ", `បានបន្ថែម ${newAdminEmail} ជា Admin ដោយជោគជ័យ।`, "success");
        } catch (error: any) {
            console.error(error);
            await showAlert("បរាជ័យ", "បរាជ័យក្នុងការបន្ថែម Admin: " + (error.message || "Unknown error"), "danger");
        } finally {
            setIsAddingAdmin(false);
        }
    };

    const handleRemoveAdmin = async () => {
        if (!deleteAdminId) return;
        setIsDeletingAdmin(true);
        try {
            await removeAdmin(deleteAdminId);
            await loadDashboardData();
            setDeleteAdminId(null);
        } catch (error: any) {
            await showAlert("បរាជ័យ", error.message || "បរាជ័យក្នុងការលុប Admin", "danger");
        } finally {
            setIsDeletingAdmin(false);
        }
    };

    const handleCleanup = async () => {
        const confirmed = await showConfirm(
            "បញ្ជាក់ការសម្អាត",
            "តើអ្នកប្រាកដជាចង់លុបឯកសារចាស់ៗមែនទេ?",
            "warning"
        );
        if(!confirmed) return;
        
        setIsCleaning(true);
        try {
            const result = await runCleanup();
            await showAlert("លទ្ធផលសម្អាត", result, "info");
            await loadDashboardData();
        } catch (error: any) {
            await showAlert("បរាជ័យ", "Cleanup failed: " + error.message, "danger");
        } finally {
            setIsCleaning(false);
        }
    };

    const handleSwitchPerspective = async (role: UserRole) => {
        setIsSwitching(true);
        try {
            await switchMyRole(role);
            navigate('/');
        } catch (error: any) {
            await showAlert("បរាជ័យ", "Switch failed: " + error.message, "danger");
        } finally {
            setIsSwitching(false);
        }
    };

    // Filter Users
    const filteredUsers = allUsers.filter(u => 
        u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.email.toLowerCase().includes(userSearch.toLowerCase())
    );

    // Paginate Users
    const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage);
    const paginatedUsers = filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

    if (!currentUser || currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center">គ្មានសិទ្ធិ។</div>;

    const perspectiveRoles = [
        { role: UserRole.GENERAL_USER, label: 'Owner', icon: Heart, color: 'bg-rose-50 text-rose-600 border-rose-100' },
        { role: UserRole.ORGANIZER, label: 'Organizer', icon: Shield, color: 'bg-blue-50 text-blue-600 border-blue-100' },
        { role: UserRole.CHEF, label: 'Chef', icon: ChefHat, color: 'bg-amber-50 text-amber-600 border-amber-100' },
        { role: UserRole.HALL, label: 'Hall', icon: Home, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        { role: UserRole.MUSIC_BAND, label: 'Band', icon: Music, color: 'bg-purple-50 text-purple-600 border-purple-100' },
        { role: UserRole.BEAUTY_SALON, label: 'Salon', icon: Sparkles, color: 'bg-pink-50 text-pink-600 border-pink-100' },
    ];

    return (
        <div className="space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 font-serif flex items-center gap-3">
                    <ShieldCheck size={32} className="text-rose-600"/>
                    ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ
                </h1>
                <p className="text-slate-500 mt-2">ត្រួតពិនិត្យប្រព័ន្ធទាំងមូល និងគ្រប់គ្រងអ្នកប្រើប្រាស់។</p>
            </div>

            {/* Super Admin Perspective Switcher */}
            {isSuperAdmin() && (
                <Card title="Super Admin: Perspective Switch" className="border-2 border-rose-200 shadow-xl shadow-rose-100">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 mb-4 flex items-center">
                            <RefreshCw size={16} className={`mr-2 text-rose-500 ${isSwitching ? 'animate-spin' : ''}`} />
                            ជ្រើសរើសតួនាទីខាងក្រោម ដើម្បីមើលកម្មវិធីក្នុងនាមជាតួនាទីនោះ (Perspective):
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {perspectiveRoles.map((p) => (
                                <button
                                    key={p.role}
                                    onClick={() => handleSwitchPerspective(p.role)}
                                    disabled={isSwitching}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 ${p.color} ${isSwitching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                                >
                                    <p.icon size={24} className="mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider">{p.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center">
                             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Testing Only • Perspective Mode</span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-bold">អ្នកប្រើប្រាស់សរុប</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.totalUsers}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="bg-white border border-slate-100">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-bold">កម្មវិធីសរុប</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.totalCeremonies}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="bg-white border border-slate-100">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-bold">ការកក់សរុប</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.totalBookings}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="bg-white border border-slate-100">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-bold">ទំហំទឹកប្រាក់</p>
                            <h3 className="text-2xl font-bold text-slate-900">${stats.totalVolume.toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Admin Management Section */}
                <div className="lg:col-span-2 space-y-8">
                    <Card title={`បញ្ជី Admin (${admins.length})`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-slate-500 border-b border-slate-100 bg-slate-50">
                                    <tr>
                                        <th className="p-3">ឈ្មោះ</th>
                                        <th className="p-3">អ៊ីមែល</th>
                                        <th className="p-3 text-right">សកម្មភាព</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map(admin => (
                                        <tr key={admin.id} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                                     <img src={admin.avatarUrl || `https://ui-avatars.com/api/?name=${admin.name}`} className="w-full h-full object-cover" />
                                                </div>
                                                {admin.name}
                                                {isSuperAdminEmail(admin.email) && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">SUPER</span>}
                                            </td>
                                            <td className="p-3 text-slate-600">{admin.email}</td>
                                            <td className="p-3 text-right">
                                                {!isSuperAdminEmail(admin.email) && admin.id !== currentUser.id && (
                                                    <button 
                                                        onClick={() => setDeleteAdminId(admin.id)}
                                                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all"
                                                        title="ដកសិទ្ធិ Admin"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Actions */}
                <div className="space-y-6">
                    <Card title="បន្ថែម Admin ថ្មី" className="bg-slate-800 text-white">
                        <div className="space-y-4">
                            <p className="text-slate-300 text-sm">បញ្ចូលអ៊ីមែល Gmail ដើម្បីផ្តល់សិទ្ធិជា Admin ដល់អ្នកប្រើប្រាស់។</p>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Gmail Address <span className="text-red-500">*</span></label>
                                <input 
                                    className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500 outline-none"
                                    placeholder="example@gmail.com"
                                    value={newAdminEmail}
                                    onChange={e => setNewAdminEmail(e.target.value)}
                                />
                            </div>
                            <Button 
                                onClick={handleAddAdmin} 
                                isLoading={isAddingAdmin} 
                                disabled={!newAdminEmail}
                                className="w-full bg-rose-600 hover:bg-rose-700 border-none shadow-lg shadow-rose-900/20"
                            >
                                <Plus size={18} className="mr-2"/> បន្ថែម Admin
                            </Button>
                        </div>
                    </Card>

                    {/* Cleanup Card */}
                    <Card title="ថែទាំប្រព័ន្ធ" className="border border-orange-200 bg-orange-50">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-orange-800">
                                <Database size={20} />
                                <span className="font-bold">ការសម្អាតទិន្នន័យ</span>
                            </div>
                            <div className="text-sm text-slate-600 space-y-2">
                                <div className="flex justify-between">
                                    <span>វិក្កយបត្រចាស់ៗ ({'>'}90 days):</span>
                                    <span className="font-bold">{cleanupStats.receiptsCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ការកក់បោះបង់ចោល ({'>'}60 days):</span>
                                    <span className="font-bold">{cleanupStats.cancelledBookingsCount}</span>
                                </div>
                            </div>
                            <Button 
                                variant="secondary" 
                                onClick={handleCleanup} 
                                isLoading={isCleaning}
                                className="w-full border-orange-200 text-orange-700 hover:bg-orange-100"
                                disabled={cleanupStats.receiptsCount === 0 && cleanupStats.cancelledBookingsCount === 0}
                            >
                                <Trash2 size={16} className="mr-2"/> លុបឯកសារចាស់ៗ
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* All Users Table */}
            <Card 
                title="អ្នកប្រើប្រាស់ទាំងអស់" 
                action={
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                        <input 
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
                            placeholder="ស្វែងរកឈ្មោះ ឬអ៊ីមែល..."
                            value={userSearch}
                            onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                        />
                    </div>
                }
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-slate-500 border-b border-slate-100 bg-slate-50">
                            <tr>
                                <th className="p-3">ឈ្មោះ</th>
                                <th className="p-3">អ៊ីមែល</th>
                                <th className="p-3">តួនាទី</th>
                                <th className="p-3 text-right">ស្ថានភាព</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map(u => (
                                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-800">{u.name}</td>
                                    <td className="p-3 text-slate-500">{u.email}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                            u.role === UserRole.ADMIN ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                                            u.role === UserRole.ORGANIZER ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="text-emerald-600 font-bold text-xs">សកម្ម</span>
                                    </td>
                                </tr>
                            ))}
                            {paginatedUsers.length === 0 && (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">រកមិនឃើញអ្នកប្រើប្រាស់។</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={userPage} totalPages={totalUserPages} onPageChange={setUserPage} />
            </Card>

            <ConfirmationModal 
                isOpen={!!deleteAdminId}
                onClose={() => setDeleteAdminId(null)}
                onConfirm={handleRemoveAdmin}
                title="បញ្ជាក់ការលុប Admin"
                message="តើអ្នកពិតជាចង់ដកសិទ្ធិ Admin ពីគណនីនេះមែនទេ? ពួកគេនឹងក្លាយជាអ្នកប្រើប្រាស់ទូទៅវិញ។"
                isLoading={isDeletingAdmin}
            />
        </div>
    );
};

export default AdminDashboard;
