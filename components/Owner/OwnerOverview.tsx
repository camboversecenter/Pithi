
import React from 'react';
import { Ceremony } from '../../types';
import { Card, MarkdownRenderer } from '../UIComponents';

interface OwnerOverviewProps {
    ceremony: Ceremony;
    guestCount: number;
    budget: number;
}

const OwnerOverview: React.FC<OwnerOverviewProps> = ({ ceremony, guestCount, budget }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
            <Card title="លម្អិត" className="h-full">
                <div className="space-y-4 text-slate-600">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">ប្រភេទ</label>
                        <p className="font-serif text-xl text-slate-900">{ceremony.type}</p>
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
            <Card title="សង្ខេប" className="h-full bg-slate-900 text-white border-none shadow-xl shadow-slate-300">
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
        </div>
    );
};

export default OwnerOverview;
