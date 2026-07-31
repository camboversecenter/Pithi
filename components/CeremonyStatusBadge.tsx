
import React from 'react';
import { CalendarClock, History, PartyPopper } from 'lucide-react';
import { CeremonyTimeStatus, getCeremonyStatus } from '../services/dataService';

const STATUS_STYLES: Record<CeremonyTimeStatus, { label: string; className: string; Icon: React.ElementType }> = {
    TODAY: { label: 'ថ្ងៃនេះ', className: 'bg-rose-600 text-white border-rose-600', Icon: PartyPopper },
    UPCOMING: { label: 'ខាងមុខ', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CalendarClock },
    PAST: { label: 'កន្លងផុត', className: 'bg-slate-100 text-slate-500 border-slate-200', Icon: History }
};

// At-a-glance marker so a finished event is never mistaken for an upcoming one.
export const CeremonyStatusBadge = ({ date, className = '' }: { date?: string; className?: string }) => {
    const { label, className: styles, Icon } = STATUS_STYLES[getCeremonyStatus(date)];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles} ${className}`}>
            <Icon size={11} /> {label}
        </span>
    );
};

export default CeremonyStatusBadge;
