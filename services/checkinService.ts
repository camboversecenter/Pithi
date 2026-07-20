
import QRCode from 'qrcode';

// Payload embedded in each guest's entry QR code. Kept as a plain prefixed
// string so any QR reader can at least display it.
const CHECKIN_PREFIX = 'PITHI-CHECKIN:';

export const buildCheckInPayload = (guestId: string, ceremonyId: string): string =>
    `${CHECKIN_PREFIX}${guestId}:${ceremonyId}`;

export const parseCheckInPayload = (text: string): { guestId: string; ceremonyId: string } | null => {
    if (!text.startsWith(CHECKIN_PREFIX)) return null;
    const parts = text.slice(CHECKIN_PREFIX.length).split(':');
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { guestId: parts[0], ceremonyId: parts.slice(1).join(':') };
};

export const generateGuestQr = (guestId: string, ceremonyId: string): Promise<string> =>
    QRCode.toDataURL(buildCheckInPayload(guestId, ceremonyId), {
        width: 480,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
    });
