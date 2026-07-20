
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getCeremonyById, addGuest, getInvitationTemplates } from '../services/dataService';
import { getCurrentUser } from '../services/authService';
import { generateGuestQr } from '../services/checkinService';
import { scanBusinessCard } from '../services/geminiService';
import { Ceremony, InvitationTemplate } from '../types';
import { Input, MarkdownRenderer } from '../components/UIComponents';
import { Calendar, MapPin, CheckCircle, Share2, Facebook, Link, Sparkles, Crown, AlertTriangle, Camera, Loader2, LogIn, ShieldAlert } from 'lucide-react';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';

const InvitationCard = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const guestTypeParam = searchParams.get('type');
  const navigate = useNavigate();
  const { showAlert } = useGlobalDialog();
  
  const user = getCurrentUser();
  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const [template, setTemplate] = useState<InvitationTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Guest Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryQr, setEntryQr] = useState<string | null>(null);
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);

  // Anti-Spam State (Math Challenge)
  const [mathChallenge, setMathChallenge] = useState({ num1: 0, num2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  useEffect(() => {
    generateMathChallenge();
    if (id) {
      setLoading(true);
      Promise.all([
        getCeremonyById(id),
        getInvitationTemplates(id)
      ]).then(([c, templates]) => {
        setCeremony(c);
        if (c) {
            let foundTemplate = null;
            if (guestTypeParam) {
                // Defensive check: templates might be undefined if API fails badly, though dataService fix handles it.
                foundTemplate = templates?.find(t => t.type === guestTypeParam);
                setTemplate(foundTemplate || null);
            }
            
            // Expiration Logic
            const today = new Date().toISOString().split('T')[0];
            const expDate = foundTemplate?.expirationDate || c.date;
            
            if (today > expDate) {
                setIsExpired(true);
            }
        }
        setLoading(false);
      }).catch(err => {
          console.error("Failed to load invitation data", err);
          setLoading(false);
      });
    } else {
        setLoading(false);
    }
  }, [id, guestTypeParam]);

  const generateMathChallenge = () => {
      setMathChallenge({
          num1: Math.floor(Math.random() * 10) + 1,
          num2: Math.floor(Math.random() * 10) + 1
      });
      setCaptchaAnswer('');
  };

  const handleRSVP = async () => {
    if (!ceremony) return;
    
    // Anti-Spam: Rate Limiting
    const lastSubmission = localStorage.getItem('last_rsvp_time');
    if (lastSubmission) {
        const timeDiff = Date.now() - parseInt(lastSubmission);
        if (timeDiff < 60000) { // 1 Minute block
            await showAlert("សូមរង់ចាំ", "សូមរង់ចាំមួយភ្លែតមុនពេលបញ្ជូនម្តងទៀត។", "warning");
            return;
        }
    }

    // Anti-Spam: Math Challenge (Only for guests)
    if (!user) {
        if (parseInt(captchaAnswer) !== (mathChallenge.num1 + mathChallenge.num2)) {
            await showAlert("ចម្លើយមិនត្រឹមត្រូវ", "ចម្លើយការពារស្ប៉ាមមិនត្រឹមត្រូវទេ។ សូមព្យាយាមម្តងទៀត។", "danger");
            generateMathChallenge();
            return;
        }
    }
    
    // Use logged in user name if available, otherwise input name
    const name = user ? user.name : guestName;
    
    if (!name) {
        await showAlert("ឈ្មោះ", "សូមបញ្ចូលឈ្មោះរបស់អ្នក", "warning");
        return;
    }

    setIsSubmitting(true);

    try {
        // Add Guest (Data Service handles Duplicate Checks now)
        const newGuest = await addGuest({
            ceremonyId: ceremony.id,
            name: name,
            phoneNumber: guestPhone,
            userId: user ? user.id : undefined,
            guestType: guestTypeParam || 'General'
        });

        setSubmitted(true);
        localStorage.setItem('last_rsvp_time', Date.now().toString());

        // Entry pass QR for ceremony-day check-in (best effort)
        generateGuestQr(String(newGuest.id), ceremony.id).then(setEntryQr).catch(() => {});

    } catch (error: any) {
        console.error("RSVP Error:", error);
        await showAlert("បរាជ័យ", error.message || "មានបញ្ហាបច្ចេកទេស។ សូមព្យាយាមម្តងទៀត។", "danger");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleScanCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsScanning(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = reader.result as string;
              const result = await scanBusinessCard(base64);
              if (result) {
                  if (result.name) setGuestName(result.name);
                  if (result.phoneNumber) setGuestPhone(result.phoneNumber);
              } else {
                  await showAlert("ស្កេនបរាជ័យ", "មិនអាចស្កេនបាន។ សូមព្យាយាមម្តងទៀត ឬបញ្ចូលទិន្នន័យដោយដៃ។", "warning");
              }
              setIsScanning(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const copyToClipboard = async (text: string) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
              await navigator.clipboard.writeText(text);
              await showAlert("ជោគជ័យ", "តំណភ្ជាប់ត្រូវបានចម្លង!", "success");
              return;
          } catch (err) {
              // Fallback handled below
          }
      }

      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) await showAlert("ជោគជ័យ", "តំណភ្ជាប់ត្រូវបានចម្លង!", "success");
      } catch (e) {
          prompt("សូមចម្លងតំណភ្ជាប់ខាងក្រោម៖", text);
      }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        await navigator.share({
            title: ceremony?.title || 'Invitation',
            text: `សូមអញ្ជើញចូលរួម ${ceremony?.title || 'ពិធី'}`,
            url: url
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
             await copyToClipboard(url);
        }
      }
    } else {
      await copyToClipboard(url);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-serif text-slate-500">កំពុងរៀបចំ...</div>;
  if (!ceremony) return <div className="min-h-screen flex items-center justify-center font-serif text-slate-500">រកមិនឃើញកម្មវិធីនេះទេ។</div>;

  const themeColor = ceremony.themeColor || '#e11d48';
  
  // Use template specific data if available, otherwise default to ceremony data
  const bannerUrl = template?.bannerUrl || ceremony.bannerUrl;
  const invitationMessage = template?.message || ceremony.invitationMessage;
  const expirationDate = template?.expirationDate || ceremony.date;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full relative">
        {/* Envelope effect background */}
        <div className="absolute top-4 left-4 right-4 bottom-0 bg-white rounded-3xl shadow-xl rotate-1 opacity-50 transform scale-95 z-0"></div>
        <div className="absolute top-2 left-2 right-2 bottom-2 bg-white rounded-3xl shadow-xl -rotate-1 opacity-70 transform scale-98 z-0"></div>
        
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-slate-100">
            {/* Decorative Header */}
            <div className="h-64 relative flex flex-col items-center justify-center overflow-hidden">
                {bannerUrl ? (
                    <>
                        <img src={bannerUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40"></div>
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0" style={{ backgroundColor: themeColor }}></div>
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cubes.png')` }}></div>
                        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>
                        <div className="absolute -top-16 -right-16 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
                    </>
                )}
                
                {guestTypeParam && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 text-white text-xs font-bold uppercase tracking-widest flex items-center shadow-lg z-20">
                         {guestTypeParam === 'VIP' && <Crown size={12} className="mr-1 text-amber-300 fill-current"/>}
                         {guestTypeParam}
                    </div>
                )}
                
                {!user && (
                    <button 
                        onClick={() => navigate('/login')}
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-full text-white transition-colors z-20 flex items-center gap-2 px-3"
                    >
                        <span className="text-xs font-bold">ចូលគណនី</span>
                        <LogIn size={16} />
                    </button>
                )}

                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-white/30 shadow-lg relative z-10">
                    <Sparkles className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white relative z-10 text-center px-4 font-serif tracking-wide drop-shadow-sm">លិខិតអញ្ជើញ</h1>
            </div>

            <div className="px-8 pb-8 -mt-8 relative z-20">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-50 text-center">
                    <p className="text-slate-400 text-sm mb-4 font-medium uppercase tracking-widest">
                        {user ? `ជំរាបសួរ ${user.name}` : "ជំរាបសួរ ភ្ញៀវកិត្តិយស"}
                    </p>
                    <h2 className="text-3xl font-bold text-slate-900 mb-6 font-serif leading-tight">{ceremony.title}</h2>
                    
                    <div className="w-16 h-1 bg-slate-100 mx-auto mb-6 rounded-full"></div>

                    <div className="text-slate-600 leading-loose mb-8 font-light italic text-lg">
                        <MarkdownRenderer content={`"${invitationMessage || 'យើងខ្ញុំមានកិត្តិយសសូមអញ្ជើញឯកឧត្តម លោកជំទាវ លោក លោកស្រី នាងកញ្ញា ចូលរួមជាភ្ញៀវកិត្តិយសក្នុងកម្មវិធីរបស់យើងខ្ញុំ។'}"`} className="text-center" />
                    </div>
                    
                    <div className="space-y-4 text-slate-700 bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
                        <div className="flex items-center justify-center space-x-3">
                            <Calendar className="w-5 h-5 text-rose-500" />
                            <span className="font-medium text-lg">{ceremony.date}</span>
                        </div>
                        {ceremony.location && (
                            <div className="flex items-center justify-center space-x-3 text-center">
                                <MapPin className="w-5 h-5 text-rose-500 flex-shrink-0" />
                                <span className="font-medium">{ceremony.location}</span>
                            </div>
                        )}
                        <div className="text-xs text-slate-400 mt-2 border-t border-slate-200 pt-2">
                             ផុតកំណត់: {expirationDate}
                        </div>
                    </div>

                    {/* RSVP Section */}
                    {isExpired ? (
                        <div className="text-red-600 bg-red-50 p-6 rounded-xl flex items-center justify-center flex-col border border-red-100 animate-in zoom-in duration-300">
                             <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <p className="font-bold text-lg font-serif">ការអញ្ជើញបានផុតកំណត់ហើយ</p>
                            <p className="text-sm mt-1">សូមទាក់ទងម្ចាស់កម្មវិធីដោយផ្ទាល់។</p>
                        </div>
                    ) : (
                        !submitted ? (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                                {!user && (
                                    <>
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-slate-100"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs">
                                                <span className="px-2 bg-white text-slate-400">បញ្ចូលព័ត៌មាន ឬ ស្កេននាមប័ណ្ណ</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-rose-300 bg-rose-50 text-rose-700 font-bold text-sm cursor-pointer hover:bg-rose-100 transition-colors ${isScanning ? 'opacity-70 cursor-wait' : ''}`}>
                                                {isScanning ? <Loader2 size={16} className="animate-spin"/> : <Camera size={16}/>}
                                                {isScanning ? 'កំពុងស្កេន...' : 'ស្កេននាមប័ណ្ណ'}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleScanCard} disabled={isScanning} />
                                            </label>
                                        </div>

                                        <Input placeholder="ឈ្មោះរបស់អ្នក" value={guestName} onChange={e => setGuestName(e.target.value)} className="text-center bg-white border-slate-200 focus:border-rose-300 focus:ring-rose-200" />
                                        <Input placeholder="លេខទូរស័ព្ទ (តាមការចង់បាន)" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="text-center bg-white border-slate-200 focus:border-rose-300 focus:ring-rose-200" />
                                        
                                        {/* Anti-Spam Challenge */}
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                                            <div className="flex items-center text-slate-500 text-sm font-bold">
                                                <ShieldAlert size={16} className="mr-2 text-rose-500"/>
                                                សំណួរការពារ: {mathChallenge.num1} + {mathChallenge.num2} = ?
                                            </div>
                                            <input 
                                                type="number" 
                                                className="w-16 px-2 py-1 text-center rounded-lg border border-slate-200 focus:border-rose-300 outline-none"
                                                value={captchaAnswer}
                                                onChange={e => setCaptchaAnswer(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}
                                
                                <button 
                                    onClick={handleRSVP}
                                    disabled={isSubmitting || (!user && !captchaAnswer)}
                                    className="w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-rose-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                                    {user ? 'យល់ព្រមចូលរួម' : 'បញ្ជាក់ការចូលរួម'}
                                </button>
                                
                                {!user && (
                                    <p className="text-xs text-slate-400">
                                        ជាម្ចាស់កម្មវិធី ឬមានគណនី? <button onClick={() => navigate('/login')} className="text-rose-500 hover:underline font-bold">ចូលគណនី</button>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="text-emerald-700 bg-emerald-50 p-6 rounded-xl flex items-center justify-center flex-col border border-emerald-100 animate-in zoom-in duration-300">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                                </div>
                                <p className="font-bold text-lg font-serif">អរគុណ! ការចូលរួមត្រូវបានកត់ត្រា។</p>

                                {entryQr && (
                                    <div className="mt-5 pt-5 border-t border-emerald-100 w-full flex flex-col items-center">
                                        <p className="text-sm font-bold text-slate-700 mb-3">សំបុត្រចូលរបស់អ្នក</p>
                                        <img src={entryQr} alt="Entry QR" className="w-44 h-44 bg-white p-2 rounded-xl border border-slate-200 shadow-sm" />
                                        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                            សូមថតរូបអេក្រង់ (screenshot) ទុក ហើយបង្ហាញ QR នេះនៅច្រកចូលកម្មវិធី។
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Footer / Share */}
            <div className="bg-slate-50/80 p-6 flex justify-center space-x-6 border-t border-slate-100 backdrop-blur-sm">
                <button onClick={handleShare} className="p-3 text-slate-500 hover:text-blue-600 hover:bg-white hover:shadow-md rounded-full transition-all duration-200" title="ចែករំលែក">
                    <Share2 size={24} />
                </button>
                <button className="p-3 text-slate-500 hover:text-blue-600 hover:bg-white hover:shadow-md rounded-full transition-all duration-200" title="Facebook">
                    <Facebook size={24} />
                </button>
                <button onClick={() => copyToClipboard(window.location.href)} className="p-3 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-md rounded-full transition-all duration-200" title="ចម្លងតំណ">
                    <Link size={24} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationCard;
