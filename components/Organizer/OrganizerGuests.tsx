
import React, { useState, useMemo, useEffect } from 'react';
import { Ceremony, Guest, User, GuestStatus, UserRole } from '../../types';
import { addGuest, deleteGuest, getGuests, getCeremonies, setGuestCheckIn } from '../../services/dataService';
import { getUsers } from '../../services/authService';
import { Button, Modal, Input, Select, Pagination } from '../UIComponents';
import CheckInScanner from '../CheckInScanner';
import { Plus, Search, Filter, UserPlus, Copy, Upload, Download, Trash2, FileSpreadsheet, ScanLine, UserCheck } from 'lucide-react';
import { useGlobalDialog } from '../../contexts/GlobalDialogContext';

interface OrganizerGuestsProps {
    ceremony: Ceremony;
    guests: Guest[];
    onRefresh: () => void;
    currentUser: User;
}

const OrganizerGuests: React.FC<OrganizerGuestsProps> = ({ ceremony, guests, onRefresh, currentUser }) => {
    const { showAlert, showConfirm } = useGlobalDialog();

    // Guest List Management State
    const [guestSearch, setGuestSearch] = useState('');
    const [guestFilter, setGuestFilter] = useState('ALL');
    const [guestPage, setGuestPage] = useState(1);
    const GUESTS_PER_PAGE = 12;

    // Modals State
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [newGuest, setNewGuest] = useState({ name: '', phoneNumber: '', guestType: 'General' });

    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [copySourceId, setCopySourceId] = useState('');
    const [allMyCeremonies, setAllMyCeremonies] = useState<Ceremony[]>([]);
    const [isCopying, setIsCopying] = useState(false);

    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isImportingCsv, setIsImportingCsv] = useState(false);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteSearch, setInviteSearch] = useState('');
    const [searchableUsers, setSearchableUsers] = useState<User[]>([]);
    const [isInviting, setIsInviting] = useState(false);

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const checkedInCount = guests.filter(g => g.checkedInAt).length;
    const acceptedCount = guests.filter(g => g.status === GuestStatus.ACCEPTED).length;

    // --- Filter Logic ---
    const filteredGuests = useMemo(() => {
        return guests.filter(g => {
            const matchesSearch = g.name.toLowerCase().includes(guestSearch.toLowerCase()) || 
                                  (g.phoneNumber && g.phoneNumber.includes(guestSearch));
            const matchesFilter = guestFilter === 'ALL' || g.status === guestFilter;
            return matchesSearch && matchesFilter;
        });
    }, [guests, guestSearch, guestFilter]);

    const paginatedGuests = useMemo(() => {
        const start = (guestPage - 1) * GUESTS_PER_PAGE;
        return filteredGuests.slice(start, start + GUESTS_PER_PAGE);
    }, [filteredGuests, guestPage]);

    const totalGuestPages = Math.ceil(filteredGuests.length / GUESTS_PER_PAGE);

    useEffect(() => {
        setGuestPage(1);
    }, [guestSearch, guestFilter]);

    // --- Actions ---

    const handleAddGuest = async () => {
        if(!newGuest.name) return;
        try {
            await addGuest({ceremonyId: ceremony.id, ...newGuest});
            setIsGuestModalOpen(false);
            setNewGuest({name:'', phoneNumber:'', guestType:'General'});
            onRefresh();
            await showAlert("ជោគជ័យ", "ភ្ញៀវត្រូវបានបន្ថែមដោយជោគជ័យ។", "success");
        } catch (error: any) {
            await showAlert("បរាជ័យ", error.message || "មិនអាចបន្ថែមភ្ញៀវបានឡើយ។", "danger");
        }
    };

    const handleToggleCheckIn = async (guest: Guest) => {
        try {
            await setGuestCheckIn(String(guest.id), !guest.checkedInAt);
            onRefresh();
        } catch (error: any) {
            await showAlert("បរាជ័យ", error.message || "មិនអាចកត់ត្រាការចូលរួមបានទេ។", "danger");
        }
    };

    const handleDeleteGuest = async (id: string) => {
        const confirm = await showConfirm("លុបឈ្មោះភ្ញៀវ?", "តើអ្នកប្រាកដជាចង់លុបភ្ញៀវនេះចេញពីបញ្ជីមែនទេ?", "danger");
        if (confirm) {
            try {
                await deleteGuest(id);
                onRefresh();
                await showAlert("ជោគជ័យ", "ភ្ញៀវត្រូវបានលុបដោយជោគជ័យ។", "success");
            } catch (error: any) {
                await showAlert("បរាជ័យ", error.message || "មិនអាចលុបឈ្មោះភ្ញៀវបានឡើយ។", "danger");
            }
        }
    };

    // Copy Logic
    const loadAllCeremoniesForCopy = async () => {
        const res = await getCeremonies(currentUser.id, UserRole.ORGANIZER, 1, 1000, 'ALL');
        setAllMyCeremonies(res.data.filter(c => c.id !== ceremony.id));
    };

    const handleCopyGuests = async () => {
        if (!copySourceId) return;
        setIsCopying(true);
        try {
            const g = await getGuests(copySourceId, 1, 1000);
            for (const i of g.data) {
                await addGuest({
                    ceremonyId: ceremony.id,
                    name: i.name,
                    phoneNumber: i.phoneNumber,
                    guestType: i.guestType
                });
            }
            setIsCopyModalOpen(false);
            onRefresh();
            await showAlert("ជោគជ័យ", `បានចម្លងភ្ញៀវចំនួន ${g.data.length} នាក់ ដោយជោគជ័យ!`, "success");
        } catch (e: any) {
            await showAlert("បរាជ័យ", e.message, "danger");
        } finally {
            setIsCopying(false);
        }
    };

    // Invite Logic
    const handleOpenInviteModal = async () => {
        setIsInviteModalOpen(true);
        setInviteSearch('');
        const users = await getUsers(UserRole.GENERAL_USER);
        const currentGuestUserIds = guests.map(g => g.userId).filter(Boolean);
        const filtered = users.filter(u => u.id !== currentUser.id && !currentGuestUserIds.includes(u.id));
        setSearchableUsers(filtered);
    };

    const handleInviteUser = async (targetUser: User) => {
        setIsInviting(true);
        try {
            await addGuest({
                ceremonyId: ceremony.id,
                userId: targetUser.id,
                name: targetUser.name,
                guestType: 'General',
                status: GuestStatus.PENDING
            });
            setSearchableUsers(prev => prev.filter(u => u.id !== targetUser.id));
            onRefresh();
            await showAlert("ជោគជ័យ", `បានអញ្ជើញ ${targetUser.name} ដោយជោគជ័យ!`, "success");
        } catch (e: any) {
            await showAlert("បរាជ័យ", e.message, "danger");
        } finally {
            setIsInviting(false);
        }
    };

    const filteredSearchableUsers = searchableUsers.filter(u => 
        u.name.toLowerCase().includes(inviteSearch.toLowerCase()) || 
        u.email.toLowerCase().includes(inviteSearch.toLowerCase())
    );

    // CSV Logic
    const handleCsvUpload = async () => {
        if (!csvFile) return;
        setIsImportingCsv(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const rows = text.split('\n').map(row => row.split(','));
                let count = 0;
                let startIndex = 0;
                if (rows.length > 0 && rows[0][0] && rows[0][0].toLowerCase().includes('name')) {
                    startIndex = 1;
                }

                for (let i = startIndex; i < rows.length; i++) {
                    const cols = rows[i];
                    if (cols.length >= 1 && cols[0] && cols[0].trim()) {
                        const name = cols[0].trim().replace(/^"|"$/g, '');
                        const phone = cols[1] ? cols[1].trim().replace(/^"|"$/g, '') : '';
                        const type = cols[2] ? cols[2].trim().replace(/^"|"$/g, '') : 'General';
                        
                        await addGuest({
                            ceremonyId: ceremony.id,
                            name,
                            phoneNumber: phone,
                            guestType: type
                        });
                        count++;
                    }
                }
                
                onRefresh();
                setIsCsvModalOpen(false);
                setCsvFile(null);
                await showAlert("ជោគជ័យ", `បាននាំចូលភ្ញៀវចំនួន ${count} នាក់។`, "success");
            } catch (err: any) {
                console.error(err);
                await showAlert("បរាជ័យ", "មានបញ្ហាក្នុងការអានឯកសារ CSV។", "danger");
            } finally {
                setIsImportingCsv(false);
            }
        };
        reader.readAsText(csvFile);
    };

    const downloadCsvTemplate = () => {
        const csvContent = "Name,PhoneNumber,Type\nSok Dara,012345678,VIP\nChan Thida,098765432,General";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "guest_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportGuests = () => {
        if (guests.length === 0) {
            showAlert("បរាជ័យ", "គ្មានទិន្នន័យសម្រាប់នាំចេញទេ។", "warning");
            return;
        }
        const header = ["Name", "Phone", "Type", "Status"];
        const rows = guests.map(g => [
            `"${g.name}"`, 
            `"${g.phoneNumber || ''}"`, 
            `"${g.guestType || 'General'}"`, 
            `"${g.status}"`
        ]);
        const csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `guests_${ceremony.title.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-2 mb-4">
                <Button variant="secondary" onClick={() => setIsScannerOpen(true)} className="h-8 px-3 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                    <ScanLine size={14} className="mr-2"/> ស្កេនចូល
                </Button>
                <Button variant="secondary" onClick={handleOpenInviteModal} className="h-8 px-3 text-xs">
                    <UserPlus size={14} className="mr-2"/> អញ្ជើញ
                </Button>
                <Button variant="secondary" onClick={() => { loadAllCeremoniesForCopy(); setIsCopyModalOpen(true); }} className="h-8 px-3 text-xs">
                    <Copy size={14} className="mr-2"/> ចម្លង
                </Button>
                <Button variant="secondary" onClick={() => setIsCsvModalOpen(true)} className="h-8 px-3 text-xs">
                    <Upload size={14} className="mr-2"/> នាំចូល
                </Button>
                <Button variant="secondary" onClick={handleExportGuests} className="h-8 px-3 text-xs">
                    <Download size={14} className="mr-2"/> នាំចេញ
                </Button>
                <Button onClick={() => setIsGuestModalOpen(true)} className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700 shadow-sm border-transparent">
                    <Plus size={14} className="mr-2"/> បន្ថែម
                </Button>
            </div>

            {/* Search Filter */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <input 
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm"
                        placeholder="ស្វែងរកឈ្មោះ ឬ លេខទូរស័ព្ទ..."
                        value={guestSearch}
                        onChange={e => setGuestSearch(e.target.value)}
                    />
                </div>
                <div className="relative md:w-64">
                    <Filter className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <select 
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm appearance-none cursor-pointer"
                        value={guestFilter}
                        onChange={e => setGuestFilter(e.target.value)}
                    >
                        <option value="ALL">ទាំងអស់ (All)</option>
                        <option value="ACCEPTED">យល់ព្រម (Accepted)</option>
                        <option value="PENDING">រង់ចាំ (Pending)</option>
                        <option value="DECLINED">បដិសេធ (Declined)</option>
                    </select>
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-bold whitespace-nowrap" title="ភ្ញៀវបានចូលរួម / បានយល់ព្រម">
                    <UserCheck size={16}/> {checkedInCount}/{acceptedCount} បានចូលរួម
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedGuests.map(g => (
                    <div key={g.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${g.checkedInAt ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {g.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 line-clamp-1">{g.name}</p>
                                <p className="text-xs text-slate-500">{g.guestType}</p>
                                {g.checkedInAt && (
                                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                                        <UserCheck size={10}/> ចូលរួម {new Date(g.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${g.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' : g.status === 'DECLINED' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                                {g.status}
                            </span>
                            <button
                                onClick={() => handleToggleCheckIn(g)}
                                className={`p-2 rounded-lg transition-all ${g.checkedInAt ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                title={g.checkedInAt ? 'លុបការចូលរួម' : 'កត់ត្រាការចូលរួម'}
                            >
                                <UserCheck size={18}/>
                            </button>
                            <button onClick={() => handleDeleteGuest(g.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
                {paginatedGuests.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <UserPlus size={32} className="mx-auto mb-3 opacity-30"/>
                        <p>រកមិនឃើញភ្ញៀវ។</p>
                    </div>
                )}
            </div>

            <Pagination currentPage={guestPage} totalPages={totalGuestPages} onPageChange={setGuestPage} />

            {/* --- Check-in Scanner --- */}
            <CheckInScanner
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                ceremonyId={ceremony.id}
                guests={guests}
                onCheckedIn={onRefresh}
            />

            {/* --- Modals --- */}
            <Modal isOpen={isGuestModalOpen} onClose={() => setIsGuestModalOpen(false)} title="បន្ថែមភ្ញៀវ">
                <div className="space-y-4">
                    <Input label="ឈ្មោះភ្ញៀវ" value={newGuest.name} onChange={e => setNewGuest({...newGuest, name: e.target.value})} required autoFocus />
                    <Input label="លេខទូរស័ព្ទ" value={newGuest.phoneNumber} onChange={e => setNewGuest({...newGuest, phoneNumber: e.target.value})} />
                    <Select label="ប្រភេទភ្ញៀវ" options={[{value:'General',label:'General'}, {value:'VIP',label:'VIP'}, {value:'Family',label:'Family'}]} value={newGuest.guestType} onChange={e => setNewGuest({...newGuest, guestType: e.target.value})} />
                    <Button className="w-full" onClick={handleAddGuest}>បន្ថែម</Button>
                </div>
            </Modal>

            <Modal isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} title="នាំចូលភ្ញៀវពីកម្មវិធីចាស់ (Copy)">
                    <div className="space-y-4">
                    <p className="text-sm text-slate-500">ជ្រើសរើសកម្មវិធីចាស់របស់អ្នកដើម្បីចម្លងបញ្ជីភ្ញៀវមកកាន់កម្មវិធីនេះ។</p>
                    {allMyCeremonies.length > 0 ? (
                        <Select 
                            label="ពីកម្មវិធី"
                            options={allMyCeremonies.map(c => ({ value: c.id, label: `${c.title} (${c.date})` }))}
                            value={copySourceId}
                            onChange={e => setCopySourceId(e.target.value)}
                        />
                    ) : (
                        <p className="text-center text-sm text-slate-400 py-4 italic">គ្មានកម្មវិធីផ្សេងទៀតដើម្បីនាំចូលទេ។</p>
                    )}
                    <Button className="w-full" onClick={handleCopyGuests} disabled={!copySourceId || isCopying} isLoading={isCopying}>
                        {isCopying ? 'កំពុងចម្លង...' : 'ចម្លងឥឡូវនេះ'}
                    </Button>
                    </div>
            </Modal>

            <Modal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} title="នាំចូលភ្ញៀវពី CSV">
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-2">
                        <h4 className="font-bold text-slate-800 flex items-center"><FileSpreadsheet size={16} className="mr-2"/> ទម្រង់ឯកសារ (CSV Format)</h4>
                        <p>ឯកសារត្រូវមានក្បាលតារាង (Header) និងទិន្នន័យដូចខាងក្រោម៖</p>
                        <div className="bg-slate-800 text-slate-200 p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-nowrap">
                            Name, PhoneNumber, Type<br/>
                            Sok Dara, 012345678, VIP<br/>
                            Chan Thida, 098765432, General
                        </div>
                        <button onClick={downloadCsvTemplate} className="text-blue-600 font-bold text-xs hover:underline mt-2 flex items-center">
                            <Download size={12} className="mr-1"/> ទាញយកគំរូ CSV (Template)
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">ជ្រើសរើសឯកសារ CSV</label>
                        <input 
                            type="file" 
                            accept=".csv"
                            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all border border-slate-200 rounded-xl"
                        />
                    </div>
                    <Button className="w-full" onClick={handleCsvUpload} disabled={!csvFile || isImportingCsv} isLoading={isImportingCsv}>
                        {isImportingCsv ? 'កំពុងនាំចូល...' : 'ចាប់ផ្តើមនាំចូល'}
                    </Button>
                </div>
            </Modal>

            <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="អញ្ជើញអ្នកប្រើប្រាស់">
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                        <input 
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all text-sm"
                            placeholder="ស្វែងរកឈ្មោះ ឬ អ៊ីមែល..."
                            value={inviteSearch}
                            onChange={e => setInviteSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 -mx-2 px-2">
                        {filteredSearchableUsers.length > 0 ? (
                            filteredSearchableUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                                            <p className="text-xs text-slate-500">{u.email}</p>
                                        </div>
                                    </div>
                                    <Button className="px-3 py-1.5 text-xs h-auto" onClick={() => handleInviteUser(u)} disabled={isInviting}>
                                        អញ្ជើញ
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-400 text-sm"><p>រកមិនឃើញអ្នកប្រើប្រាស់ទេ។</p></div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default OrganizerGuests;
