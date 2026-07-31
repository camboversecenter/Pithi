# Data Layer & Storage

Files: `services/dataService.ts`, `services/storageService.ts`,
`services/supabaseConfig.ts`.

## The offline-first pattern

`dataService.ts` is the single CRUD gateway for the whole app. Every function
follows the same three-way pattern:

```js
if (isLocalMode()) return <localStorage version>   // demo / mock session
try {
    ...supabase query...
} catch (err) {
    console.warn(...); return <localStorage version> // graceful degradation
}
```

- **`isLocalMode()`** is simply `!!localStorage.getItem('pithi_mock_user')`. A
  demo/mock session never touches the network.
- **On any Supabase error** (network down, RLS denial, missing table) a real
  session silently falls back to localStorage instead of throwing. This is why
  the UI never hard-crashes during a demo.
- Each entity has seeded demo records the first time its localStorage key is read
  (e.g. `pithi_local_ceremonies`, `pithi_local_services`, `pithi_local_bookings`,
  `pithi_local_guests`, `pithi_local_transactions`, `pithi_local_reviews`, …),
  many with bilingual Khmer/English sample content.

## Function catalogue

All functions live in `dataService.ts` and return promises. Reads that paginate
return a `PaginatedResponse<T>` (`{ data, total, page, limit, totalPages }`).

**Ceremonies:** `getCeremonies`, `getCeremonyById`, `createCeremony`,
`updateCeremony`, `deleteCeremony`

**Services (marketplace):** `getServices`, `getMyServices`, `getServiceById`,
`createService`, `updateService`, `deleteService`

**Bookings:** `getBookings`, `getBookingsByService`, `getBookingById`,
`createBooking`, `updateBookingStatus`, `updateBookingSchedule`,
`updateBookingQuantity`, `deleteBooking`, `getBookingComments`,
`addBookingComment`, `getBookingLogs`, plus `resolveBookingTotals`
(`unitPrice × quantity → price`)

**Guests & invitations:** `getGuests`, `addGuest`, `deleteGuest`,
`getMyInvitations`, `respondToInvitation`, `getInvitationTemplates`,
`saveInvitationTemplate`, `deleteInvitationTemplate`, and the anonymous-guest
pair `getPublicInvitation` / `submitPublicRsvp` (Postgres RPCs — see
[invitations-and-rsvp.md](invitations-and-rsvp.md))

**Messaging & announcements:** `chatService.ts` holds `getConversations`,
`getConversation`, `getUnreadMessageCount`, `sendDirectMessage`,
`markConversationRead`, `subscribeToMessages`; `dataService` holds
`getAnnouncements`, `createAnnouncement`, `deleteAnnouncement`

**Ceremony status helpers:** `getCeremonyStatus`, `isCeremonyExpired`

**AI context:** `getAssistantSnapshot`

**Finance:** `getTransactions`, `addTransaction`, `deleteTransaction`,
`reportTransaction`, `getMyReportedTransactions`, `getPendingReportedTransactions`,
`confirmReportedTransaction`, `rejectReportedTransaction`

**Reviews:** `getReviews`, `addReview`

**Community feed:** `getSocialPosts`, `createSocialPost`, `reactToPost`,
`bookmarkPost`, `getPostComments`, `addPostComment`

**Admin / stats:** `runCleanup`, `getSystemStats`, `getCleanupStats`,
`getUserCalendarEvents`, `getRecentActivities`

### Notable behaviors
- **Booking logs** are written automatically: `createBooking` logs `CREATED`,
  `updateBookingSchedule` logs `SCHEDULE_CHANGE`, `updateBookingQuantity` logs
  `QUANTITY_CHANGE`.
- **Writes another person must see** — bookings, booking comments, guest RSVPs,
  announcements and direct messages — surface their error instead of falling back
  to localStorage. A local-only copy looks like success to the sender while the
  recipient never receives anything.
- **Gift confirmation** (`confirmReportedTransaction`) converts KHR to USD at a
  fixed **÷ 4000** rate and inserts a matching INCOME transaction.
- **Reactions/bookmarks** call the Postgres `increment_post_stat` /
  `decrement_post_stat` RPCs to keep counters atomic, and enforce one reaction
  per user per post.
- **Admin stats/cleanup** (`getSystemStats`, `getCleanupStats`, `runCleanup`,
  `getUserCalendarEvents`, `getRecentActivities`) talk to Supabase directly and
  have **no** localStorage fallback.

## Image storage (`storageService.ts`)

A single public Supabase Storage bucket named **`PITHI`**, with folders
`services/`, `ceremonies/`, `receipts/`, `templates/`, and `chat/` (the last one
holds chat photos and voice notes).

- **`uploadImage(file, folder)`** returns a public URL. In mock mode it returns a
  base64 data URL instead. It even attempts to **auto-create the bucket** if it's
  missing, and on any failure falls back to a base64 data URL so a form submit
  never fails mid-demo. It logs a ready-to-run SQL snippet for setting up the
  bucket + policies.
- **`deleteImage(url)`** removes an object, but only if the URL points into the
  `PITHI` bucket (external URLs are ignored).

## Supabase client (`supabaseConfig.ts`)

Creates the shared `supabase` client. Note the URL and anon key are currently
**hardcoded** here rather than read from the `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` variables documented in `.env.example`. The anon key is
safe to expose (RLS protects the data), but wiring it to env vars would be more
conventional.
</content>
