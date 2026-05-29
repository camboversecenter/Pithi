
import { createContext, useContext, useState, ReactNode } from 'react';
import { Modal, Button } from '../components/UIComponents';
import { AlertCircle, CheckCircle, HelpCircle, AlertTriangle } from 'lucide-react';

interface DialogOptions {
    title: string;
    message: string;
    type: 'ALERT' | 'CONFIRM';
    variant?: 'info' | 'success' | 'danger' | 'warning';
    confirmText?: string;
    cancelText?: string;
}

interface GlobalDialogContextType {
    showAlert: (title: string, message: string, variant?: 'info' | 'success' | 'danger' | 'warning') => Promise<void>;
    showConfirm: (title: string, message: string, variant?: 'info' | 'success' | 'danger' | 'warning') => Promise<boolean>;
}

const GlobalDialogContext = createContext<GlobalDialogContextType | undefined>(undefined);

export const GlobalDialogProvider = ({ children }: { children?: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<DialogOptions>({ title: '', message: '', type: 'ALERT' });
    const [resolveRef, setResolveRef] = useState<(value: any) => void>(() => {});

    const showAlert = (title: string, message: string, variant: 'info' | 'success' | 'danger' | 'warning' = 'info') => {
        return new Promise<void>((resolve) => {
            setOptions({ title, message, type: 'ALERT', variant });
            setResolveRef(() => resolve); // Alert resolves to void (just closes)
            setIsOpen(true);
        });
    };

    const showConfirm = (title: string, message: string, variant: 'info' | 'success' | 'danger' | 'warning' = 'warning') => {
        return new Promise<boolean>((resolve) => {
            setOptions({ title, message, type: 'CONFIRM', variant });
            setResolveRef(() => resolve); // Confirm resolves to boolean
            setIsOpen(true);
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        resolveRef(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveRef(false);
    };

    // Determine Icon based on variant
    const getIcon = () => {
        switch (options.variant) {
            case 'danger': return <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />;
            case 'success': return <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />;
            case 'warning': return <HelpCircle className="w-12 h-12 text-amber-500 mb-4" />;
            default: return <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />;
        }
    };

    // Determine Confirm Button Color
    const getConfirmBtnVariant = () => {
        if (options.variant === 'danger') return 'danger';
        return 'primary';
    };

    return (
        <GlobalDialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <Modal isOpen={isOpen} onClose={() => { if(options.type === 'ALERT') handleConfirm(); else handleCancel(); }} title="">
                <div className="flex flex-col items-center text-center pt-2 pb-2">
                    {getIcon()}
                    <h3 className="text-xl font-bold text-slate-800 mb-2 font-serif">{options.title}</h3>
                    <p className="text-slate-600 mb-8 leading-relaxed whitespace-pre-line">{options.message}</p>
                    
                    <div className="flex gap-3 w-full">
                        {options.type === 'CONFIRM' && (
                            <Button variant="secondary" onClick={handleCancel} className="flex-1">
                                {options.cancelText || 'បោះបង់'}
                            </Button>
                        )}
                        <Button variant={getConfirmBtnVariant()} onClick={handleConfirm} className="flex-1">
                            {options.confirmText || 'យល់ព្រម'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </GlobalDialogContext.Provider>
    );
};

export const useGlobalDialog = () => {
    const context = useContext(GlobalDialogContext);
    if (!context) {
        throw new Error('useGlobalDialog must be used within a GlobalDialogProvider');
    }
    return context;
};
