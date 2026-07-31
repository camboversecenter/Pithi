
import React, { useEffect, useState } from 'react';
import { Input } from './UIComponents';

export const PRESET_CEREMONY_TYPES = ['អាពាហ៍ពិពាហ៍', 'ខួបកំណើត', 'ឡើងផ្ទះ', 'បុណ្យសព', 'បុណ្យ ៧ ថ្ងៃ'];

export const isPresetCeremonyType = (type?: string) => PRESET_CEREMONY_TYPES.includes((type || '').trim());

interface CeremonyTypePickerProps {
    value?: string;
    onChange: (type: string) => void;
    accent?: 'rose' | 'blue';
}

// "ផ្សេងៗ" (Other) is a real choice, not a synonym for a wedding: whether the
// custom field is showing is tracked explicitly instead of being guessed from
// the value, so an empty custom type can never fall back to a preset.
export const CeremonyTypePicker: React.FC<CeremonyTypePickerProps> = ({ value, onChange, accent = 'rose' }) => {
    const [isCustom, setIsCustom] = useState(() => !!value && !isPresetCeremonyType(value));

    // Editing an existing ceremony seeds the picker from its saved type.
    useEffect(() => {
        if (value && !isPresetCeremonyType(value)) setIsCustom(true);
        else if (isPresetCeremonyType(value)) setIsCustom(false);
    }, [value]);

    const selectedClasses = accent === 'blue'
        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
        : 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200';
    const idleClasses = 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300';

    return (
        <>
            <div className="grid grid-cols-2 gap-3 mb-3">
                {PRESET_CEREMONY_TYPES.map(type => (
                    <button
                        key={type}
                        onClick={() => { setIsCustom(false); onChange(type); }}
                        className={`px-3 py-3 rounded-xl text-sm font-bold border transition-all ${
                            !isCustom && value === type ? selectedClasses : idleClasses
                        }`}
                    >
                        {type}
                    </button>
                ))}
                <button
                    onClick={() => {
                        setIsCustom(true);
                        if (isPresetCeremonyType(value)) onChange('');
                    }}
                    className={`px-3 py-3 rounded-xl text-sm font-bold border transition-all ${
                        isCustom ? selectedClasses : idleClasses
                    }`}
                >
                    ផ្សេងៗ...
                </button>
            </div>

            {isCustom && (
                <Input
                    placeholder="បញ្ចូលប្រភេទកម្មវិធី... (ឧ. បុណ្យចម្រើនព្រះបរិត្ត)"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    autoFocus
                    required
                />
            )}
        </>
    );
};

export default CeremonyTypePicker;
