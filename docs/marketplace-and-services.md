# Marketplace & Vendor Services

Files: `pages/Marketplace.tsx` (client side), `pages/VendorPortal.tsx` (vendor
side), plus `services/dataService.ts` and `services/geminiService.ts`.

PITHI's marketplace is two-sided: **vendors publish services** in the Vendor
Portal, and **clients discover and book them** in the Marketplace.

## Vendor Portal (`/vendor`)

Used only by vendor roles (`CHEF`, `HALL`, `MUSIC_BAND`, `BEAUTY_SALON`). Titled
`គ្រប់គ្រងសេវាកម្ម` ("Manage services"). It lists the vendor's own services
(`getMyServices`, 9 per page) as cards with edit/delete controls, plus an "Add
new service" button.

### Creating / editing a service
The create/edit modal captures:
- **Name** (`ឈ្មោះសេវាកម្ម`, required)
- **Price** (`តម្លៃ ($)`, required) and an optional **price note**
  (`សម្គាល់តម្លៃ` — e.g. "per table", "starting from")
- **Unit label** (`ឯកតាគិតថ្លៃ` — e.g. តុ/table, ថ្ងៃ/day) and **deposit
  percent** (`ប្រាក់កក់ (%)`, default 50). The unit is what the client counts
  when booking; the percentage drives the deposit shown to them.
- **Payment QR** (`QR ទទួលប្រាក់កក់`) — the vendor's KHQR/bank image, shown to
  the client on the booking page with the deposit amount worked out
- **Location type** — `ទីតាំងថេរ` (FIXED) reveals **address** + **Google Maps
  URL** fields; `ចល័ត` (FLEXIBLE) marks it a mobile service
- **Image** — upload with preview, or generate one with AI
- **Description** — free text, or generate with AI

On save, the current user's `id`, name, and **role** are stamped onto the
service. A new image is uploaded via `uploadImage(file, 'services')` (replacing
and deleting the old one when editing); if no image is provided, a random
`picsum.photos` placeholder is used. Backed by `createService` / `updateService`.

### AI assistance (vendor only)
Both require the service name to be filled first:
- **Generate photo** (`ប្រើ AI បង្កើតរូបភាព`) → `generateServicePhoto(name, role)`
  produces a 4:3 promotional image (Gemini `gemini-2.5-flash-image`), falling
  back to a procedurally-drawn canvas photo. The result is converted to a `File`
  and flows through the normal upload path.
- **Generate description** (`ប្រើ AI បង្កើតអោយ`) →
  `generateServiceDescription(name, role)` writes a 2-sentence Khmer marketing
  blurb (Gemini `gemini-3.5-flash`), falling back to a role-specific canned
  string.

### Deleting
Delete asks for confirmation (`បញ្ជាក់ការលុប`), removes the stored image, then
calls `deleteService`.

> Marketplace and the booking screens contain **no** AI features — AI lives only
> in the Vendor Portal (and elsewhere in the app; see `ai-assistant.md`).

## Marketplace (`/marketplace`)

The client-facing discovery surface, shown to non-vendor roles. It reads the
current user but doesn't gate by role; however, **booking requires you to own at
least one ceremony**.

### Finding an organizer
`ORGANIZER` is one of the role filters (and one of the roles allowed to publish a
service), so event owners can find and book a planner in the same place they find
a chef or a hall.

### Browsing
- **Debounced search** (500 ms) over service name / provider name
  (`ស្វែងរកចុងភៅ, សម្អាងការ...`).
- **Category pills**: `ទាំងអស់` (All), `សម្អាងការ` (Beauty), `ចុងភៅ` (Chef),
  `ទីតាំង` (Hall), `ក្រុមតន្ត្រី` (Music).
- Responsive card grid, 9 per page, each showing image + role badge, name,
  location (mobile vs fixed), price + note, description, and star rating.

Data comes from `getServices(role, page, 9, search)`, with `getReviews()` for
ratings and `getCeremonies(...)` to populate the booking dropdown.

### Viewing a schedule
The calendar button opens a schedule modal (`getBookingsByService`) rendering a
`CalendarView` plus each day's booked slots (start–end with a `បានកក់` "Booked"
badge), so clients can see availability before booking.

### Reviews & ratings
The star button opens a reviews modal: average rating + count
(`getServiceRating`), an add-review form (1–5 star picker + comment →
`addReview`), and the review list. Reviews are global and **not** restricted to
users who actually booked the service.

### Creating a booking
The "Book now" (`កក់ឥឡូវ`) modal captures:
- **Ceremony** — a searchable select of the user's own ceremonies
- **Date** — `CalendarView` with `minDate = today`, showing busy/free slots for
  the chosen day
- **Start / end time** (validated so end > start)

- **Quantity** — a stepper labelled with the service's unit (e.g. how many
  tables). The modal shows the running **total** (`unitPrice × quantity`) and the
  deposit that will be due.

On confirm, `createBooking(...)` records a new **PENDING** booking with the
quantity, the unit price snapshot, and the computed total. If the user owns no
ceremonies, an amber warning (`អ្នកមិនទាន់មានកម្មវិធីទេ...`) blocks booking.

Each card also carries a 💬 button that opens a direct thread with the provider,
so price can be negotiated before (or instead of) booking.

### Empty states
- No services: `រកមិនឃើញសេវាកម្មដែលអ្នកកំពុងស្វែងរកទេ។`
- No reviews yet: `មិនទាន់មានការវាយតម្លៃនៅឡើយទេ។`

## Related data functions

`getServices`, `getMyServices`, `getServiceById`, `createService`,
`updateService`, `deleteService`, `getBookingsByService`, `getReviews`,
`addReview`, `createBooking`, `getCeremonies` — all in `dataService.ts` with the
standard Supabase ⇄ localStorage fallback.
