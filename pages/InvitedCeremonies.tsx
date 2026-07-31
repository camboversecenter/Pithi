
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentUser, getUserById } from '../services/authService';
import { getMyInvitations, getCeremonyById, respondToInvitation, reportTransaction, getMyReportedTransactions } from '../services/dataService';
import { generateGuestQr } from '../services/checkinService';
import { scanBankReceipt } from '../services/geminiService';
import { uploadImage } from '../services/storageService';
import { Invitation, Ceremony, GuestStatus, User, ReportedTransaction } from '../types';
import { Card, Button, Pagination, Badge, Modal, Input, MarkdownRenderer } from '../components/UIComponents';
import { Calendar, MapPin, ArrowLeft, Clock, CheckCircle, XCircle, RotateCcw, Map as MapIcon, User as UserIcon, ArrowRight, Gift, QrCode, Upload, Sparkles, Loader2, MessagesSquare } from 'lucide-react';
import { resolveMapLink } from '../services/mapsService';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';

const InvitedCeremonies = () => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const ceremonyIdParam = searchParams.get('id');
    const { showAlert } = useGlobalDialog();

    // List View State
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');

    // Detail View State
    const [selectedCeremony, setSelectedCeremony] = useState<Ceremony | null>(null);
    const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
    const [owner, setOwner] = useState<User | null>(null);
    const [entryQr, setEntryQr] = useState<string | null>(null);

    // Entry pass QR, shown once the guest accepted the invitation
    useEffect(() => {
        if (selectedInvitation && selectedInvitation.status === GuestStatus.ACCEPTED) {
            generateGuestQr(String(selectedInvitation.id), selectedInvitation.ceremonyId)
                .then(setEntryQr)
                .catch(() => setEntryQr(null));
        } else {
            setEntryQr(null);
        }
    }, [selectedInvitation?.id, selectedInvitation?.status]);

    // Bank Reporting State
    const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
    const [receiptImageBase64, setReceiptImageBase64] = useState<string | null>(null); // For Preview & AI
    const [receiptFile, setReceiptFile] = useState<File | null>(null); // For Upload
    const [isScanning, setIsScanning] = useState(false);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [scannedData, setScannedData] = useState<{ amount: number; currency: string; senderName: string; date: string }>({ amount: 0, currency: 'USD', senderName: user?.name || '', date: new Date().toISOString().split('T')[0] });
    const [myReports, setMyReports] = useState<ReportedTransaction[]>([]);

    // Initial Load
    useEffect(() => {
        if (user && !ceremonyIdParam) {
            loadList(activeTab, page);
        }
    }, [user, ceremonyIdParam, activeTab, page]);

    // Detail Load
    useEffect(() => {
        if (user && ceremonyIdParam) {
            loadDetail(ceremonyIdParam);
        } else {
            setSelectedCeremony(null);
        }
    }, [user, ceremonyIdParam]);

    const loadList = async (status: 'UPCOMING' | 'PAST', currentPage: number) => {
        if (!user) return;
        const res = await getMyInvitations(user.id, currentPage, 9, status);
        setInvitations(res.data);
        setTotalPages(res.totalPages);
    };

    const loadDetail = async (id: string) => {
        if (!user) return;
        const ceremony = await getCeremonyById(id);
        if (ceremony) {
            setSelectedCeremony(ceremony);
            // Fetch associated invitation to get RSVP status
            const res = await getMyInvitations(user.id, 1, 100); 
            const invite = res.data.find(i => i.ceremonyId === id);
            if (invite) setSelectedInvitation(invite);

            // Fetch Owner info
            if (ceremony.ownerId) {
                const ownerInfo = await getUserById(ceremony.ownerId);
                setOwner(ownerInfo);
            }
            
            // Fetch my reports
            const reports = await getMyReportedTransactions(id, user.id);
            setMyReports(reports);
        }
    };

    const handleRSVP = async (status: GuestStatus) => {
        if (selectedInvitation) {
            try {
                await respondToInvitation(selectedInvitation.id, status);
                setSelectedInvitation({...selectedInvitation, status: status});
                // Update List cache if needed
                loadList(activeTab, page);
                await showAlert("ជោគជ័យ", "បានកត់ត្រាការឆ្លើយតបរបស់អ្នកដោយជោគជ័យ។", "success");
            } catch (error: any) {
                await showAlert("បរាជ័យ", error.message || "មិនអាចផ្ញើការឆ្លើយតបបានឡើយ។", "danger");
            }
        }
    };

    const handleBack = () => {
        setSearchParams({});
    };

    // --- Bank Transfer Logic ---

    const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReceiptFile(file);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                setReceiptImageBase64(base64);
                
                // AI Scan
                setIsScanning(true);
                const extracted = await scanBankReceipt(base64);
                setIsScanning(false);

                if (extracted) {
                    setScannedData({
                        amount: extracted.amount || 0,
                        currency: extracted.currency || 'USD',
                        senderName: extracted.senderName || user?.name || '',
                        date: extracted.date || new Date().toISOString().split('T')[0]
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const submitPaymentReport = async () => {
        if (!selectedCeremony || !user || !receiptFile) return;
        
        setIsSubmittingReport(true);
        try {
            // Upload to Bucket first
            const receiptUrl = await uploadImage(receiptFile, 'receipts');

            await reportTransaction({
                ceremonyId: selectedCeremony.id,
                guestId: user.id,
                guestName: user.name,
                amount: scannedData.amount,
                currency: scannedData.currency,
                date: scannedData.date,
                senderNameFromReceipt: scannedData.senderName,
                receiptImageUrl: receiptUrl
            });

            await showAlert("ជោគជ័យ", "ការរាយការណ៍របស់អ្នកត្រូវបានផ្ញើជូនម្ចាស់កម្មវិធីត្រួតពិនិត្យ។", "success");
            setIsGiftModalOpen(false);
            setReceiptImageBase64(null);
            setReceiptFile(null);
            setScannedData({ amount: 0, currency: 'USD', senderName: user.name, date: new Date().toISOString().split('T')[0] });
            
            // Refresh reports
            const reports = await getMyReportedTransactions(selectedCeremony.id, user.id);
            setMyReports(reports);
        } catch (error) {
            console.error("Report error:", error);
            await showAlert("បរាជ័យ", "បរាជ័យក្នុងការផ្ញើរបាយការណ៍។", "danger");
        } finally {
            setIsSubmittingReport(false);
        }
    };

    if (!user) return null;

    // --- LIST VIEW ---
    if (!ceremonyIdParam) {
        return (
            <div className="space-y-8">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 font-serif">ការអញ្ជើញ</h1>
                        <p className="text-slate-500 mt-1">បញ្ជីកម្មវិធីដែលអ្នកត្រូវបានអញ្ជើញជាភ្ញៀវ។</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button 
                        onClick={() => { setActiveTab('UPCOMING'); setPage(1); }}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'UPCOMING' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        កម្មវិធីបច្ចុប្បន្ន
                    </button>
                    <button 
                        onClick={() => { setActiveTab('PAST'); setPage(1); }}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'PAST' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        កម្មវិធីចាស់ៗ
                    </button>
                </div>

                {/* Grid */}
                {invitations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                        {invitations.map(invite => (
                            <Card key={invite.id} className="hover:shadow-lg transition-all hover:-translate-y-1 group cursor-pointer" noPadding>
                                <div onClick={() => setSearchParams({ id: invite.ceremonyId })} className="p-6 h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-lg ${activeTab === 'UPCOMING' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {activeTab === 'UPCOMING' ? <Calendar size={20}/> : <Clock size={20}/>}
                                        </div>
                                        <Badge status={invite.status} />
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif group-hover:text-rose-600 transition-colors line-clamp-1">{invite.ceremonyTitle}</h3>
                                    
                                    <div className="space-y-2 mb-4 pt-4 border-t border-slate-50 flex-1">
                                        <div className="flex items-center text-sm text-slate-600">
                                            <Calendar className="w-4 h-4 mr-2 text-rose-400"/> {invite.ceremonyDate}
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600">
                                            <MapPin className="w-4 h-4 mr-2 text-rose-400"/> {invite.ceremonyLocation || 'មិនទាន់កំណត់ទីតាំង'}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end mt-auto">
                                         <span className="text-sm font-bold text-rose-600 flex items-center group-hover:underline">
                                             មើលលម្អិត <ArrowRight size={16} className="ml-1"/>
                                         </span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                             <Calendar size={32}/>
                        </div>
                        <p className="text-slate-500">មិនមានកម្មវិធីនៅក្នុងបញ្ជីនេះទេ។</p>
                    </div>
                )}
                
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
        );
    }

    // --- DETAIL VIEW ---
    if (!selectedCeremony) return <div className="p-8 text-center text-slate-500">កំពុងផ្ទុក...</div>;

    const isPast = selectedCeremony.date < new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
             <button onClick={handleBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium">
                <ArrowLeft className="w-4 h-4 mr-2"/> ត្រឡប់ក្រោយ
            </button>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="h-48 bg-gradient-to-r from-slate-900 to-slate-800 relative p-8 flex flex-col justify-end">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
                    <div className="relative z-10 text-white">
                         <div className="flex items-center gap-3 mb-2">
                             <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">{selectedCeremony.type}</span>
                             {isPast && <span className="bg-slate-700/50 px-3 py-1 rounded-full text-xs font-bold border border-slate-600">បានបញ្ចប់</span>}
                         </div>
                         <h1 className="text-3xl font-bold font-serif">{selectedCeremony.title}</h1>
                    </div>
                </div>

                <div className="p-8">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         {/* Left Info */}
                         <div className="md:col-span-2 space-y-8">
                             <div>
                                 <h3 className="font-bold text-slate-800 text-lg mb-4">ព័ត៌មានលម្អិត</h3>
                                 <MarkdownRenderer content={selectedCeremony.description || 'គ្មាន'} />
                             </div>

                             <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                 <h4 className="font-bold text-slate-800 mb-3 flex items-center"><UserIcon size={16} className="mr-2 text-rose-500"/> ម្ចាស់កម្មវិធី</h4>
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                                         {owner?.name.charAt(0) || '?'}
                                     </div>
                                     <div className="min-w-0 flex-1">
                                         <p className="font-bold text-slate-800 truncate">{owner?.name || 'Unknown'}</p>
                                         <p className="text-xs text-slate-500 truncate">{owner?.email}</p>
                                     </div>
                                     {owner && owner.id !== user?.id && (
                                         <Button
                                             variant="outline"
                                             className="text-xs px-3 py-2"
                                             onClick={() => navigate(`/messages?with=${owner.id}`)}
                                         >
                                             <MessagesSquare size={14} className="mr-1.5"/> ផ្ញើសារ
                                         </Button>
                                     )}
                                 </div>
                             </div>

                             <div>
                                 <h4 className="font-bold text-slate-800 mb-2">សារអញ្ជើញ</h4>
                                 <MarkdownRenderer content={`"${selectedCeremony.invitationMessage}"`} className="italic border-l-4 border-rose-200 pl-4 py-2 text-slate-600" />
                             </div>
                         </div>

                         {/* Right Info */}
                         <div className="space-y-6">
                             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                                 <div>
                                     <p className="text-xs text-slate-500 font-bold uppercase mb-1">កាលបរិច្ឆេទ</p>
                                     <div className="flex items-center text-slate-800 font-medium">
                                         <Calendar className="w-5 h-5 mr-2 text-rose-500"/>
                                         {selectedCeremony.date}
                                     </div>
                                 </div>
                                 <div>
                                     <p className="text-xs text-slate-500 font-bold uppercase mb-1">ទីតាំង</p>
                                     <div className="flex items-start text-slate-800 font-medium">
                                         <MapPin className="w-5 h-5 mr-2 text-rose-500 flex-shrink-0"/>
                                         {selectedCeremony.location || 'មិនទាន់កំណត់'}
                                     </div>
                                 </div>
                                 
                                 {resolveMapLink(selectedCeremony.mapUrl, selectedCeremony.location) && (
                                     <Button
                                         variant="outline"
                                         className="w-full"
                                         onClick={() => window.open(resolveMapLink(selectedCeremony.mapUrl, selectedCeremony.location)!, '_blank', 'noopener')}
                                     >
                                         <MapIcon size={16} className="mr-2"/> បើកផែនទី
                                     </Button>
                                 )}
                             </div>

                             {/* Gift / Bank Section */}
                             {!isPast && (
                                <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-6 rounded-2xl border border-rose-100 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 text-rose-700 font-bold mb-2">
                                        <Gift size={20} />
                                        <span>ជូនកាដូ / ចំណងដៃ</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">
                                        អ្នកអាចផ្ទេរប្រាក់តាមរយៈគណនីធនាគាររបស់ម្ចាស់កម្មវិធី។
                                    </p>
                                    <Button onClick={() => setIsGiftModalOpen(true)} className="w-full">
                                        <QrCode className="mr-2" size={18}/> ស្កេន QR / រាយការណ៍
                                    </Button>

                                    {/* Display My Reported Transactions */}
                                    {myReports.length > 0 && (
                                        <div className="mt-4 space-y-3 border-t border-rose-200 pt-3">
                                            <h5 className="font-bold text-rose-800 text-sm">ប្រវត្តិការផ្ទេរ</h5>
                                            {myReports.map(report => (
                                                <div key={report.id} className="bg-white p-3 rounded-xl border border-rose-100 flex items-center gap-3">
                                                     {/* Image Thumbnail */}
                                                     <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 cursor-pointer" onClick={() => window.open(report.receiptImageUrl, '_blank')}>
                                                        <img src={report.receiptImageUrl} className="w-full h-full object-cover" />
                                                     </div>
                                                     <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center mb-1">
                                                             <span className="font-bold text-slate-800 text-sm">{report.amount} {report.currency}</span>
                                                             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${report.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                                {report.status}
                                                             </span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 truncate">{report.date}</div>
                                                     </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                             )}

                             {/* RSVP Actions */}
                             {!isPast && selectedInvitation && (
                                 <div className="space-y-3">
                                     <p className="text-center text-sm font-bold text-slate-700">ការឆ្លើយតបរបស់អ្នក:</p>
                                     
                                     {selectedInvitation.status === GuestStatus.PENDING ? (
                                         <div className="grid grid-cols-2 gap-3">
                                             <button 
                                                 onClick={() => handleRSVP(GuestStatus.ACCEPTED)}
                                                 className="flex flex-col items-center justify-center p-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100 font-bold"
                                             >
                                                 <CheckCircle size={24} className="mb-2"/>
                                                 ចូលរួម
                                             </button>
                                             <button 
                                                 onClick={() => handleRSVP(GuestStatus.DECLINED)}
                                                 className="flex flex-col items-center justify-center p-4 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors border border-red-100 font-bold"
                                             >
                                                 <XCircle size={24} className="mb-2"/>
                                                 មិនចូលរួម
                                             </button>
                                         </div>
                                     ) : (
                                         <div className={`p-4 rounded-xl text-center border ${selectedInvitation.status === GuestStatus.ACCEPTED ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                             <div className="flex items-center justify-center font-bold text-lg mb-1">
                                                 {selectedInvitation.status === GuestStatus.ACCEPTED ? <CheckCircle className="mr-2"/> : <XCircle className="mr-2"/>}
                                                 {selectedInvitation.status === GuestStatus.ACCEPTED ? 'ចូលរួម' : 'មិនចូលរួម'}
                                             </div>
                                             <button onClick={() => handleRSVP(GuestStatus.PENDING)} className="text-xs opacity-70 hover:opacity-100 underline mt-2 flex items-center justify-center w-full">
                                                 <RotateCcw size={12} className="mr-1"/> ផ្លាស់ប្តូរ
                                             </button>
                                         </div>
                                     )}
                                 </div>
                             )}

                             {/* Entry Pass QR */}
                             {!isPast && selectedInvitation?.status === GuestStatus.ACCEPTED && entryQr && (
                                 <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
                                     <p className="font-bold text-slate-800 mb-1 flex items-center justify-center gap-2">
                                         <QrCode size={18} className="text-rose-500" /> សំបុត្រចូល
                                     </p>
                                     <p className="text-xs text-slate-500 mb-4">បង្ហាញ QR នេះនៅច្រកចូលកម្មវិធី</p>
                                     <img src={entryQr} alt="Entry QR" className="w-44 h-44 mx-auto bg-white p-2 rounded-xl border border-slate-200" />
                                     {selectedInvitation.checkedInAt && (
                                         <p className="text-xs text-emerald-600 font-bold mt-3 flex items-center justify-center gap-1">
                                             <CheckCircle size={12} /> បានចូលរួមនៅ {new Date(selectedInvitation.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                         </p>
                                     )}
                                 </div>
                             )}
                         </div>
                     </div>
                </div>
            </div>

            {/* Gift / KHQR Modal */}
            <Modal isOpen={isGiftModalOpen} onClose={() => setIsGiftModalOpen(false)} title="ជូនកាដូ / ចំណងដៃ">
                <div className="space-y-6">
                    {/* 1. KHQR Display */}
                    <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-xl border border-slate-200">
                        {selectedCeremony.khqrUrl ? (
                            <>
                                <img src={selectedCeremony.khqrUrl} alt="KHQR Code" className="w-48 h-48 object-contain bg-white p-2 rounded-lg shadow-sm" />
                                <p className="text-sm text-slate-500 mt-2 font-medium">ស្កេនដើម្បីបង់ប្រាក់</p>
                            </>
                        ) : (
                            <div className="text-slate-400 italic">មិនមាន QR Code ទេ។ សូមទាក់ទងម្ចាស់កម្មវិធី។</div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 my-4"></div>

                    {/* 2. Upload Receipt Section */}
                    <div>
                        <h4 className="font-bold text-slate-800 mb-2">រាយការណ៍ការផ្ទេរប្រាក់</h4>
                        <p className="text-xs text-slate-500 mb-4">សូមភ្ជាប់វិក្កយបត្រធនាគារ ប្រព័ន្ធនឹងបំពេញទិន្នន័យដោយស្វ័យប្រវត្តិ។</p>
                        
                        {!receiptImageBase64 ? (
                            <label className="flex flex-col items-center justify-center w-full h-32 bg-white border-2 border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 hover:border-rose-300 transition-all group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-rose-500"/>
                                    <p className="text-sm text-slate-500 group-hover:text-rose-600">Click to upload receipt image</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleReceiptUpload} />
                            </label>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative h-40 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                    <img src={receiptImageBase64} className="w-full h-full object-contain" alt="Receipt" />
                                    <button onClick={() => { setReceiptImageBase64(null); setReceiptFile(null); setScannedData({ ...scannedData, amount: 0 }); }} className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-slate-600 hover:text-red-600">
                                        <XCircle size={20}/>
                                    </button>
                                </div>

                                {isScanning ? (
                                    <div className="p-4 bg-rose-50 rounded-xl flex items-center justify-center text-rose-700 animate-pulse">
                                        <Loader2 className="animate-spin mr-2"/>
                                        <span className="text-sm font-bold">កំពុងស្កេនទិន្នន័យ (AI Scanning)...</span>
                                    </div>
                                ) : (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                                        <div className="flex items-center text-rose-600 text-xs font-bold mb-1">
                                            <Sparkles size={12} className="mr-1"/> ទិន្នន័យបានពី AI
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <Input label="ចំនួនទឹកប្រាក់" type="number" value={scannedData.amount} onChange={e => setScannedData({...scannedData, amount: Number(e.target.value)})} />
                                            </div>
                                            <div className="w-1/3">
                                                 <label className="block text-sm font-bold text-slate-700 mb-1.5">រូបិយប័ណ្ណ</label>
                                                 <select 
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl"
                                                    value={scannedData.currency}
                                                    onChange={e => setScannedData({...scannedData, currency: e.target.value})}
                                                 >
                                                     <option value="USD">USD ($)</option>
                                                     <option value="KHR">KHR (៛)</option>
                                                 </select>
                                            </div>
                                        </div>
                                        <Input label="ឈ្មោះអ្នកផ្ញើ" value={scannedData.senderName} onChange={e => setScannedData({...scannedData, senderName: e.target.value})} />
                                        <Input label="កាលបរិច្ឆេទ" type="date" value={scannedData.date} onChange={e => setScannedData({...scannedData, date: e.target.value})} />
                                    </div>
                                )}

                                <Button className="w-full" onClick={submitPaymentReport} disabled={isScanning || isSubmittingReport} isLoading={isSubmittingReport}>
                                    បញ្ជូនរបាយការណ៍
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default InvitedCeremonies;
