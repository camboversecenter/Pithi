
import React, { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, useState, useEffect } from 'react';
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight, Search, Check, X, ChevronDown } from 'lucide-react';
import { BookingStatus, Booking } from '../types';
import ReactMarkdown from 'react-markdown';

// --- BUTTONS (Rose Theme) ---
export const Button: React.FC<ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean, variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' }> = ({ 
    children, 
    isLoading, 
    variant = 'primary', 
    className = '', 
    disabled, 
    ...props 
}) => {
    const baseStyles = "inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";
    
    const variants = {
        primary: "bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200 border border-transparent",
        secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm",
        danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
        outline: "bg-transparent border border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    };

    return (
        <button 
            className={`${baseStyles} ${variants[variant]} ${className}`} 
            disabled={disabled || isLoading} 
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {children}
        </button>
    );
};

// --- INPUTS (Slate Background) ---
export const Input: React.FC<InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', required, ...props }) => (
    <div className="mb-5">
        {label && (
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
        )}
        <input 
            className={`w-full px-4 py-3 bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-rose-300 focus:ring-4 focus:ring-rose-50 outline-none transition-all placeholder:text-slate-400 text-slate-900 text-sm font-medium ${className}`} 
            required={required}
            {...props} 
        />
    </div>
);

export const Select: React.FC<SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: { value: string, label: string }[] }> = ({ label, options, className = '', required, ...props }) => (
    <div className="mb-5">
        {label && (
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
        )}
        <div className="relative">
            <select 
                className={`w-full px-4 py-3 bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-rose-300 focus:ring-4 focus:ring-rose-50 outline-none transition-all appearance-none text-slate-900 text-sm font-medium ${className}`} 
                required={required}
                {...props}
            >
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={16} />
            </div>
        </div>
    </div>
);

// --- CARDS (Clean Slate Border) ---
interface CardProps {
    children?: React.ReactNode;
    title?: string;
    action?: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, title, action, className = '', noPadding = false }) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
        {(title || action) && (
            <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100">
                {title && <h3 className="font-bold text-base text-rose-900 font-serif tracking-tight">{title}</h3>}
                {action && <div className="relative z-10">{action}</div>}
            </div>
        )}
        <div className={noPadding ? '' : 'p-5'}>
            {children}
        </div>
    </div>
);

// --- MODAL ---
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAnimate(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setAnimate(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen && !animate) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center sm:p-4 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
                onClick={onClose}
            ></div>
            
            {/* Content Container */}
            <div className={`
                bg-white w-full md:w-full md:max-w-lg 
                rounded-t-2xl md:rounded-xl shadow-2xl relative z-10 
                flex flex-col max-h-[90vh] md:max-h-[85vh]
                transition-all duration-300 ease-out transform
                ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full md:translate-y-4 opacity-0'}
            `}>
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 bg-white rounded-t-2xl">
                    <h3 className="text-lg font-bold text-slate-800 font-serif pr-8">{title}</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto overscroll-contain">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const Badge = ({ status }: { status: string }) => {
    const styles: {[key: string]: string} = {
        [BookingStatus.PENDING]: 'bg-amber-50 text-amber-700 border-amber-200',
        [BookingStatus.CONFIRMED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        [BookingStatus.COMPLETED]: 'bg-blue-50 text-blue-700 border-blue-200',
        [BookingStatus.CANCELLED]: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    
    // Translate status for display
    const translateStatus = (s: string) => {
        switch(s) {
            case BookingStatus.PENDING: return 'រង់ចាំ';
            case BookingStatus.CONFIRMED: return 'បានបញ្ជាក់';
            case BookingStatus.COMPLETED: return 'បានបញ្ចប់';
            case BookingStatus.CANCELLED: return 'បោះបង់';
            default: return s;
        }
    }
    
    return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
            {translateStatus(status)}
        </span>
    );
};

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string, isLoading?: boolean }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col items-center text-center pt-2">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-600 border border-red-100">
                    <AlertTriangle size={32} />
                </div>
                <p className="text-slate-600 mb-8 leading-relaxed text-sm font-medium">{message}</p>
                <div className="flex gap-3 w-full">
                    <Button variant="secondary" onClick={onClose} className="flex-1" disabled={isLoading}>បោះបង់</Button>
                    <Button variant="danger" onClick={onConfirm} className="flex-1" isLoading={isLoading}>យល់ព្រមលុប</Button>
                </div>
            </div>
        </Modal>
    );
};

export const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center items-center space-x-2 mt-8 pb-4">
            <button 
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
                <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-600 px-3">
                {currentPage} / {totalPages}
            </span>
            <button 
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
};

