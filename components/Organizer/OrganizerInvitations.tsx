
import React, { useState } from 'react';
import { Ceremony, InvitationTemplate, User } from '../../types';
import { saveInvitationTemplate, deleteInvitationTemplate } from '../../services/dataService';
import { generateInvitationMessage, generateCeremonyBanner } from '../../services/geminiService';
import { uploadImage } from '../../services/storageService';
import { Button, Modal, Input, Select } from '../UIComponents';
import { Plus, Image as ImageIcon, Trash2, Share2, FileText, Loader2, Sparkles } from 'lucide-react';
import { useGlobalDialog } from '../../contexts/GlobalDialogContext';

interface OrganizerInvitationsProps {
    ceremony: Ceremony;
    templates: InvitationTemplate[];
    onRefresh: () => void;
    currentUser: User;
}

const OrganizerInvitations: React.FC<OrganizerInvitationsProps> = ({ ceremony, templates, onRefresh, currentUser }) => {
    const { showAlert, showConfirm } = useGlobalDialog();
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ type: 'General', message: '', bannerUrl: '', expirationDate: '' });
    const [templateBannerFile, setTemplateBannerFile] = useState<File | null>(null);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
    const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);

    const handleGenerateTemplateMessage = async () => {
        setIsGeneratingMessage(true);
        try {
            const m = await generateInvitationMessage(ceremony.type, currentUser.name);
            setNewTemplate(p => ({...p, message: m}));
        } finally {
            setIsGeneratingMessage(false);
        }
    };

    const handleGenerateTemplateBanner = async () => {
        setIsGeneratingBanner(true);
        try {
            const b = await generateCeremonyBanner(ceremony.type);
            if(b) {
                const res = await fetch(b);
                const blob = await res.blob();
                setTemplateBannerFile(new File([blob], "ai.jpg", {type:"image/jpeg"}));
            }
        } finally {
            setIsGeneratingBanner(false);
        }
    };

    const handleSaveTemplate = async () => {
        if(!newTemplate.message) return;
        setIsSavingTemplate(true);
        try {
            let url = newTemplate.bannerUrl;
            if(templateBannerFile) url = await uploadImage(templateBannerFile, 'templates');
            
            await saveInvitationTemplate({
                ceremonyId: ceremony.id, 
                ...newTemplate, 
                bannerUrl: url
            });
            
            setIsTemplateModalOpen(false);
            setNewTemplate({ type: 'General', message: '', bannerUrl: '', expirationDate: '' });
            setTemplateBannerFile(null);
            onRefresh();
            await showAlert("ជោគជ័យ", "រក្សាទុកគំរូធៀបការដោយជោគជ័យ។", "success");
        } catch (error: any) {
            await showAlert("បរាជ័យ", error.message || "មិនអាចរក្សាទុកបានឡើយ។", "danger");
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleDeleteTemplate = async (t: InvitationTemplate) => {
        const confirm = await showConfirm("លុបគំរូធៀបការ?", "តើអ្នកប្រាកដជាចង់លុបគំរូធៀបការនេះមែនទេ?", "danger");
        if (confirm) {
            try {
                await deleteInvitationTemplate(t.id);
                onRefresh();
                await showAlert("ជោគជ័យ", "បានលុបគំរូធៀបការដោយជោគជ័យ។", "success");
            } catch (error: any) {
                await showAlert("បរាជ័យ", error.message || "មិនអាចលុបបានឡើយ។", "danger");
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">គំរូលិខិតអញ្ជើញ</h3>
                <Button onClick={() => setIsTemplateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 border-transparent shadow-md"><Plus size={18} className="mr-2"/> បង្កើតគំរូថ្មី</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.length > 0 ? templates.map(t => (
                    <div key={t.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                        <div className="h-32 bg-slate-100 relative">
                            {t.bannerUrl ? (
                                <img src={t.bannerUrl} className="w-full h-full object-cover"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={32}/></div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDeleteTemplate(t)} className="p-1.5 bg-white/90 text-red-600 rounded-full shadow-sm hover:bg-red-50"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold uppercase">{t.type}</span>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-3 italic mb-3">"{t.message}"</p>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                <span className="text-xs text-slate-400">Expiration: {t.expirationDate || 'N/A'}</span>
                                <button 
                                    onClick={() => {
                                        const link = `${window.location.origin}/#/invitation/${ceremony.id}?type=${t.type}`;
                                        navigator.clipboard.writeText(link);
                                        showAlert("ចម្លងតំណ", "តំណភ្ជាប់ត្រូវបានចម្លង!", "success");
                                    }}
                                    className="text-xs font-bold text-blue-600 flex items-center hover:underline"
                                >
                                    <Share2 size={12} className="mr-1"/> ចម្លងតំណ
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <FileText size={32} className="mx-auto mb-3 text-slate-300"/>
                        <p className="text-slate-500 text-sm">មិនទាន់មានគំរូលិខិតទេ។</p>
                    </div>
                )}
            </div>

            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="បង្កើតគំរូលិខិត">
                <div className="space-y-4">
                    <Select label="សម្រាប់ប្រភេទភ្ញៀវ" options={[{value:'General',label:'General'}, {value:'VIP',label:'VIP'}, {value:'Family',label:'Family'}]} value={newTemplate.type} onChange={e => setNewTemplate({...newTemplate, type: e.target.value})} />
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-sm font-bold text-slate-700">សារក្នុងលិខិត</label>
                            <button onClick={handleGenerateTemplateMessage} className="text-xs text-blue-600 font-bold flex items-center hover:underline" disabled={isGeneratingMessage}>
                                {isGeneratingMessage ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1"/>} AI Write
                            </button>
                        </div>
                        <textarea className="w-full border rounded-lg p-3 text-sm" rows={4} value={newTemplate.message} onChange={e => setNewTemplate({...newTemplate, message: e.target.value})} />
                    </div>
                        <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-sm font-bold text-slate-700">Banner ពិសេស (Optional)</label>
                            <button onClick={handleGenerateTemplateBanner} className="text-xs text-blue-600 font-bold flex items-center hover:underline" disabled={isGeneratingBanner}>
                                {isGeneratingBanner ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1"/>} AI Generate
                            </button>
                        </div>
                        {(templateBannerFile || newTemplate.bannerUrl) && (
                            <img src={templateBannerFile ? URL.createObjectURL(templateBannerFile) : newTemplate.bannerUrl} className="w-full h-32 object-cover rounded-lg mb-2" />
                        )}
                        <input type="file" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) setTemplateBannerFile(e.target.files[0]); }} />
                    </div>
                    <Input label="ថ្ងៃផុតកំណត់ (Expiration)" type="date" value={newTemplate.expirationDate || ''} onChange={e => setNewTemplate({...newTemplate, expirationDate: e.target.value})} />
                    <Button className="w-full" onClick={handleSaveTemplate} isLoading={isSavingTemplate}>រក្សាទុក</Button>
                </div>
            </Modal>
        </div>
    );
};

export default OrganizerInvitations;
