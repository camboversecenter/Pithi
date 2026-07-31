
import React, { useCallback, useEffect, useState } from 'react';
import { Announcement, AnnouncementAudience, User } from '../types';
import { createAnnouncement, deleteAnnouncement, getAnnouncements } from '../services/dataService';
import { Button, Card, Input } from './UIComponents';
import { Megaphone, Loader2, Trash2, Users, Send } from 'lucide-react';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';

interface AnnouncementsPanelProps {
    currentUser: User;
    audience: AnnouncementAudience;
    /** Required when announcing to a ceremony's guests. */
    ceremonyId?: string;
    /** Short line explaining who will receive the broadcast. */
    recipientHint?: string;
}

// Broadcasts one message to everybody involved: the guests of a ceremony, or
// every client who booked this vendor. Each recipient gets it in their
// notification inbox.
export const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({
    currentUser, audience, ceremonyId, recipientHint
}) => {
    const { showAlert, showConfirm } = useGlobalDialog();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [publishing, setPublishing] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setAnnouncements(await getAnnouncements(
                audience === 'CEREMONY_GUESTS' ? { ceremonyId } : { authorId: currentUser.id }
            ));
        } finally {
            setLoading(false);
        }
    }, [audience, ceremonyId, currentUser.id]);

    useEffect(() => { load(); }, [load]);

    const handlePublish = async () => {
        setPublishing(true);
        try {
            await createAnnouncement({
                authorId: currentUser.id,
                authorName: currentUser.name,
                authorRole: currentUser.role,
                audience,
                ceremonyId,
                title,
                message
            });
            setTitle('');
            setMessage('');
            await load();
            await showAlert('ជោគជ័យ', 'សេចក្តីជូនដំណឹងត្រូវបានផ្សាយ។', 'success');
        } catch (error: any) {
            await showAlert('បរាជ័យ', error.message || 'មិនអាចផ្សាយបានទេ។', 'danger');
        } finally {
            setPublishing(false);
        }
    };

    const handleDelete = async (announcement: Announcement) => {
        const confirmed = await showConfirm('លុបសេចក្តីជូនដំណឹង?', 'សេចក្តីជូនដំណឹងនេះនឹងត្រូវលុបចេញពីបញ្ជី។', 'danger');
        if (!confirmed) return;
        await deleteAnnouncement(announcement.id);
        await load();
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <Card title="ផ្សាយសេចក្តីជូនដំណឹង">
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <Users size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-600 leading-relaxed">
                            {recipientHint || (audience === 'CEREMONY_GUESTS'
                                ? 'ភ្ញៀវទាំងអស់ដែលមានគណនីក្នុងកម្មវិធីនេះ នឹងទទួលបានការជូនដំណឹង។'
                                : 'អតិថិជនទាំងអស់ដែលបានកក់សេវាកម្មរបស់អ្នក នឹងទទួលបានការជូនដំណឹង។')}
                        </p>
                    </div>

                    <Input
                        label="ចំណងជើង"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="ឧ. ការផ្លាស់ប្តូរម៉ោងកម្មវិធី"
                        required
                    />
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">ខ្លឹមសារ <span className="text-rose-500">*</span></label>
                        <textarea
                            className="w-full px-4 py-3 bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-rose-300 focus:ring-4 focus:ring-rose-50 outline-none transition-all text-sm font-medium"
                            rows={4}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="សរសេរព័ត៌មានដែលចង់ជូនដំណឹង..."
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={handlePublish}
                        isLoading={publishing}
                        disabled={!title.trim() || !message.trim() || publishing}
                    >
                        <Send size={16} className="mr-2" /> ផ្សាយឥឡូវនេះ
                    </Button>
                </div>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">សេចក្តីជូនដំណឹងមុនៗ</h3>
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-rose-400" /></div>
                ) : announcements.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-sm">
                        <Megaphone size={28} className="mx-auto mb-3 opacity-30" />
                        មិនទាន់មានសេចក្តីជូនដំណឹងទេ។
                    </div>
                ) : announcements.map(announcement => (
                    <div key={announcement.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-sm">{announcement.title}</p>
                                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{announcement.message}</p>
                                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                                    {new Date(announcement.createdAt).toLocaleString('km-KH')}
                                    {typeof announcement.recipientCount === 'number' && announcement.recipientCount > 0 && (
                                        <> • បានផ្ញើទៅ {announcement.recipientCount} នាក់</>
                                    )}
                                </p>
                            </div>
                            {announcement.authorId === currentUser.id && (
                                <button
                                    onClick={() => handleDelete(announcement)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                    title="លុប"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnnouncementsPanel;
