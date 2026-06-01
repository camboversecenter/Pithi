
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
  location: string;
  locationType?: 'FIXED' | 'FLEXIBLE';
  mapUrl?: string;
  imageUrl?: string;
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
  price: number;
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

export interface BookingComment {
  id: string;
  bookingId: string;
  userId: string;
  userName: string;
  role: UserRole;
  content: string;
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
