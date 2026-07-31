
// Small helpers for turning an address into something a guest can actually
// navigate to. The owner may paste a Google Maps link; when they do not, a
// search link built from the address text is still far better than nothing.

const MAPS_HOSTS = ['google.com/maps', 'goo.gl/maps', 'maps.app.goo.gl', 'maps.google.'];

export const buildMapsSearchUrl = (query: string): string =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;

export const isMapsUrl = (url?: string): boolean => {
    if (!url) return false;
    const value = url.trim().toLowerCase();
    return value.startsWith('http') && MAPS_HOSTS.some(host => value.includes(host));
};

// The link to show on an invitation: the saved map link when there is one,
// otherwise a search for the written address.
export const resolveMapLink = (mapUrl?: string, location?: string): string | null => {
    if (mapUrl && mapUrl.trim().startsWith('http')) return mapUrl.trim();
    if (location && location.trim()) return buildMapsSearchUrl(location);
    return null;
};
