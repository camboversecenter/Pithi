import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loginUser, loginWithEmailAndPassword, registerWithEmailAndPassword, simulateGoogleLogin } from '../services/authService';
import { supabase } from '../services/supabaseConfig';
import { Logo } from '../components/Logo';
import { 
  Shield, 
  BookOpen, 
  AlertCircle, 
  Info, 
  Send, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Loader2, 
  KeyRound,
  Check,
  Sparkles
} from 'lucide-react';

const Login = () => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleHelp, setShowGoogleHelp] = useState(true);

  // Google Simulator states
  const [useSimulator, setUseSimulator] = useState(true);
  const [simulatorEmail, setSimulatorEmail] = useState('pithi.deva@gmail.com');
  const [simulatorName, setSimulatorName] = useState('Pithi Deva');

  useEffect(() => {
    if (supabase) {
        setSupabaseConnected(true);
    } 
  }, []);

  const handleOAuthLogin = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
          // Trigger Google OAuth via Supabase
          await loginUser();
      } catch (error: any) {
          console.error(error);
          setErrorMsg("ការចូលប្រើប្រាស់បរាជ័យ។ (Google sign-in failed: " + (error.message || "Unknown error") + ")");
      } finally {
          setIsLoading(false);
      }
  };

  const handleSimulatedOAuthLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!simulatorEmail) {
          setErrorMsg("សូមបញ្ចូលអ៊ីមែល Google! (Please enter a Google email!)");
          return;
      }
      setIsLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
          const res = await simulateGoogleLogin(simulatorEmail, simulatorName);
          if (res.status === 'SUCCESS') {
              setSuccessMsg("ចូលប្រើគណនី Google ក្លែងធ្វើទទួលបានជោគជ័យ! (Simulated Google login successful!)");
          } else {
              setSuccessMsg("គណនី Google ថ្មី! សូមជ្រើសរើសតួនាទីរបស់អ្នក។ (New Google account! Please select your role.)");
          }
      } catch (error: any) {
          console.error(error);
          setErrorMsg("ការចូលក្លែងធ្វើបរាជ័យ៖ " + (error.message || "Unknown error"));
      } finally {
          setIsLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("សូមបំពេញអ៊ីមែល និងលេខសម្ងាត់! (Please fill in email and password!)");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (activeTab === 'signin') {
        await loginWithEmailAndPassword(email, password);
        setSuccessMsg("ការចូលគណនីទទួលបានជោគជ័យ! (Success!)");
      } else {
        if (!name) {
          setErrorMsg("សូមបំពេញឈ្មោះពេញ! (Please enter your name!)");
          setIsLoading(false);
          return;
        }
        await registerWithEmailAndPassword(email, password, name);
        setSuccessMsg("គណនីត្រូវបានបង្កើត! សូមពិនិត្យអ៊ីមែលរបស់អ្នកដើម្បីបញ្ជាក់បើត្រូវការ ឬចូលគណនីបានភ្លាមៗ។ (Account created successfully! Please review or log in.)");
        // Clear name and switch to sign in
        setName('');
        setActiveTab('signin');
      }
    } catch (error: any) {
      console.error(error);
      let errMsg = error.message || "Unknown error";
      if (errMsg.includes("Invalid login credentials")) {
        errMsg = "អ៊ីមែល ឬលេខសម្ងាត់មិនត្រឹមត្រូវទេ! (Invalid email or password!)";
      } else if (errMsg.includes("User already registered") || errMsg.includes("already registered")) {
        errMsg = "អ៊ីមែលនេះមានគណនីរួចហើយ! (Email is already registered!)";
      } else if (errMsg.includes("password should be")) {
        errMsg = "លេខសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់៦ខ្ទង់! (Password must be at least 6 characters!)";
      }
      setErrorMsg(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogin = async (testEmail: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await loginWithEmailAndPassword(testEmail, 'password123');
      setSuccessMsg("ចូលប្រើគណនីសាកល្បងដោយជោគជ័យ! (Test login successful!)");
    } catch (error: any) {
      console.error(error);
      setErrorMsg("ការចូលប្រើសាកល្បងបរាជ័យ៖ " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const testAccounts = [
    { email: 'pithi.deva@gmail.com', role: 'ADMIN', label: 'Admin (គ្រប់គ្រងប្រព័ន្ធ)', color: 'border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100' },
    { email: 'organizer@pithi.com', role: 'ORGANIZER', label: 'Organizer (អ្នករៀបចំ)', color: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100' },
    { email: 'client@pithi.com', role: 'GENERAL_USER', label: 'Owner (ម្ចាស់កម្មវិធី)', color: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
    { email: 'chef@pithi.com', role: 'CHEF', label: 'Chef (សេវាម្ហូបអាហារ)', color: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100' },
    { email: 'hall@pithi.com', role: 'HALL', label: 'Hall (សាលប្រជុំ/ទីតាំង)', color: 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
    { email: 'music@pithi.com', role: 'MUSIC_BAND', label: 'Music (ក្រុមតន្ត្រី)', color: 'border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100' },
    { email: 'beauty@pithi.com', role: 'BEAUTY_SALON', label: 'Beauty (សម្អាងការ)', color: 'border-pink-100 bg-pink-50 text-pink-700 hover:bg-pink-100' }
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
        
        {/* LEFT SIDE: Brand Visual (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop" 
                    alt="Ceremony Background" 
                    className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-950/90 via-rose-900/50 to-slate-900/40 mix-blend-multiply" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-between h-full p-16 text-white w-full">
                <div className="flex items-center gap-3 opacity-95">
                    <Logo variant="icon" size="sm" />
                    <span className="font-extrabold text-xl tracking-[0.14em] font-serif text-amber-100" style={{ fontFamily: "'Libre Baskerville', serif" }}>DEVA PITHI</span>
                </div>

                <div className="max-w-xl font-sans">
                    <h2 className="text-5xl font-serif font-bold leading-tight mb-6 text-white tracking-tight">
                        រៀបចំពិធីដ៏មានន័យ<br/>ជាមួយភាពងាយស្រួល
                    </h2>
                    <div className="h-1.5 w-20 bg-amber-500 mb-6 rounded-full"></div>
                    <p className="text-amber-55/90 text-lg leading-relaxed font-light">
                      រៀបចំពិធីមង្គលការ បុណ្យខួបកំណើត ឬព្រឹត្តិការណ៍នានាប្រកបដោយជំនាញ។ ភ្ជាប់ទំនាក់ទំនងរវាងអ្នករៀបចំកម្មវិធី ម្ចាស់ពិធី និងអ្នកផ្តល់សេវាកម្មដ៏ល្អបំផុតនៅក្នុងប្រទេសកម្ពុជា។
                    </p>
                    <p className="text-rose-200/70 text-sm mt-4 font-light italic">
                      Craft unforgettable moments with PITHI. The comprehensive platform connecting organizers, owners, and vendors for seamless event planning in Cambodia.
                    </p>
                </div>

                <div className="flex justify-between items-end text-xs text-rose-200/50 font-medium">
                    <p>© 2026 PITHI Platform.</p>
                    <p className="tracking-wide">Community License v1.02</p>
                </div>
            </div>
        </div>

        {/* RIGHT SIDE: Login / Sign Up Form */}
        <div className="flex-1 flex flex-col items-center justify-start p-6 sm:p-12 lg:p-16 lg:pt-12 pt-8 relative bg-white overflow-y-auto max-h-screen">
            <div className="w-full max-w-md space-y-6 animate-fade-in pr-1">
                
                {/* LOGO TEXT HEADER */}
                <div className="pt-4 flex justify-center">
                    <Logo variant="full-vertical" size="lg" withBackground={true} className="pb-1" />
                </div>

                {/* Banner Status */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                        <Info size={11}/>
                        <span>Public Interactive Test • សាកល្បងជាសាធារណៈ</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      សូមជ្រើសរើស <strong>គណនីសាកល្បង (Test Account)</strong> ខាងក្រោម ដើម្បីចូលមើលតួនាទីផ្សេងៗគ្នាភ្លាមៗ!
                    </p>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => { setActiveTab('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-850'}`}
                  >
                    ចូលគណនី (Sign In)
                  </button>
                  <button
                    onClick={() => { setActiveTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-850'}`}
                  >
                    បង្កើតគណនី (Sign Up)
                  </button>
                </div>

                {/* Notification banners */}
                {errorMsg && (
                    <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-650 flex items-start animate-fade-in">
                        <AlertCircle size={16} className="mr-2.5 flex-shrink-0 mt-0.5"/>
                        <span className="font-semibold leading-relaxed">{errorMsg}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 flex items-start animate-fade-in">
                        <Check size={16} className="mr-2.5 flex-shrink-0 mt-0.5 bg-emerald-100 rounded-full p-0.5 text-emerald-800"/>
                        <span className="font-semibold leading-relaxed">{successMsg}</span>
                    </div>
                )}

                {/* CORE EMAIL LOGIN FORM */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {activeTab === 'signup' && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="text-xs font-bold text-slate-700 block">ឈ្មោះពេញ (Full Name)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="ឧ. សុភ័ក្រ្ត ទេវី"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all font-medium"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">អ៊ីមែល (Email address)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail size={16} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@pithi.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 block">លេខសម្ងាត់ (Password)</label>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin text-white"/>
                    ) : (
                      activeTab === 'signin' ? 'ចូលគណនី (Sign In)' : 'បង្កើតគណនី (Sign Up)'
                    )}
                  </button>
                </form>

                {/* OR CONTINUED LINE */}
                <div className="relative flex items-center justify-center py-2">
                    <div className="absolute w-full border-t border-slate-100"></div>
                    <span className="relative px-3 bg-white text-[10px] text-slate-400 font-bold uppercase tracking-wider">ឬបន្តជាមួយ (Or continue with)</span>
                </div>

                {/* SOCIAL GOOGLE BUTTON */}
                <div className="space-y-3 font-sans">
                    {useSimulator ? (
                        <form onSubmit={handleSimulatedOAuthLogin} className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3 animate-fade-in text-xs font-semibold text-slate-700">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-amber-900 flex items-center gap-1">
                                    <Sparkles size={13} className="text-amber-600 animate-pulse" /> Google Consent Bypass Simulator
                                </span>
                                <button 
                                    type="button" 
                                    onClick={() => setUseSimulator(false)} 
                                    className="text-[10px] text-slate-500 hover:text-slate-800 underline font-bold"
                                >
                                    Use Real OAuth
                                </button>
                            </div>
                            <p className="text-[10.5px] leading-relaxed text-slate-600">
                                ដោះស្រាយបញ្ហាគណនី Google 403 ភ្លាមៗ! បញ្ចូលឈ្មោះ និង អ៊ីមែល Google របស់អ្នកដើម្បីកែតម្រូវ និងសាកល្បងដោយជោគជ័យ។ (Bypass the Google 403 error instantly by entering details below)
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-slate-500 block">Google Name (ឈ្មោះ)</label>
                                    <input 
                                        type="text"
                                        required
                                        value={simulatorName}
                                        onChange={(e) => setSimulatorName(e.target.value)}
                                        placeholder="ឈ្មោះពេញរបស់អ្នក"
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-slate-500 block">Google Email (អ៊ីមែល)</label>
                                    <input 
                                        type="email"
                                        required
                                        value={simulatorEmail}
                                        onChange={(e) => setSimulatorEmail(e.target.value)}
                                        placeholder="yourname@gmail.com"
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <>សាកល្បងចូលគណនី Google (Login with simulator)</>}
                            </button>
                        </form>
                    ) : (
                        supabaseConnected ? (
                            <div className="space-y-2">
                                <button 
                                    onClick={handleOAuthLogin}
                                    className="group relative w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-6 rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm text-xs"
                                    disabled={isLoading}
                                >
                                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 group-hover:scale-110 transition-transform"/>
                                    <span>ចូលជាមួយ Google (Log In with Google)</span>
                                    {isLoading && <div className="absolute right-4 w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setUseSimulator(true)}
                                    className="w-full py-1.5 bg-amber-50 border border-dashed border-amber-200 hover:bg-amber-100/50 hover:border-amber-300 rounded-xl flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-800 text-[10px] font-black tracking-wide uppercase transition-all"
                                >
                                    <Sparkles size={11} className="text-amber-500" />
                                    <span>មានបញ្ហា 403? ក្លែងចូល Google (Use Google Login Simulator)</span>
                                </button>
                            </div>
                        ) : (
                            <div className="w-full py-3 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs bg-slate-50">
                                Connecting to Service...
                            </div>
                        )
                    )}

                    <div className="text-center pt-1">
                        <button 
                            type="button"
                            onClick={() => setShowGoogleHelp(!showGoogleHelp)}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline transition-colors"
                        >
                            ជួបបញ្ហាជាមួយ Google Sign-In? (Having issues with Google Sign-In?)
                        </button>
                    </div>

                    {showGoogleHelp && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-700 space-y-2.5 animate-fade-in font-medium">
                            <p className="font-bold text-slate-900 border-b pb-1">របៀបដោះស្រាយបញ្ហា Google Sign-In 403 (Troubleshooting Guide):</p>
                            <p className="text-[11px] leading-relaxed text-slate-600">
                                បញ្ហា <strong>"Access blocked: Pithi can only be used within its organization" (Error 403: org_internal)</strong> កើតឡើងដោយសារស្ថិតិកម្រិតគម្រោង Google Cloud របស់លោកអ្នកកំណត់ជា <strong>Internal</strong>។
                            </p>
                            <p className="font-semibold text-slate-800">សូមអនុវត្តតាមជំហានខាងក្រោមដើម្បីកែសម្រួល៖</p>
                            <ol className="list-decimal pl-4 space-y-2 text-[11px] leading-relaxed text-slate-600">
                                <li>ចូលទៅកាន់ <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Google Cloud Console</a> ហើយជ្រើសរើស Project របស់អ្នក។</li>
                                <li>ទៅកាន់ម៉ឺនុយ <strong>APIs & Services</strong> &gt; <strong>OAuth consent screen</strong>។</li>
                                <li>នៅក្រោមផ្នែក <strong>User Type</strong> សូមចុចលើពាក្យ <strong>"MAKE EXTERNAL"</strong> ដើម្បីអនុញ្ញាតឱ្យគណនីជុំវិញពិភពលោក (@gmail.com) អាចចូលប្រើបាន។</li>
                                <li>ប្រសិនបើស្ថិតិជា <strong>Testing</strong> សូមបន្ថែមអ៊ីមែលរបស់អ្នក (ឧ. <code className="bg-slate-200 px-1 rounded text-rose-700 font-bold">pithi.deva@gmail.com</code>) ទៅក្នុងបញ្ជី <strong>Test users</strong>។</li>
                            </ol>
                            <div className="pt-1.5 border-t text-[10px] text-slate-500 leading-relaxed italic">
                                *កំណត់ចំណាំ៖ សូមប្រាកដថាបានបំពេញ Authorized Redirect URI នៅក្នុង Google Cloud Console ឱ្យត្រូវគ្នាជាមួយ Supabase Callback URL របស់គម្រោងអ្នក (ឧ. <code className="bg-slate-150 p-0.5 rounded font-mono break-all font-bold">https://fioumbuhowumfjptjzfy.supabase.co/auth/v1/callback</code>)។
                            </div>
                        </div>
                    )}
                </div>

                {/* PRE-SEEDED TEST CREDENTIAL PANEL */}
                <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 uppercase tracking-widest mb-3">
                        <KeyRound size={14}/>
                        <span>គណនីសាកល្បងរហ័ស (Quick Testing Accounts)</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {testAccounts.map((account) => (
                        <button
                          key={account.email}
                          type="button"
                          onClick={() => handleTestLogin(account.email)}
                          disabled={isLoading}
                          className={`p-2 border rounded-xl text-left transition-all ${account.color} disabled:opacity-50 flex flex-col justify-between h-14`}
                        >
                          <span className="text-[10px] font-black truncate leading-tight">{account.label}</span>
                          <span className="text-[9px] opacity-80 font-mono truncate">{account.email}</span>
                        </button>
                      ))}
                    </div>
                    
                    <div className="mt-2.5 text-[10px] font-medium text-slate-400 leading-normal bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">ចំណាំ (Note):</span>
                      <span>លេខសម្ងាត់សម្រាប់គណនីសាកល្បងទាំងអស់ខាងលើគឺ៖ <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded">password123</span></span>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="pt-4 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-wider flex-wrap justify-center">
                        <Link to="/guide" className="hover:text-rose-600 transition-colors flex items-center gap-1.5">
                            <BookOpen size={12}/> សៀវភៅណែនាំ
                        </Link>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <a href="https://t.me/+DBOU-zZhP_lkNTg9" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors flex items-center gap-1.5">
                            <Send size={12} className="-rotate-12"/> Telegram Support
                        </a>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <Link to="/community-license" className="hover:text-rose-600 transition-colors flex items-center gap-1.5">
                            <Shield size={12}/> អាជ្ញាប័ណ្ណ
                        </Link>
                    </div>
                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                        Ver 1.02 (Preview Built)
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Login;
