
import { useEffect, useRef, useState } from 'react';
import { Guest } from '../types';
import { setGuestCheckIn } from '../services/dataService';
import { parseCheckInPayload } from '../services/checkinService';
import { Modal } from './UIComponents';
import { CheckCircle, AlertTriangle, CameraOff, Loader2, ScanLine } from 'lucide-react';

interface CheckInScannerProps {
    isOpen: boolean;
    onClose: () => void;
    ceremonyId: string;
    guests: Guest[];
    onCheckedIn: () => void; // parent refreshes its guest list
}

type ScanResult =
    | { kind: 'success'; message: string }
    | { kind: 'already'; message: string }
    | { kind: 'error'; message: string };

// Camera-based QR check-in using the native BarcodeDetector API (Chrome /
// Android — PITHI's main audience). Devices without it can still check
// guests in manually from the list.
const CheckInScanner = ({ isOpen, onClose, ceremonyId, guests, onCheckedIn }: CheckInScannerProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const guestsRef = useRef<Guest[]>(guests);
    const busyRef = useRef(false);

    const [starting, setStarting] = useState(true);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [checkedCount, setCheckedCount] = useState(0);

    guestsRef.current = guests;

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | undefined;
        setStarting(true);
        setCameraError(null);
        setResult(null);

        const BarcodeDetectorCtor = (window as any).BarcodeDetector;

        const start = async () => {
            if (!BarcodeDetectorCtor) {
                setCameraError('ឧបករណ៍នេះមិនគាំទ្រការស្កេន QR ដោយស្វ័យប្រវត្តិទេ។ សូមប្រើប៊ូតុង "ចូលរួម" ក្នុងបញ្ជីភ្ញៀវជំនួសវិញ។');
                setStarting(false);
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setStarting(false);

                const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
                interval = setInterval(async () => {
                    if (busyRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
                    try {
                        const codes = await detector.detect(videoRef.current);
                        if (codes.length > 0) {
                            await handleDetected(codes[0].rawValue as string);
                        }
                    } catch {
                        // Individual detect() failures are transient — keep scanning
                    }
                }, 400);
            } catch (e) {
                console.warn('Camera error:', e);
                setCameraError('មិនអាចបើកកាមេរ៉ាបានទេ។ សូមអនុញ្ញាតការប្រើកាមេរ៉ា ឬប្រើប៊ូតុង "ចូលរួម" ក្នុងបញ្ជីភ្ញៀវ។');
                setStarting(false);
            }
        };

        const handleDetected = async (raw: string) => {
            busyRef.current = true;
            try {
                const payload = parseCheckInPayload(raw);
                if (!payload) {
                    setResult({ kind: 'error', message: 'QR នេះមិនមែនជាសំបុត្រចូលរបស់ PITHI ទេ។' });
                } else if (payload.ceremonyId !== ceremonyId) {
                    setResult({ kind: 'error', message: 'QR នេះសម្រាប់កម្មវិធីផ្សេង។' });
                } else {
                    const guest = guestsRef.current.find(g => String(g.id) === payload.guestId);
                    if (!guest) {
                        setResult({ kind: 'error', message: 'រកមិនឃើញភ្ញៀវនេះក្នុងបញ្ជីទេ។' });
                    } else if (guest.checkedInAt) {
                        setResult({ kind: 'already', message: `${guest.name} បានចូលរួមរួចហើយ (${new Date(guest.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})។` });
                    } else {
                        await setGuestCheckIn(String(guest.id), true);
                        setCheckedCount(c => c + 1);
                        setResult({ kind: 'success', message: `${guest.name} បានចូលរួមដោយជោគជ័យ!` });
                        onCheckedIn();
                    }
                }
            } finally {
                // Hold the result on screen briefly before scanning again,
                // so one QR isn't processed multiple times.
                setTimeout(() => {
                    setResult(null);
                    busyRef.current = false;
                }, 2200);
            }
        };

        start();

        return () => {
            cancelled = true;
            if (interval) clearInterval(interval);
            busyRef.current = false;
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
    }, [isOpen, ceremonyId]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="ស្កេនចូលភ្ញៀវ">
            <div className="space-y-4">
                {cameraError ? (
                    <div className="flex flex-col items-center text-center py-10 px-4 text-slate-500">
                        <CameraOff size={40} className="mb-4 opacity-40" />
                        <p className="text-sm leading-relaxed">{cameraError}</p>
                    </div>
                ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-square">
                        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

                        {starting && (
                            <div className="absolute inset-0 flex items-center justify-center text-white/80">
                                <Loader2 className="animate-spin mr-2" size={20} /> កំពុងបើកកាមេរ៉ា...
                            </div>
                        )}

                        {/* Scan frame */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-3/5 aspect-square border-2 border-white/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"></div>
                        </div>

                        {/* Result banner */}
                        {result && (
                            <div className={`absolute bottom-3 left-3 right-3 p-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 ${
                                result.kind === 'success' ? 'bg-emerald-500 text-white' :
                                result.kind === 'already' ? 'bg-amber-400 text-amber-950' :
                                'bg-red-500 text-white'
                            }`}>
                                {result.kind === 'success' ? <CheckCircle size={18} className="flex-shrink-0" /> : <AlertTriangle size={18} className="flex-shrink-0" />}
                                <span className="leading-snug">{result.message}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
                    <ScanLine size={16} className="text-rose-500" />
                    បានស្កេនចូល {checkedCount} នាក់ ក្នុងវគ្គនេះ
                </div>
            </div>
        </Modal>
    );
};

export default CheckInScanner;
