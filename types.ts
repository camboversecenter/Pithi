
export enum UserRole {
  GENERAL_USER = 'GENERAL_USER', // Can be an Owner
  ORGANIZER = 'ORGANIZER',
  CHEF = 'CHEF',
  HALL = 'HALL',
  MUSIC_BAND = 'MUSIC_BAND',
  BEAUTY_SALON = 'BEAUTY_SALON',
  ADMIN = 'ADMIN'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum GuestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED'
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface CeremonyCategory {
    id: string;
    name: string; // Khmer Name
    type: 'HAPPY' | 'SAD'; 
}

export interface Ceremony {
  id: string;
  title: string;
  type: string; // Wedding, Birthday, etc.
  date: string;
  description: string;
  organizerId: string; // Created by
  ownerId?: string; // Assigned to General User
  location?: string;
  mapUrl?: string; // Google Maps link to the venue
  budget?: number;
  invitationMessage?: string;
  themeColor?: string;
  khqrUrl?: string; // KHQR Code Image URL
  bannerUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface InvitationTemplate {
    id: string;
    ceremonyId: string;
    type: string; 
    message: string;
    bannerUrl?: string; 
    expirationDate?: string; 
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface Service {
  id: string;
  providerId: string;
  providerName: string;
  role: UserRole;
  name: string;
  description: string;
  price: number;
  priceNote?: string;
  /** What one unit of `price` buys — e.g. "តុ" (table), "ថ្ងៃ" (day). */
  unitLabel?: string;
  location: string;
  locationType?: 'FIXED' | 'FLEXIBLE';
  mapUrl?: string;
  imageUrl?: string;
  /** Vendor's bank/KHQR image guests use to pay the deposit. */
  paymentQrUrl?: string;
  /** Share of the total requested up-front, in percent (default 50). */
  depositPercent?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Booking {
  id: string;
  serviceId: string;
  ceremonyId: string;
  ceremonyTitle?: string; 
  bookedByUserId: string;
  bookedByUserName?: string; 
  providerId: string;
  providerName?: string;
  date: string;
  startTime: string; 
  endTime: string;   
  status: BookingStatus;
  serviceName: string;
  /** Total price of the booking (unitPrice × quantity). */
  price: number;
  /** How many units were booked — e.g. 30 tables. */
  quantity?: number;
  /** Price of a single unit at the time of booking. */
  unitPrice?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Transaction {
  id: string;
  ceremonyId: string;
  donorName?: string; 
  expenseName?: string; 
  category?: string; 
  amount: number;
  giftDescription?: string; 
  type: 'INCOME' | 'EXPENSE' | 'GIFT';
  date: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface ReportedTransaction {
  id: string;
  ceremonyId: string;
  guestId: string;
  guestName: string;
  amount: number;
  currency: string; 
  date: string;
  senderNameFromReceipt?: string;
  receiptImageUrl: string;
  status: 'PENDING' | 'CONFIRMED';
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Guest {
  id: string;
  ceremonyId: string;
  userId?: string;
  name: string;
  phoneNumber?: string;
  status: GuestStatus;
  guestType?: string;
  checkedInAt?: string | null; // Set when the host checks the guest in at the entrance
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Review {
    id: string;
    serviceId: string;
    userId: string;
    userName: string;
    rating: number; 
    comment: string;
    date: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface Invitation extends Guest {
    ceremonyTitle: string;
    ceremonyDate: string;
    ceremonyLocation?: string;
    bannerUrl?: string;
}

export type ChatAttachmentType = 'IMAGE' | 'AUDIO';

export interface BookingComment {
  id: string;
  bookingId: string;
  userId: string;
  userName: string;
  role: UserRole;
  content: string;
  attachmentUrl?: string;
  attachmentType?: ChatAttachmentType | null;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface BookingLog {
  id: string;
  bookingId: string;
  action: string; 
  details: string; 
  userId: string;
  userName: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// --- NOTIFICATIONS ---

export type NotificationType =
    'BOOKING_CREATED' | 'BOOKING_STATUS' | 'BOOKING_COMMENT' |
    'GUEST_RSVP' | 'REVIEW' | 'GIFT_REPORTED' |
    'MESSAGE' | 'ANNOUNCEMENT';

// Named AppNotification to avoid clashing with the DOM Notification API.
export interface AppNotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string; // In-app route, e.g. '/booking/12'
    isRead: boolean;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

// --- DIRECT MESSAGES ---

// One-to-one chat between any two accounts (owner ↔ vendor, owner ↔ organizer,
// organizer ↔ vendor). Bookings are not required, so a client can negotiate
// terms with a provider before committing to anything.
export interface DirectMessage {
    id: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    recipientName: string;
    content: string;
    attachmentUrl?: string;
    attachmentType?: ChatAttachmentType | null;
    isRead: boolean;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface Conversation {
    partnerId: string;
    partnerName: string;
    partnerRole?: string;
    partnerAvatarUrl?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

// --- ANNOUNCEMENTS ---

export type AnnouncementAudience = 'CEREMONY_GUESTS' | 'VENDOR_CLIENTS';

export interface Announcement {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    audience: AnnouncementAudience;
    ceremonyId?: string | null;
    title: string;
    message: string;
    recipientCount?: number;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

// --- SOCIAL FEATURE TYPES ---

export interface SocialPost {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    title: string;
    content: string;
    likes: number;
    useful: number;
    fakes: number;
    bookmarksCount: number;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
    // UI Only
    isBookmarked?: boolean;
    myReaction?: 'LIKE' | 'USEFUL' | 'FAKE' | null;
}

export interface PostComment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export type PostReactionType = 'LIKE' | 'USEFUL' | 'FAKE';
