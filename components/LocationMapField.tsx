
import React from 'react';
import { Input } from './UIComponents';
import { ExternalLink, MapPin, Wand2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { buildMapsSearchUrl, isMapsUrl, resolveMapLink } from '../services/mapsService';

interface LocationMapFieldProps {
    location?: string;
    mapUrl?: string;
    onChange: (patch: { location?: string; mapUrl?: string }) => void;
    accent?: 'rose' | 'blue';
    label?: string;
}

// Venue address plus the Google Maps link that ends up on the invitation. The
// owner can generate the link from the address and open it right here, so a
// wrong pin is caught before any guest is invited.
export const LocationMapField: React.FC<LocationMapFieldProps> = ({
    location, mapUrl, onChange, accent = 'rose', label = 'ទីតាំង'
}) => {
    const preview = resolveMapLink(mapUrl, location);
    const accentText = accent === 'blue' ? 'text-blue-600' : 'text-rose-600';
    const accentBg = accent === 'blue' ? 'hover:bg-blue-50 border-blue-100' : 'hover:bg-rose-50 border-rose-100';

    return (
        <div className="space-y-1">
            <Input
                label={label}
                value={location || ''}
                onChange={e => onChange({ location: e.target.value })}
                placeholder="ឧ. សណ្ឋាគារសុខា ភ្នំពេញ / ផ្ទះលេខ... ផ្លូវ..."
            />

            <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-slate-700">តំណ Google Maps</label>
                <button
                    type="button"
                    onClick={() => location?.trim() && onChange({ mapUrl: buildMapsSearchUrl(location) })}
                    disabled={!location?.trim()}
                    className={`text-xs font-bold flex items-center px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${accentText} ${accentBg}`}
                >
                    <Wand2 size={12} className="mr-1.5" /> បង្កើតពីអាសយដ្ឋាន
                </button>
            </div>
            <Input
                value={mapUrl || ''}
                onChange={e => onChange({ mapUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
            />

            <div className="flex flex-wrap items-center gap-3 -mt-3">
                {preview ? (
                    <a
                        href={preview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 text-xs font-bold ${accentText} hover:underline`}
                    >
                        <MapPin size={12} /> ពិនិត្យទីតាំងលើផែនទី <ExternalLink size={10} />
                    </a>
                ) : (
                    <span className="text-xs text-slate-400">បញ្ចូលអាសយដ្ឋាន ដើម្បីភ្ជាប់ផែនទីទៅលិខិតអញ្ជើញ។</span>
                )}

                {mapUrl?.trim() && (
                    isMapsUrl(mapUrl) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold">
                            <CheckCircle2 size={12} /> តំណត្រឹមត្រូវ
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-bold">
                            <AlertTriangle size={12} /> នេះមិនមែនជាតំណ Google Maps ទេ
                        </span>
                    )
                )}
            </div>
        </div>
    );
};

export default LocationMapField;