export const SearchableSelect = ({ 
    label, 
    options, 
    value, 
    onChange, 
    placeholder = "ជ្រើសរើស...",
    required 
}: { 
    label?: string, 
    options: { value: string, label: string, subLabel?: string }[], 
    value: string, 
    onChange: (val: string) => void, 
    placeholder?: string,
    required?: boolean
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) setSearch('');
    }, [isOpen]);

    const filtered = options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
    );

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className="mb-5">
            {label && (
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}
            
            <div 
                className="w-full px-4 py-3 bg-slate-100 border border-transparent rounded-lg flex justify-between items-center cursor-pointer hover:bg-slate-200 transition-colors"
                onClick={() => setIsOpen(true)}
            >
                <span className={selectedOption ? 'text-slate-900 text-sm font-medium' : 'text-slate-400 text-sm'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className="text-slate-500 flex-shrink-0"/>
            </div>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={label || "ជ្រើសរើស"}>
                <div className="flex flex-col h-[60vh] md:h-[400px]">
                     <div className="mb-4 relative flex-shrink-0">
                        <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                        <input
                            autoFocus
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-lg focus:ring-0 outline-none transition-all text-sm font-medium placeholder:text-slate-400"
                            placeholder="ស្វែងរក..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2 pb-4">
                        {filtered.length > 0 ? (
                            filtered.map(opt => (
                                <button 
                                    key={opt.value}
                                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between transition-all group ${value === opt.value ? 'bg-rose-50 text-rose-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div>
                                        <div className="font-bold text-sm">{opt.label}</div>
                                        {opt.subLabel && <div className="text-xs text-slate-400 mt-0.5">{opt.subLabel}</div>}
                                    </div>
                                    {value === opt.value && <Check size={16} className="text-rose-600" />}
                                </button>
                            ))
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Search size={24} className="mb-2 opacity-20"/>
                                <p className="text-sm">រកមិនឃើញទិន្នន័យ</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export const CalendarView = ({ 
    selectedDate, 
    onDateSelect, 
    bookings = [], 
    events = [],
    minDate 
}: { 
    selectedDate: string, 
    onDateSelect: (date: string) => void, 
    bookings?: Booking[], 
    events?: { date: string, type: 'OWNED' | 'INVITED' }[],
    minDate?: string 
}) => {
    const [currentDate, setCurrentDate] = useState(selectedDate ? new Date(selectedDate) : new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isToday = (day: number) => {
        const today = new Date();
        return today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
    };

    const isSelected = (day: number) => {
        const d = new Date(selectedDate);
        return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    };

    const isDisabled = (day: number) => {
        if (!minDate) return false;
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const min = new Date(minDate);
        min.setHours(0,0,0,0);
        return d < min;
    };

    const getDayContent = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayBookings = bookings.filter(b => b.date === dateStr);
        const dayEvents = events.filter(e => e.date === dateStr);
        return { dayBookings, dayEvents };
    };
    
    // Khmer Days of Week
    const weekDays = ['អា', 'ច', 'អ', 'ព', 'ព្រ', 'សុ', 'ស'];

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    <ChevronLeft size={18} />
                </button>
                <h4 className="font-bold text-slate-800 text-sm font-serif">
                    {currentDate.toLocaleDateString('km-KH', { month: 'long', year: 'numeric' })}
                </h4>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                    <ChevronRight size={18} />
                </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const { dayBookings, dayEvents } = getDayContent(day);
                    const disabled = isDisabled(day);
                    
                    return (
                        <button 
                            key={day}
                            onClick={() => !disabled && onDateSelect(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                            disabled={disabled}
                            className={`
                                aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all duration-200
                                ${isSelected(day) ? 'bg-rose-600 text-white z-10 shadow-md shadow-rose-200' : 'text-slate-600 hover:bg-rose-50'}
                                ${isToday(day) && !isSelected(day) ? 'text-rose-600 font-bold bg-rose-50 border border-rose-100' : ''}
                                ${disabled ? 'opacity-20 cursor-not-allowed' : ''}
                            `}
                        >
                            <span className="text-xs">{day}</span>
                            
                            <div className="flex gap-0.5 mt-0.5 absolute bottom-1.5">
                                {(dayBookings.length > 0 || dayEvents.length > 0) && (
                                    <div className={`w-1 h-1 rounded-full ${isSelected(day) ? 'bg-white' : 'bg-rose-400'}`} />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export const MarkdownRenderer = ({ content, className = '' }: { content: string, className?: string }) => {
    return (
        <div className={`markdown-content text-slate-600 leading-relaxed font-normal text-sm ${className}`}>
            <ReactMarkdown
                components={{
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold font-serif text-rose-800 mt-4 mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-bold font-serif text-slate-800 mt-3 mb-2" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-slate-800" {...props} />
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
