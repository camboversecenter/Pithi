
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeRegistration, getPendingUser, logout } from '../services/authService';
import { UserRole } from '../types';
import { ShieldCheck, Heart, ChefHat, Music, Home, Sparkles, AlertTriangle, Check, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';

const RoleSelection = () => {
    const navigate = useNavigate();
    const pendingUser = getPendingUser();
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        // Security: If no pending user (e.g. page refresh or direct access), kick back to login
        if (!pendingUser) {
            navigate('/login');
        }
    }, [pendingUser, navigate]);

    if (!pendingUser) return null;

    const roles = [
        { role: UserRole.GENERAL_USER, label: 'អ្នកប្រើប្រាស់ទូទៅ', sub: '(ម្ចាស់កម្មវិធី)', icon: Heart, desc: 'សម្រាប់អ្នកដែលចង់បង្កើតកម្មវិធី និងកក់សេវាកម្ម។', color: 'bg-rose-100 text-rose-600' },
        { role: UserRole.ORGANIZER, label: 'អ្នករៀបចំកម្មវិធី', sub: '', icon: ShieldCheck, desc: 'សម្រាប់អ្នកជំនាញរៀបចំ និងចាត់ចែងកម្មវិធី។', color: 'bg-blue-100 text-blue-600' },
        { role: UserRole.CHEF, label: 'ចុងភៅ / ម្ហូបអាហារ', sub: '', icon: ChefHat, desc: 'សម្រាប់អ្នកផ្តល់សេវាកម្មម្ហូបអាហារ។', color: 'bg-amber-100 text-amber-600' },
        { role: UserRole.HALL, label: 'ទីតាំង / សាល', sub: '', icon: Home, desc: 'សម្រាប់ម្ចាស់ទីតាំង ឬសាលប្រជុំ។', color: 'bg-emerald-100 text-emerald-600' },
        { role: UserRole.MUSIC_BAND, label: 'ក្រុមតន្ត្រី', sub: '', icon: Music, desc: 'សម្រាប់ក្រុមតន្ត្រី ឬអ្នកសិល្បៈ។', color: 'bg-purple-100 text-purple-600' },
        { role: UserRole.BEAUTY_SALON, label: 'សម្អាងការ', sub: '', icon: Sparkles, desc: 'សម្រាប់សេវាកម្មតុបតែង និងសម្លៀកបំពាក់។', color: 'bg-pink-100 text-pink-600' },
    ];

    const handleConfirm = async () => {
        if (!selectedRole) return;
        setIsSubmitting(true);
        setErrorMsg(null);
        try {
            await completeRegistration(selectedRole);
            navigate('/');
        } catch (error: any) {
            console.error("Registration failed", error);
            setErrorMsg(error?.message || "ការចុះឈ្មោះបរាជ័យ។ សូមព្យាយាមម្តងទៀត។ (Registration failed. Please try again.)");
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:items-center md:justify-center md:p-4">
            <div className="relative w-full min-h-[100dvh] md:min-h-0 md:h-auto md:max-w-4xl bg-white md:overflow-hidden flex flex-col md:flex-row md:rounded-3xl md:shadow-xl md:border md:border-slate-100">

                {/* Sidebar Info */}
                <div className="md:w-1/3 bg-slate-900 p-8 text-white flex flex-col justify-between shrink-0">
                    <div>
                        <Logo variant="icon" size="md" className="mb-6 justify-start" />
                        <h2 className="text-2xl font-bold font-serif mb-4">ការជ្រើសរើសតួនាទី</h2>
                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                            សួស្តី <strong>{pendingUser.name}</strong>,<br/><br/>
                            សូមស្វាគមន៍មកកាន់ PITHI។ ដោយសារអ្នកជាសមាជិកថ្មី សូមជ្រើសរើសតួនាទីដែលសាកសមនឹងអ្នក។
                        </p>
                        
                        <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-xl text-yellow-200 text-xs flex items-start">
                            <AlertTriangle size={16} className="mr-2 flex-shrink-0 mt-0.5"/>
                            <span>ចំណាំ: តួនាទីមិនអាចផ្លាស់ប្តូរបានទេបន្ទាប់ពីបានបង្កើតគណនីរួច។</span>
                        </div>
                    </div>
                    <button onClick={handleCancel} className="text-slate-400 hover:text-white text-sm mt-8 md:mt-0 underline text-left">
                        បោះបង់ & ត្រឡប់ទៅវិញ
                    </button>
                </div>

                {/* Selection Area */}
                <div className="relative md:w-2/3 p-8 md:flex-1 md:min-h-0 md:flex md:flex-col">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-36 scroll-smooth md:flex-none md:max-h-[60vh] md:overflow-y-auto md:pr-2 md:pb-20">
                        {roles.map((item) => (
                            <button
                                key={item.role}
                                onClick={() => setSelectedRole(item.role)}
                                className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${selectedRole === item.role ? 'border-rose-500 bg-rose-50 shadow-md transform scale-[1.02]' : 'border-slate-100 hover:border-rose-200 hover:shadow-sm'}`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className={`p-2.5 rounded-xl ${item.color}`}>
                                        <item.icon size={20} />
                                    </div>
                                    {selectedRole === item.role && <div className="bg-rose-500 text-white p-1 rounded-full"><Check size={12}/></div>}
                                </div>
                                <h3 className={`font-bold ${selectedRole === item.role ? 'text-rose-700' : 'text-slate-800'}`}>
                                    {item.label}
                                </h3>
                                {item.sub && <span className="text-xs font-semibold text-slate-400 block mb-2">{item.sub}</span>}
                                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                            </button>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="fixed inset-x-0 bottom-0 z-20 bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-slate-100 flex flex-col gap-3 md:absolute md:z-auto md:inset-x-0 md:bottom-0 md:pb-6">
                       {errorMsg && (
                           <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start">
                               <AlertCircle size={15} className="mr-2 flex-shrink-0 mt-0.5"/>
                               <span className="font-semibold leading-relaxed">{errorMsg}</span>
                           </div>
                       )}
                       <div className="flex justify-end items-center gap-4">
                         <span className="text-xs text-slate-400 hidden sm:block">
                            {selectedRole ? "ចុច 'បញ្ចប់ការចុះឈ្មោះ' ដើម្បីបន្ត" : "សូមជ្រើសរើសមួយ"}
                         </span>
                         <button 
                            onClick={handleConfirm} 
                            disabled={!selectedRole || isSubmitting}
                            className="px-8 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-200"
                         >
                             {isSubmitting ? 'កំពុងដំណើរការ...' : 'បញ្ចប់ការចុះឈ្មោះ'}
                         </button>
                       </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
