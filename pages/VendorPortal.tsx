
import { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/authService';
import { getMyServices, createService, updateService, deleteService } from '../services/dataService';
import { generateServiceDescription, generateServicePhoto } from '../services/geminiService';
import { uploadImage, deleteImage } from '../services/storageService';
import { Service } from '../types';
import { Card, Button, Input, Modal, Pagination, Select } from '../components/UIComponents';
import { Plus, MapPin, Edit2, Trash2, Image as ImageIcon, Globe, Briefcase, Sparkles, Loader2, AlertCircle, Wand2 } from 'lucide-react';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';

const VendorPortal = () => {
    const user = getCurrentUser();
    const { showAlert, showConfirm } = useGlobalDialog();
    const [services, setServices] = useState<Service[]>([]);
    const [servicePage, setServicePage] = useState(1);
    const [totalServicePages, setTotalServicePages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentService, setCurrentService] = useState<Partial<Service>>({});
    const [imageFile, setImageFile] = useState<File | null>(null); 
    const [error, setError] = useState('');
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            refreshServices(servicePage);
        }
    }, [user, servicePage]);

    const refreshServices = async (page: number) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const res = await getMyServices(user.id, page, 9);
            setServices(res.data);
            setTotalServicePages(res.totalPages);
        } catch (e) {
            console.error("Failed to load services", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveService = async () => {
        setError('');
        if (!user) return;
        
        // Validation
        if (!currentService.name) {
            setError('សូមបញ្ចូលឈ្មោះសេវាកម្ម');
            return;
        }
        if (currentService.price === undefined || currentService.price === null || String(currentService.price) === '') {
            setError('សូមបញ្ចូលតម្លៃសេវាកម្ម');
            return;
        }
        
        setIsSaving(true);
        try {
            const type = currentService.locationType || 'FIXED';
            const locationVal = type === 'FIXED' ? (currentService.location || '') : '';
            const mapUrlVal = (type === 'FIXED' && currentService.mapUrl) ? currentService.mapUrl : '';
            
            // Image Upload Logic
            let imageUrlVal = currentService.imageUrl;
            
            if (imageFile) {
                // If editing and there is an old image, delete it
                if (isEditing && currentService.imageUrl) {
                    await deleteImage(currentService.imageUrl);
                }
                // Upload new image
                imageUrlVal = await uploadImage(imageFile, 'services');
            } else if (!imageUrlVal) {
                imageUrlVal = `https://picsum.photos/400/300?random=${Date.now()}`;
            }

            const servicePayload = {
                name: currentService.name,
                description: currentService.description || '',
                price: Number(currentService.price),
                priceNote: currentService.priceNote || '',
                location: locationVal,
                locationType: type,
                mapUrl: mapUrlVal || '',
                imageUrl: imageUrlVal,
                providerId: user.id,
                providerName: user.name,
                role: user.role
            };

            if (isEditing && currentService.id) {
                await updateService(currentService.id, servicePayload);
            } else {
                await createService(servicePayload);
            }
            
            setIsModalOpen(false);
            setCurrentService({});
            setImageFile(null);
            await refreshServices(servicePage);
        } catch (err: any) {
            console.error("Save Service Error:", err);
            setError('បរាជ័យក្នុងការរក្សាទុក៖ ' + (err.message || 'Unknown Error'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!currentService.name || !user) return;
        setIsGeneratingDesc(true);
        try {
            const desc = await generateServiceDescription(currentService.name, user.role);
            setCurrentService(prev => ({ ...prev, description: desc }));
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleGeneratePhoto = async () => {
        if (!currentService.name || !user) return;
        setIsGeneratingPhoto(true);
        try {
            const photoDataUrl = await generateServicePhoto(currentService.name, user.role);
            if (photoDataUrl) {
                // Convert Data URL to File object for upload logic consistency
                const response = await fetch(photoDataUrl);
                const blob = await response.blob();
                const file = new File([blob], `ai_service_${Date.now()}.jpg`, { type: "image/jpeg" });
                setImageFile(file);
                // Clear existing URL to force preview of the new AI file
                setCurrentService(prev => ({ ...prev, imageUrl: photoDataUrl }));
            }
        } catch (e: any) {
            showAlert("Error", "Failed to generate photo: " + e.message, "danger");
        } finally {
            setIsGeneratingPhoto(false);
        }
    };

    const handleDelete = async (service: Service) => {
        const confirmed = await showConfirm("បញ្ជាក់ការលុប", "តើអ្នកប្រាកដជាចង់លុបសេវាកម្មនេះមែនទេ?", "danger");
        if(confirmed) {
            try {
                if (service.imageUrl) {
                    await deleteImage(service.imageUrl);
                }
                await deleteService(service.id);
                refreshServices(servicePage);
            } catch (err: any) {
                await showAlert("បរាជ័យ", "លុបបរាជ័យ៖ " + err.message, "danger");
            }
        }
    }

    if (!user) return null;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 font-serif flex items-center gap-2">
                        <Briefcase className="text-rose-600"/> គ្រប់គ្រងសេវាកម្ម
                    </h1>
                    <p className="text-slate-500 mt-1">គ្រប់គ្រងសេវាកម្មដែលអ្នកផ្តល់ជូនអតិថិជន។</p>
                </div>
                <Button onClick={() => { setCurrentService({}); setImageFile(null); setError(''); setIsEditing(false); setIsModalOpen(true); }}>
                    <Plus size={20} className="mr-2"/> បន្ថែមសេវាកម្មថ្មី
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-rose-600"/></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map(service => (
                        <Card key={service.id} className="overflow-hidden group hover:shadow-lg transition-all" noPadding>
                            <div className="relative h-48 bg-slate-100">
                                <img src={service.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={service.name} />
                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-slate-700 shadow-sm flex flex-col items-end">
                                    <span>${service.price}</span>
                                    {service.priceNote && <span className="text-[9px] text-slate-400 font-normal">{service.priceNote}</span>}
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{service.name}</h3>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{service.description}</p>
                                <div className="space-y-2 text-sm text-slate-600 mb-6">
                                    {service.locationType === 'FLEXIBLE' ? (
                                        <div className="flex items-center text-emerald-600 font-medium"><Globe size={14} className="mr-2"/> សេវាកម្មចល័ត</div>
                                    ) : (
                                        <div className="flex items-center"><MapPin size={14} className="mr-2 text-rose-400"/> {service.location || 'ទីតាំងថេរ'}</div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 text-xs" onClick={() => { setCurrentService(service); setImageFile(null); setError(''); setIsEditing(true); setIsModalOpen(true); }}>
                                        <Edit2 size={14} className="mr-1"/> កែប្រែ
                                    </Button>
                                    <Button variant="secondary" className="text-red-600 hover:bg-red-50 border-red-100" onClick={() => handleDelete(service)}>
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {services.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Briefcase size={40} className="mx-auto mb-4 opacity-50"/>
                            មិនទាន់មានសេវាកម្មទេ។ សូមបន្ថែមថ្មី។
                        </div>
                    )}
                </div>
            )}
            
            <Pagination currentPage={servicePage} totalPages={totalServicePages} onPageChange={setServicePage} />

            {/* CREATE/EDIT MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? "កែប្រេសេវាកម្ម" : "បន្ថែមសេវាកម្មថ្មី"}>
                <div className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start">
                            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0"/>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <Input label="ឈ្មោះសេវាកម្ម" value={currentService.name || ''} onChange={e => setCurrentService({...currentService, name: e.target.value})} placeholder="ឧ. ចុងភៅ ពិសិដ្ឋ" required />
                    
                    <div className="grid grid-cols-2 gap-4">
                         <Input 
                            label="តម្លៃ ($)" 
                            type="number" 
                            value={currentService.price === undefined ? '' : currentService.price} 
                            onChange={e => setCurrentService({...currentService, price: e.target.value === '' ? undefined : Number(e.target.value)})} 
                            required
                         />
                         <Input 
                            label="សម្គាល់តម្លៃ (Price Note)" 
                            value={currentService.priceNote || ''} 
                            onChange={e => setCurrentService({...currentService, priceNote: e.target.value})} 
                            placeholder="ឧ. ក្នុងមួយតុ ឬ ចាប់ពី"
                         />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">ប្រភេទទីតាំង</label>
                        <Select 
                            options={[{value: 'FIXED', label: 'ទីតាំងថេរ'}, {value: 'FLEXIBLE', label: 'ចល័ត'}]}
                            value={currentService.locationType || 'FIXED'}
                            onChange={e => setCurrentService({...currentService, locationType: e.target.value as any})}
                        />
                    </div>

                    {currentService.locationType !== 'FLEXIBLE' && (
                        <>
                            <Input label="អាសយដ្ឋាន" value={currentService.location || ''} onChange={e => setCurrentService({...currentService, location: e.target.value})} />
                            <Input label="Google Maps URL" value={currentService.mapUrl || ''} onChange={e => setCurrentService({...currentService, mapUrl: e.target.value})} placeholder="https://maps.google.com..." />
                        </>
                    )}

                    {/* Image Upload & AI Photo Generation */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-sm font-bold text-slate-700">រូបភាពសេវាកម្ម</label>
                            <button 
                                onClick={handleGeneratePhoto} 
                                disabled={!currentService.name || isGeneratingPhoto}
                                className="text-xs text-rose-600 font-bold flex items-center hover:underline disabled:opacity-50"
                            >
                                {isGeneratingPhoto ? <Loader2 size={12} className="animate-spin mr-1"/> : <Wand2 size={12} className="mr-1"/>}
                                {isGeneratingPhoto ? 'Generating Photo...' : 'ប្រើ AI បង្កើតរូបភាព'}
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                            {(currentService.imageUrl || imageFile) && (
                                <div className="mb-3 relative w-full h-40 bg-white rounded-lg overflow-hidden border border-slate-100 shadow-inner">
                                    <img 
                                        src={imageFile ? URL.createObjectURL(imageFile) : currentService.imageUrl} 
                                        className="w-full h-full object-cover" 
                                        alt="Current" 
                                    />
                                    <button 
                                        onClick={() => { setImageFile(null); setCurrentService({...currentService, imageUrl: ''}); }}
                                        className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-slate-600 hover:text-red-600 shadow-sm"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            )}
                            {!imageFile && !currentService.imageUrl && (
                                <div className="py-6 flex flex-col items-center justify-center text-slate-400">
                                    <ImageIcon size={32} className="mb-2 opacity-20"/>
                                    <p className="text-[10px] uppercase font-bold tracking-wider">No photo selected</p>
                                </div>
                            )}
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                    if(e.target.files?.[0]) setImageFile(e.target.files[0]);
                                }}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">រូបភាពច្បាស់ជួយឱ្យអតិថិជនចាប់អារម្មណ៍កាន់តែខ្លាំង។</p>
                    </div>

                    <div>
                        <div className="flex justify-between mb-1.5">
                            <label className="block text-sm font-bold text-slate-700">ការពិពណ៌នា</label>
                            <button 
                                onClick={handleGenerateDescription} 
                                disabled={!currentService.name || isGeneratingDesc}
                                className="text-xs text-rose-600 font-bold flex items-center hover:underline disabled:opacity-50"
                            >
                                <Sparkles size={12} className="mr-1"/>
                                {isGeneratingDesc ? 'Generating...' : 'ប្រើ AI បង្កើតអោយ'}
                            </button>
                        </div>
                        <textarea 
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                            rows={4}
                            value={currentService.description || ''}
                            onChange={e => setCurrentService({...currentService, description: e.target.value})}
                            placeholder="បរិយាយអំពីសេវាកម្មរបស់អ្នក..."
                        />
                    </div>

                    <Button className="w-full mt-4" onClick={handleSaveService} isLoading={isSaving} disabled={isSaving}>
                        {isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកសេវាកម្ម'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default VendorPortal;
