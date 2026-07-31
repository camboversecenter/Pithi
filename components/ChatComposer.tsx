
import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Mic, Send, Square, Trash2, Loader2 } from 'lucide-react';
import { ChatAttachmentType } from '../types';

export interface ComposedMessage {
    text: string;
    file?: File;
    kind?: ChatAttachmentType;
}

interface ChatComposerProps {
    onSend: (message: ComposedMessage) => Promise<void> | void;
    disabled?: boolean;
    sending?: boolean;
    placeholder?: string;
    /** Hide the voice button where audio makes no sense. */
    allowVoice?: boolean;
    allowImage?: boolean;
}

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB — keeps uploads quick on mobile data

// Shared composer for every conversation in the app (booking negotiation,
// direct messages, AI assistant): text, a photo, or a voice note.
export const ChatComposer: React.FC<ChatComposerProps> = ({
    onSend,
    disabled = false,
    sending = false,
    placeholder = 'សរសេរសារ...',
    allowVoice = true,
    allowImage = true
}) => {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [kind, setKind] = useState<ChatAttachmentType | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);
    const [error, setError] = useState('');

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Object URLs must be released or every preview leaks a blob.
    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        recorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    }, []);

    const attach = (newFile: File, newKind: ChatAttachmentType) => {
        if (newFile.size > MAX_ATTACHMENT_BYTES) {
            setError('ឯកសារធំពេក (អតិបរមា 8MB)។');
            return;
        }
        setError('');
        setFile(newFile);
        setKind(newKind);
    };

    const clearAttachment = () => {
        setFile(null);
        setKind(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const startRecording = async () => {
        setError('');
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setError('ឧបករណ៍នេះមិនអាចថតសំឡេងបានទេ។');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const type = recorder.mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type });
                const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
                attach(new File([blob], `voice_${Date.now()}.${extension}`, { type }), 'AUDIO');
            };
            recorder.start();
            recorderRef.current = recorder;
            setIsRecording(true);
            setRecordSeconds(0);
            timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
        } catch (err: any) {
            setError('មិនអាចចូលប្រើមីក្រូហ្វូនបានទេ។ សូមអនុញ្ញាតសិទ្ធិ។');
        }
    };

    const stopRecording = () => {
        recorderRef.current?.stop();
        recorderRef.current = null;
        setIsRecording(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleSend = async () => {
        if (disabled || sending) return;
        if (!text.trim() && !file) return;
        await onSend({ text: text.trim(), file: file || undefined, kind: kind || undefined });
        setText('');
        clearAttachment();
    };

    return (
        <div className="space-y-2">
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

            {file && previewUrl && (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2">
                    {kind === 'IMAGE' ? (
                        <img src={previewUrl} alt="attachment preview" className="w-14 h-14 object-cover rounded-lg" />
                    ) : (
                        <audio src={previewUrl} controls className="h-9 flex-1 min-w-0" />
                    )}
                    <button
                        onClick={clearAttachment}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                        title="លុបឯកសារភ្ជាប់"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}

            <div className="flex items-center gap-2">
                {allowImage && (
                    <>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || sending || isRecording}
                            className="p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                            title="ផ្ញើរូបភាព"
                        >
                            <ImageIcon size={18} />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                                const selected = e.target.files?.[0];
                                if (selected) attach(selected, 'IMAGE');
                            }}
                        />
                    </>
                )}

                {allowVoice && (
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={disabled || sending}
                        className={`p-2.5 rounded-xl transition-colors disabled:opacity-40 ${
                            isRecording ? 'text-white bg-red-600 hover:bg-red-700' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={isRecording ? 'បញ្ឈប់ការថត' : 'ថតសារជាសំឡេង'}
                    >
                        {isRecording ? <Square size={18} /> : <Mic size={18} />}
                    </button>
                )}

                {isRecording ? (
                    <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                        កំពុងថត… {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}
                    </div>
                ) : (
                    <input
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-100 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 text-sm"
                        placeholder={placeholder}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        disabled={disabled || sending}
                        onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                    />
                )}

                <button
                    onClick={handleSend}
                    disabled={disabled || sending || isRecording || (!text.trim() && !file)}
                    className="p-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-40 transition-colors flex items-center justify-center"
                    title="ផ្ញើ"
                >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
        </div>
    );
};

// Renders an attachment inside a chat bubble.
export const ChatAttachmentView = ({ url, type }: { url?: string; type?: ChatAttachmentType | null }) => {
    if (!url || !type) return null;
    if (type === 'IMAGE') {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1">
                <img src={url} alt="attachment" className="max-w-[220px] max-h-56 rounded-lg border border-black/5 object-cover" />
            </a>
        );
    }
    return <audio src={url} controls className="mt-2 w-[220px] max-w-full" />;
};

export default ChatComposer;
