
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ceremony, User } from '../../types';
import { Card, MarkdownRenderer } from '../UIComponents';
import { CeremonyStatusBadge } from '../CeremonyStatusBadge';
import { resolveMapLink } from '../../services/mapsService';
import { getUserById } from '../../services/authService';
import { ExternalLink, MapPin, MessagesSquare } from 'lucide-react';

interface OrganizerOverviewProps {
    ceremony: Ceremony;
    guestCount: number;
    budget: number;
    currentUserId?: string;
}

const OrganizerOverview: React.FC<OrganizerOverviewProps> = ({ ceremony, guestCount, budget, currentUserId }) => {
    const mapLink = resolveMapLink(ceremony.mapUrl, ceremony.location);
    const [owner, setOwner] = useState<User | null>(null);

    // The organizer books on the client's behalf, so they need a direct line to
    // the event owner to negotiate afterwards.
    const ownerId = ceremony.ownerId && ceremony.ownerId !== currentUserId ? ceremony.ownerId : null;

    useEffect(() => {
        if (!ownerId) {
            setOwner(null);
            return;
        }
        getUserById(ownerId).then(setOwner).catch(() => setOwner(null));
    }, [ownerId]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
            <Card title="លម្អិត" className="h-full">
                <div className="space-y-4 text-slate-600">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">ប្រភេទ</label>
                            <p className="font-serif text-xl text-slate-900">{ceremony.type}</p>
                        </div>
                        <CeremonyStatusBadge date={ceremony.date} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">ទីតាំង</label>
                        <p className="text-slate-800 font-medium">{ceremony.location || 'មិនទាន់កំណត់ទីតាំង'}</p>
                        {mapLink && (
                            <a
                                href={mapLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline mt-1"
                            >
                                <MapPin size={12} /> ពិនិត្យលើ Google Maps <ExternalLink size={10} />
                            </a>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">ការពិពណ៌នា</label>
                        <MarkdownRenderer content={ceremony.description || 'មិនមានការពិពណ៌នា។'} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">សារស្វាគមន៍</label>
                        <div className="italic text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                            "{ceremony.invitationMessage}"
                        </div>
                    </div>
                </div>
            </Card>
            <div className="space-y-6">
                <Card title="សង្ខេប" className="bg-slate-900 text-white border-none shadow-xl shadow-slate-300">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase">ថវិកា</p>
                            <p className="text-3xl font-serif">${budget || 0}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase">ចំនួនភ្ញៀវ</p>
                            <p className="text-3xl font-serif">{guestCount}</p>
                        </div>
                    </div>
                </Card>

                {ownerId && (
                    <Card title="ម្ចាស់កម្មវិធី">
                        <div className="flex items-center gap-3">
                            <img
                                src={owner?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner?.name || 'Owner')}&background=random`}
                                className="w-11 h-11 rounded-full object-cover border border-slate-200"
                                alt=""
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-800 text-sm truncate">{owner?.name || 'ម្ចាស់កម្មវិធី'}</p>
                                <p className="text-xs text-slate-500 truncate">{owner?.email || ''}</p>
                            </div>
                            <Link
                                to={`/messages?with=${ownerId}`}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                            >
                                <MessagesSquare size={14} /> ផ្ញើសារ
                            </Link>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                            ពិភាក្សាកម្មវិធី តម្លៃ និងការកក់ដោយផ្ទាល់ជាមួយម្ចាស់កម្មវិធី។
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default OrganizerOverview;
