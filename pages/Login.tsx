import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { isSupabaseConfigured, supabaseCallbackUrl } from '../services/supabaseConfig';
import { Logo } from '../components/Logo';
import {
  BookOpen,
  AlertCircle,
  Send,
  Loader2,
  Check
} from 'lucide-react';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setSupabaseConnected(isSupabaseConfigured);
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      let errDesc = url.searchParams.get('error_description') || url.searchParams.get('error');

      if (!errDesc && window.location.hash.includes('error')) {
        const frag = window.location.hash.replace(/^#\/?/, '');
        const fragParams = new URLSearchParams(frag);
        errDesc = fragParams.get('error_description') || fragParams.get('error');
      }

      if (errDesc) {
        const msg = decodeURIComponent(errDesc.replace(/\+/g, ' '));
        let friendly = 'Google sign-in failed: ' + msg;
        if (/org_internal|access.?blocked|not.*allowed/i.test(msg)) {
          friendly += " — សូមកែ OAuth Consent Screen ទៅ 'External' នៅក្នុង Google Cloud Console។";
        }
        setErrorMsg(friendly);

        const cleanHash = window.location.hash && window.location.hash.startsWith('#/') ? window.location.hash : '#/login';
        window.history.replaceState({}, document.title, url.origin + url.pathname + cleanHash);
      }
    } catch {
      /* no-op */
    }
  }, []);

  const handleGoogleLogin = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
          await loginUser();
      } catch (error: any) {
          console.error(error);
          setErrorMsg("ការចូលប្រើប្រាស់បរាជ័យ។ (Google sign-in failed: " + (error.message || "Unknown error") + ")");
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">

        {/* LEFT SIDE: Brand Visual (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop"
                    alt="Ceremony Background"
                    className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rose-950/90 via-rose-900/50 to-slate-900/40 mix-blend-multiply" />
            </div>

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
                    <p>&copy; 2026 PITHI Platform.</p>
                    <p className="tracking-wide">Community License v1.02</p>
                </div>
            </div>
        </div>

        {/* RIGHT SIDE: Login */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 relative bg-white overflow-y-auto max-h-screen">
            <div className="w-full max-w-md space-y-8 animate-fade-in">

                {/* LOGO */}
                <div className="flex justify-center">
                    <Logo variant="full-vertical" size="lg" withBackground={true} className="pb-1" />
                </div>

                {/* Welcome text */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
                        សូមស្វាគមន៍មកកាន់ Pithi
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        សូមចូលគណនីជាមួយ Google ដើម្បីបន្ត
                    </p>
                    <p className="text-xs text-slate-400">
                        Sign in with your Google account to continue
                    </p>
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

                {/* GOOGLE LOGIN BUTTON */}
                <div className="space-y-3">
                    {supabaseConnected ? (
                        <button
                            onClick={handleGoogleLogin}
                            className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-6 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 size={20} className="animate-spin text-slate-500"/>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span>ចូលគណនីជាមួយ Google</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="w-full p-3.5 border border-dashed border-amber-300 rounded-xl text-xs text-amber-800 bg-amber-50 space-y-1.5 text-left">
                            <p className="font-bold flex items-center gap-2">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                Supabase is not configured
                            </p>
                            <p className="leading-relaxed">
                                Copy <code className="font-mono font-bold">.env.example</code> to{' '}
                                <code className="font-mono font-bold">.env.local</code>, set{' '}
                                <code className="font-mono font-bold">VITE_SUPABASE_URL</code> and{' '}
                                <code className="font-mono font-bold">VITE_SUPABASE_ANON_KEY</code>, then restart
                                the dev server.
                            </p>
                        </div>
                    )}
                </div>

                {/* Troubleshooting help (collapsed by default) */}
                <details className="text-center">
                    <summary className="text-[11px] text-rose-600 hover:text-rose-700 font-bold cursor-pointer transition-colors">
                        ជួបបញ្ហាជាមួយ Google Sign-In? (Having issues?)
                    </summary>
                    <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-700 space-y-2.5 animate-fade-in font-medium">
                        <p className="font-bold text-slate-900 border-b pb-1">របៀបដោះស្រាយបញ្ហា Google Sign-In 403:</p>
                        <p className="text-[11px] leading-relaxed text-slate-600">
                            បញ្ហា <strong>"Access blocked: org_internal" (Error 403)</strong> កើតឡើងដោយសារ OAuth Consent Screen កំណត់ជា <strong>Internal</strong>។
                        </p>
                        <ol className="list-decimal pl-4 space-y-2 text-[11px] leading-relaxed text-slate-600">
                            <li>ចូលទៅកាន់ <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Google Cloud Console</a> ហើយជ្រើសរើស Project។</li>
                            <li>ទៅកាន់ <strong>APIs & Services</strong> &gt; <strong>OAuth consent screen</strong>។</li>
                            <li>ចុច <strong>"MAKE EXTERNAL"</strong> ដើម្បីអនុញ្ញាតឱ្យគណនី @gmail.com អាចចូលប្រើបាន។</li>
                            <li>បន្ថែមអ៊ីមែលរបស់អ្នកទៅក្នុងបញ្ជី <strong>Test users</strong> បើស្ថិតក្នុងទម្រង់ Testing។</li>
                        </ol>
                        <div className="pt-1.5 border-t text-[10px] text-slate-500 leading-relaxed italic">
                            *សូមប្រាកដថា Authorized Redirect URI ត្រូវគ្នាជាមួយ Supabase Callback URL: <code className="bg-slate-150 p-0.5 rounded font-mono break-all font-bold">{supabaseCallbackUrl || 'https://<your-project-ref>.supabase.co/auth/v1/callback'}</code>
                        </div>
                    </div>
                </details>

                {/* Footer Links */}
                <div className="pt-4 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-wider flex-wrap justify-center">
                        <Link to="/guide" className="hover:text-rose-600 transition-colors flex items-center gap-1.5">
                            <BookOpen size={12}/> សៀវភៅណែនាំ
                        </Link>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <a href="https://t.me/pithisupport" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors flex items-center gap-1.5">
                            <Send size={12} className="-rotate-12"/> Telegram Support
                        </a>
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
