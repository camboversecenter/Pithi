
import { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/authService';
import { 
    getCeremonies, createCeremony, updateCeremony, deleteCeremony, 
    getGuests, getTransactions, getInvitationTemplates, getPendingReportedTransactions, getCeremonyById
} from '../services/dataService';
import { uploadImage, deleteImage } from '../services/storageService';
import { Ceremony, UserRole, Guest, Transaction, InvitationTemplate, ReportedTransaction } from '../types';
import { Button, Pagination } from '../components/UIComponents';
import { Plus, Calendar, MapPin, Edit2, Trash2, Image as ImageIcon, ArrowLeft, Wallet, Eye, Loader2 } from 'lucide-react';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';
import { useSearchParams } from 'react-router-dom';

// Components
import OwnerOverview from '../components/Owner/OwnerOverview';
import OwnerGuests from '../components/Owner/OwnerGuests';
import OwnerBudget from '../components/Owner/OwnerBudget';
import OwnerInvitations from '../components/Owner/OwnerInvitations';
import OwnerPlan from '../components/Owner/OwnerPlan';
import OwnerCeremonyForm from '../components/Owner/OwnerCeremonyForm';

const OwnerPortal = () => {
    const user = getCurrentUser();
    const [searchParams, setSearchParams] = useSearchParams();
    const ceremonyIdParam = searchParams.get('ceremonyId');
    const { showAlert, showConfirm } = useGlobalDialog();

    const [ceremonies, setCeremonies] = useState<Ceremony[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentCeremony, setCurrentCeremony] = useState<Partial<Ceremony>>({});
    const [isSavingCeremony, setIsSavingCeremony] = useState(false);
    
    // Detail State
    const [selectedCeremony, setSelectedCeremony] = useState<Ceremony | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'OVERVIEW' | 'GUESTS' | 'BUDGET' | 'INVITATIONS' | 'PLAN'>('OVERVIEW');
    
    // Sub-data states
    const [detailGuests, setDetailGuests] = useState<Guest[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
    const [pendingReports, setPendingReports] = useState<ReportedTransaction[]>([]);

    useEffect(() => {
        if (user) {
            if (ceremonyIdParam) {
                loadCeremonyDetail(ceremonyIdParam);
            } else if (!isFormOpen) {
                loadCeremonies();
                setSelectedCeremony(null);
            }
        }
    }, [user, page, ceremonyIdParam, isFormOpen]);

    const loadCeremonies = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const res = await getCeremonies(user.id, UserRole.GENERAL_USER, page, 9, 'ALL');
            setCeremonies(res.data);
            setTotalPages(res.totalPages);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCeremonyDetail = async (id: string) => {
        if (!user) return;
        setIsLoading(true);
        
        try {
            let c = ceremonies.find(item => item.id === id);
            if (!c) {
                // Fetch directly if not in current loaded page
                c = await getCeremonyById(id) || undefined;
            }
            
            if (!c) {
                setSearchParams({});
                return;
            }
            
            setSelectedCeremony(c);
            
            const [g, t, tmpl, reps] = await Promise.all([
                getGuests(id, 1, 1000), 
                getTransactions(id, 1, 1000),
                getInvitationTemplates(id),
                getPendingReportedTransactions(id)
            ]);
            
            setDetailGuests(g.data);
            setTransactions(t.data);
            setTemplates(tmpl);
            setPendingReports(reps);
        } catch (e) {
            console.error("Error loading ceremony detail:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshDetailData = async () => {
        if (selectedCeremony) {
            loadCeremonyDetail(selectedCeremony.id);
        }
    };

    const handleCreate = () => {
        setCurrentCeremony({ type: 'អាពាហ៍ពិពាហ៍', invitationMessage: '' });
        setIsFormOpen(true);
    };

    const handleEdit = (c: Ceremony) => {
        setCurrentCeremony(JSON.parse(JSON.stringify(c)));
        setIsFormOpen(true);
    };

    const handleSaveCeremony = async (data: Partial<Ceremony>, bannerFile: File | null, khqrFile: File | null) => {
        if (!user || !data.title || !data.date) {
            await showAlert("ទិន្នន័យមិនគ្រប់គ្រាន់", "សូមបញ្ចូលឈ្មោះ និងកាលបរិច្ឆេទ។", "warning");
            return;
        }
        setIsSavingCeremony(true);
        try {
            let bannerUrl = data.bannerUrl;
            if (bannerFile) {
                if (data.id && data.bannerUrl) {
                    await deleteImage(data.bannerUrl);
                }
                bannerUrl = await uploadImage(bannerFile, 'ceremonies');
            }

            let khqrUrl = data.khqrUrl;
            if (khqrFile) {
                if (data.id && data.khqrUrl) {
                    await deleteImage(data.khqrUrl);
                }
                khqrUrl = await uploadImage(khqrFile, 'ceremonies');
            }

            const payload = {
                organizerId: user.id,
                ownerId: user.id,
                ...data,
                type: data.type || 'អាពាហ៍ពិពាហ៍',
                bannerUrl,
                khqrUrl
            };
            if (!data.id) delete payload.id;

            if (data.id) {
                const updated = await updateCeremony(data.id, payload);
                if (selectedCeremony && selectedCeremony.id === data.id && updated) {
                    setSelectedCeremony(updated);
                }
            } else {
                await createCeremony(payload);
            }

            setIsFormOpen(false);
            setCurrentCeremony({});
            loadCeremonies();
            await showAlert("ជោគជ័យ", "រក្សាទុកដោយជោគជ័យ!", "success");
        } catch (error: any) {
            await showAlert("បរាជ័យ", error.message, "danger");
        } finally {
            setIsSavingCeremony(false);
        }
    };

    const handleDeleteCeremony = async (id: string) => {
        const confirmed = await showConfirm("លុបកម្មវិធី?", "តើអ្នកប្រាកដជាចង់លុបមែនទេ? ទិន្នន័យទាំងអស់នឹងបាត់បង់។", "danger");
        if(confirmed) {
            await deleteCeremony(id);
            if (selectedCeremony?.id === id) {
                setSearchParams({});
                setSelectedCeremony(null);
            }
            loadCeremonies();
        }
    };

    const handleViewDetail = (c: Ceremony) => {
        setSearchParams({ ceremonyId: c.id });
    };

    if (!user) return null;

    // --- VIEW 1: FULL PAGE FORM (Create/Edit) ---
    if (isFormOpen) {
        return (
            <OwnerCeremonyForm 
                initialData={currentCeremony}
                onSave={handleSaveCeremony}
                onCancel={() => setIsFormOpen(false)}
                isSaving={isSavingCeremony}
                currentUser={user}
            />
        );
    }

    // --- VIEW 2: DETAIL VIEW ---
    if (selectedCeremony && !isLoading) {
        return (
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
                <div className="flex justify-between items-center">
                    <Button variant="ghost" onClick={() => { setSearchParams({}); setSelectedCeremony(null); }} className="pl-0 text-slate-500 hover:bg-transparent hover:text-rose-600">
                        <ArrowLeft size={20} className="mr-2"/> ត្រឡប់ទៅបញ្ជី
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleEdit(selectedCeremony)}>កែប្រែ</Button>
                        <Button variant="danger" className="text-red-500 border-red-100 hover:bg-red-50 shadow-none" onClick={() => handleDeleteCeremony(selectedCeremony.id)}>
                            <Trash2 size={18}/>
                        </Button>
                    </div>
                </div>

                {/* Hero Section */}
                <div className="relative h-64 md:h-80 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200">
                    {selectedCeremony.bannerUrl ? (
                        <img src={selectedCeremony.bannerUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                            <ImageIcon size={48} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                        <h1 className="text-4xl font-bold font-serif mb-2">{selectedCeremony.title}</h1>
                        <div className="flex items-center gap-4 text-white/90 text-sm font-medium">
                            <span className="flex items-center bg-white/20 backdrop-blur-md px-3 py-1 rounded-full"><Calendar size={14} className="mr-2"/> {selectedCeremony.date}</span>
                            <span className="flex items-center bg-white/20 backdrop-blur-md px-3 py-1 rounded-full"><MapPin size={14} className="mr-2"/> {selectedCeremony.location || 'មិនទាន់កំណត់ទីតាំង'}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto pb-2 space-x-2 no-scrollbar">
                    {['OVERVIEW', 'GUESTS', 'BUDGET', 'INVITATIONS', 'PLAN'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveDetailTab(tab as any)}
                            className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeDetailTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                        >
                            {tab === 'OVERVIEW' && 'ទូទៅ'}
                            {tab === 'GUESTS' && `ភ្ញៀវ (${detailGuests.length})`}
                            {tab === 'BUDGET' && 'ថវិកា'}
                            {tab === 'INVITATIONS' && 'លិខិតអញ្ជើញ'}
                            {tab === 'PLAN' && 'ផែនការ'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="min-h-[400px]">
                     {activeDetailTab === 'OVERVIEW' && (
                        <OwnerOverview 
                            ceremony={selectedCeremony} 
                            guestCount={detailGuests.length} 
                            budget={selectedCeremony.budget || 0} 
                        />
                    )}

                    {activeDetailTab === 'GUESTS' && (
                        <OwnerGuests 
                            ceremony={selectedCeremony} 
                            guests={detailGuests} 
                            onRefresh={refreshDetailData}
                            currentUser={user}
                        />
                    )}

                    {activeDetailTab === 'BUDGET' && (
                        <OwnerBudget 
                            ceremony={selectedCeremony} 
                            transactions={transactions} 
                            pendingReports={pendingReports}
                            onRefresh={refreshDetailData}
                        />
                    )}

                    {activeDetailTab === 'INVITATIONS' && (
                        <OwnerInvitations 
                            ceremony={selectedCeremony} 
                            templates={templates} 
                            onRefresh={refreshDetailData}
                            currentUser={user}
                        />
                    )}

                    {activeDetailTab === 'PLAN' && (
                        <OwnerPlan ceremony={selectedCeremony} />
                    )}
                </div>
            </div>
        );
    }

    // --- VIEW 3: LIST (Dashboard) ---
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <div className="flex flex-wrap items-center gap-4 mb-2">
                    <h1 className="text-4xl font-bold font-serif text-slate-900 flex items-center gap-3 tracking-tight">
                        <Wallet className="text-rose-600 w-8 h-8"/> កម្មវិធីរបស់ខ្ញុំ
                    </h1>
                    <Button onClick={handleCreate} className="shadow-lg shadow-rose-200 hover:shadow-rose-300 transform hover:-translate-y-0.5 transition-all rounded-full px-6">
                        <Plus size={20} className="mr-2"/> បង្កើតកម្មវិធីថ្មី
                    </Button>
                </div>
                <p className="text-slate-500 text-lg">បង្កើត និងគ្រប់គ្រងកម្មវិធីរបស់អ្នកនៅទីនេះ។</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-rose-300"/></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ceremonies.length > 0 ? ceremonies.map(c => (
                        <div 
                            key={c.id} 
                            className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative"
                        >
                            <div className="h-48 bg-slate-200 relative overflow-hidden">
                                {c.bannerUrl ? (
                                    <img src={c.bannerUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={32}/></div>
                                )}
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wider">
                                    {c.type}
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-slate-900 font-serif mb-2 line-clamp-1 group-hover:text-rose-600 transition-colors">{c.title}</h3>
                                <div className="space-y-2 text-sm text-slate-500 mb-6 flex-1">
                                    <div className="flex items-center"><Calendar size={14} className="mr-2 text-rose-400"/> {c.date}</div>
                                    <div className="flex items-center"><MapPin size={14} className="mr-2 text-rose-400"/> {c.location || 'មិនទាន់កំណត់ទីតាំង'}</div>
                                    <div className="mt-2 line-clamp-2 text-slate-400 text-xs">
                                        {c.description}
                                    </div>
                                </div>
                                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center gap-2">
                                    <Button className="flex-1 text-xs shadow-md shadow-rose-100" onClick={() => handleViewDetail(c)}>
                                        <Eye size={14} className="mr-1"/> លម្អិត
                                    </Button>
                                    <Button variant="outline" className="px-3 text-xs" onClick={() => handleEdit(c)}>
                                        <Edit2 size={14}/>
                                    </Button>
                                    <Button variant="outline" className="px-3 text-red-500 hover:text-red-600 hover:bg-red-50 border-slate-100" onClick={() => handleDeleteCeremony(c.id)}>
                                        <Trash2 size={14}/>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                             <Calendar size={48} className="mx-auto mb-4 opacity-50"/>
                             <p>អ្នកមិនទាន់មានកម្មវិធីទេ។ សូមបង្កើតថ្មី។</p>
                        </div>
                    )}
                </div>
            )}
            
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
};

export default OwnerPortal;
