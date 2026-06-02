import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Sparkles, RefreshCw } from 'lucide-react';

export const PWAUpdateNotification: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.error('SW Registration Error:', error);
    }
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-6 md:right-auto md:w-96 bg-slate-900 text-white rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.3)] p-4 z-[101] border border-slate-800 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex gap-4 items-start">
        <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center flex-shrink-0 animate-pulse">
          <Sparkles className="text-white" size={20} />
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">
            មានជំនាន់ថ្មី / New Version Available!
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            កម្មវិធីមានការអាប់ដេតថ្មី។ សូមធ្វើបច្ចុប្បន្នភាពដើម្បីទទួលបានមុខងារថ្មីៗ និងការកែលម្អ។
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
        <button 
          onClick={() => setNeedRefresh(false)}
          className="text-xs text-slate-400 hover:text-white font-medium py-2 px-3 transition-colors"
        >
          ពេលក្រោយ / Later
        </button>
        <button 
          onClick={() => updateServiceWorker(true)}
          className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-1.5"
        >
          <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
          <span>អាប់ដេត / Update Now</span>
        </button>
      </div>
    </div>
  );
};
