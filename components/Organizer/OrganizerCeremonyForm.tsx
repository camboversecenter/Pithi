import React, { useState, useEffect } from 'react';
import { Ceremony, User, UserRole } from '../../types';
import { Card, Input, Button, SearchableSelect } from '../UIComponents';
import { Loader2, Wand2, Image as ImageIcon, Sparkles, ArrowLeft, UserCircle, QrCode, Trash2 } from 'lucide-react';
import { generateCeremonyBanner, generateInvitationMessage } from '../../services/geminiService';
import { getUsers } from '../../services/authService';

interface OrganizerCeremonyFormProps {
    initialData: Partial<Ceremony>;
    onSave: (data: Partial<Ceremony>, bannerFile: File | null, khqrFile: File | null) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    currentUser: User;
}

const OrganizerCeremonyForm: React.FC<OrganizerCeremonyFormProps> = ({ initialData, onSave, onCancel, isSaving, currentUser }) => {
    const [formData, setFormData] = useState<Partial<Ceremony>>(initialData);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [khqrFile, setKhqrFile] = useState<File | null>(null);
    const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
    const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
    const [generalUsers, setGeneralUsers] = useState<User[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    useEffect(() => {
        setFormData(initialData);
        setBannerFile(null);
        setKhqrFile(null);
        loadUsers();
    }, [initialData]);

    const loadUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const users = await getUsers(UserRole.GENERAL_USER);
            setGeneralUsers(users);
        } catch (e) {
            console.error("Failed to load general users", e);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleGenerateBanner = async () => {
        if (!formData.type) return;
        setIsGeneratingBanner(true);
        try {
            const b = await generateCeremonyBanner(formData.type);
            if (b) {
                const res = await fetch(b);
                const blob = await res.blob();
                setBannerFile(new File([blob], "ai_banner.jpg", { type: "image/jpeg" }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingBanner(false);
        }
    };

    const handleGenerateMessage = async () => {
        if (!formData.type) return;
        setIsGeneratingMessage(true);
        try {
            const m = await generateInvitationMessage(formData.type, currentUser.name);
            setFormData(p => ({ ...p, invitationMessage: m }));
        } finally {
            setIsGeneratingMessage(false);
        }
    };

    const handleSave = () => {
        onSave(formData, bannerFile, khqrFile);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onCancel} className="pl-0 text-slate-500 hover:bg-transparent hover:text-blue-600">
                    <ArrowLeft size={20} className="mr-2"/> ត្រឡប់ក្រោយ
                </Button>
            </div>

            <div className="border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold font-serif text-slate-900">
                        {formData.id ? "កែប្រែកម្មវិធី" : "បង្កើតកម្មវិធីថ្មី"}
                    </h1>
                    <p className="text-slate-500 text-sm">បំពេញព័ត៌មានលម្អិតដើម្បីបង្កើតកម្មវិធីសម្រាប់អតិថិជន។</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Main Form */}
                <div className="lg:col-span-2 space-y-8">
                    <Card title="ព័ត៌មានទូទៅ">
                        <div className="space-y-6">
                            <Input label="ឈ្មោះកម្មវិធី" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="ឧ. មង្គលការ សុខ & សៅ" required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="កាលបរិច្ឆេទ" type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} required />
                                <Input label="ថវិកាគ្រោង ($)" type="number" value={formData.budget || ''} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
                            </div>
                            <Input label="ទីតាំង" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="ផ្ទះលេខ... ផ្លូវ..." />
                        </div>
                    </Card>

                    <Card title="ចាត់តាំងម្ចាស់កម្មវិធី (Assign Owner)">
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500 mb-2">ជ្រើសរើសអតិថិជន (General User) ដែលជាម្ចាស់កម្មវិធីនេះ។</p>
                            <SearchableSelect 
                                label="ម្ចាស់កម្មវិធី"
                                placeholder={isLoadingUsers ? "កំពុងផ្ទុក..." : "ស្វែងរកឈ្មោះម្ចាស់កម្មវិធី..."}
                                options={[
                                    { value: currentUser.id, label: `ខ្លួនឯង (${currentUser.name})`, subLabel: 'Organizer is the owner' },
                                    ...generalUsers.map(u => ({ value: u.id, label: u.name, subLabel: u.email }))
                                ]}
                                value={formData.ownerId || currentUser.id}
                                onChange={(val) => setFormData({ ...formData, ownerId: val })}
                            />
                            <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3 border border-blue-100">
                                <UserCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={18}/>
                                <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                    ម្ចាស់កម្មវិធីដែលត្រូវបានចាត់តាំង នឹងអាចមើលឃើញកម្មវិធីនេះនៅក្នុង "កម្មវិធីរបស់ខ្ញុំ" ហើយអាចគ្រប់គ្រងភ្ញៀវ និងថវិកាបាន។
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card title="រូបភាព & សារ">
                            {/* Banner Upload & AI */}
                            <div className="mb-8">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-bold text-slate-700">រូបភាព Banner</label>
                                <button 
                                    onClick={handleGenerateBanner}
                                    disabled={isGeneratingBanner || !formData.type}
                                    className="text-xs text-blue-600 font-bold flex items-center hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 border border-blue-100"
                                >
                                    {isGeneratingBanner ? <Loader2 size={12} className="animate-spin mr-1.5"/> : <Wand2 size={12} className="mr-1.5"/>}
                                    {isGeneratingBanner ? 'Generating...' : 'ប្រើ AI បង្កើតរូបភាព'}
                                </button>
                            </div>
                            
                            <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center transition-all hover:border-blue-300 hover:bg-blue-50/30">
                                {(formData.bannerUrl || bannerFile) ? (
                                    <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden shadow-sm">
                                        <img 
                                            src={bannerFile ? URL.createObjectURL(bannerFile) : formData.bannerUrl} 
                                            className="w-full h-full object-cover" 
                                            alt="Banner Preview" 
                                        />
                                        <button 
                                            onClick={() => { setBannerFile(null); setFormData({...formData, bannerUrl: ''}); }}
                                            className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-slate-600 hover:text-red-600 shadow-sm backdrop-blur-sm"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-8">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-300">
                                            <ImageIcon size={32}/>
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium">Click to upload or drag and drop</p>
                                        <p className="text-slate-400 text-xs mt-1">SVG, PNG, JPG (Max 2MB)</p>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => {
                                        if(e.target.files?.[0]) setBannerFile(e.target.files[0]);
                                    }}
                                    className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${(formData.bannerUrl || bannerFile) ? 'hidden pointer-events-none' : ''}`}
                                />
                            </div>
                            </div>

                            {/* KHQR Upload */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-slate-700 mb-3">ភ្ជាប់ QR Code ធនាគារ (KHQR)</label>
                                <div className="relative w-40 h-40 mx-auto border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center transition-all hover:border-blue-300 hover:bg-blue-50/30">
                                    {(formData.khqrUrl || khqrFile) ? (
                                        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm">
                                            <img 
                                                src={khqrFile ? URL.createObjectURL(khqrFile) : formData.khqrUrl} 
                                                className="w-full h-full object-contain" 
                                                alt="KHQR Preview" 
                                            />
                                            <button 
                                                onClick={() => { setKhqrFile(null); setFormData({...formData, khqrUrl: ''}); }}
                                                className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-slate-600 hover:text-red-600 shadow-sm backdrop-blur-sm"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4">
                                            <QrCode size={24} className="mx-auto mb-2 text-slate-300" />
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Upload QR</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => {
                                            if(e.target.files?.[0]) setKhqrFile(e.target.files[0]);
                                        }}
                                        className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${(formData.khqrUrl || khqrFile) ? 'hidden pointer-events-none' : ''}`}
                                    />
                                </div>
                                <p className="text-center text-[10px] text-slate-400 mt-2">ភ្ញៀវនឹងអាចមើលឃើញ QR នេះដើម្បីជូនចំណងដៃ</p>
                            </div>
                            
                            {/* Message & AI */}
                            <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-sm font-bold text-slate-700">សារស្វាគមន៍</label>
                                <button 
                                    onClick={handleGenerateMessage}
                                    disabled={isGeneratingMessage || !formData.type}
                                    className="text-xs text-blue-600 font-bold flex items-center hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 border border-blue-100"
                                >
                                    {isGeneratingMessage ? <Loader2 size={12} className="animate-spin mr-1.5"/> : <Sparkles size={12} className="mr-1.5"/>}
                                    {isGeneratingMessage ? 'Writing...' : 'ប្រើ AI សរសេរអោយ'}
                                </button>
                            </div>
                            <textarea 
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none transition-all placeholder:text-slate-400 text-slate-700 font-medium"
                                rows={4}
                                placeholder="សូមស្វាគមន៍ភ្ញៀវកិត្តិយស..."
                                value={formData.invitationMessage || ''}
                                onChange={e => setFormData({...formData, invitationMessage: e.target.value})}
                            />
                        </div>
                    </Card>
                </div>

                {/* Right Column: Sidebar */}
                <div className="space-y-6">
                    <Card title="ប្រភេទកម្មវិធី">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {['អាពាហ៍ពិពាហ៍', 'ខួបកំណើត', 'ឡើងផ្ទះ', 'បុណ្យសព', 'បុណ្យ ៧ ថ្ងៃ', 'Other'].map(type => (
                                    <button
                                    key={type}
                                    onClick={() => setFormData({...formData, type: type === 'Other' ? '' : type})}
                                    className={`px-3 py-3 rounded-xl text-sm font-bold border transition-all ${
                                        formData.type === type || (type === 'Other' && !['អាពាហ៍ពិពាហ៍', 'ខួបកំណើត', 'ឡើងផ្ទះ', 'បុណ្យសព', 'បុណ្យ ៧ ថ្ងៃ'].includes(formData.type || ''))
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                    >
                                        {type === 'Other' ? 'ផ្សេងៗ...' : type}
                                    </button>
                                ))}
                            </div>
                            {!['អាពាហ៍ពិពាហ៍', 'ខួបកំណើត', 'ឡើងផ្ទះ', 'បុណ្យសព', 'បុណ្យ ៧ ថ្ងៃ'].includes(formData.type || 'អាពាហ៍ពិពាហ៍') && (
                                <Input 
                                placeholder="បញ្ចូលប្រភេទកម្មវិធី..." 
                                value={formData.type || ''} 
                                onChange={e => setFormData({...formData, type: e.target.value})}
                                autoFocus
                                />
                            )}
                    </Card>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 sticky top-6">
                        <div className="flex flex-col gap-4">
                            <Button className="w-full py-4 text-base shadow-xl shadow-blue-200 bg-blue-600 hover:bg-blue-700 border-transparent" onClick={handleSave} isLoading={isSaving}>
                                {formData.id ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតកម្មវិធី'}
                            </Button>
                            <Button variant="secondary" className="w-full py-3" onClick={onCancel} disabled={isSaving}>
                                បោះបង់
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizerCeremonyForm;