import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect if already installed/standalone display mode
    const isRunningStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;
    
    setIsStandalone(isRunningStandalone);

    // 2. Identify if iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafariBrowser = /safari/.test(userAgent) && !/crios|fxios|chrome|opera|edge/.test(userAgent);
    setIsIOS(isIosDevice && isSafariBrowser);

    // 3. Capture beforeinstallprompt event for Chromium browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show after a couple of seconds to not annoy the user immediately
      setTimeout(() => {
        if (!isRunningStandalone) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt for iOS users if they are not already standalone and we are visiting first time
    if (isIosDevice && isSafariBrowser && !isRunningStandalone) {
      const iosPromptDismissed = localStorage.getItem('pwa-ios-prompt-dismissed');
      if (!iosPromptDismissed) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 4000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the native browser install dialog
    await deferredPrompt.prompt();
    
    // Wait for the user's choice
    const choiceResult = await deferredPrompt.userChoice;
    console.log(`User choice outcome: ${choiceResult.outcome}`);
    
    // Clear prompt state
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('pwa-ios-prompt-dismissed', 'true');
    }
  };

  // Do not render anything if already installed
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] p-4 z-[100] animate-in fade-in slide-in-from-bottom duration-300">
      <button 
        onClick={handleDismiss} 
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Close prompt"
      >
        <X size={18} />
      </button>

      <div className="flex gap-4 items-start pr-6">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
          <Download className="text-rose-600" size={24} />
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-800">
            ដំឡើងកម្មវិធី ពិធី - PITHI
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {isIOS 
              ? "ដំឡើងលើទូរស័ព្ទដៃរបស់អ្នក ដើម្បីប្រើប្រាស់មុខងារពេញលេញ ទោះគ្មានអ៊ីនធឺណិត។"
              : "ដំឡើងលើអេក្រង់ដើមរបស់អ្នក ដើម្បីភាពរហ័សទាន់ចិត្ត និងទិន្នន័យសុវត្ថិភាព។"
            }
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        {isIOS ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50/70 border border-rose-100/50 rounded-lg py-2 px-3 w-full">
            <Share size={14} className="text-rose-600 flex-shrink-0" />
            <span>
              ចុចប៊ូតុង <strong>Share</strong> រួចជ្រើសរើស <strong>"Add to Home Screen"</strong>
            </span>
          </div>
        ) : (
          <>
            <button 
              onClick={handleDismiss}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium py-2 px-3 transition-colors"
            >
              ពេលក្រោយ / Later
            </button>
            <button 
              onClick={handleInstallClick}
              className="text-xs bg-rose-700 hover:bg-rose-800 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>ដំឡើងឥឡូវនេះ / Install</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
