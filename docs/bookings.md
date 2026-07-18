# Bookings

Files: `pages/BookingHistory.tsx`, `pages/BookingDetail.tsx`, booking functions in
`services/dataService.ts`. Bookings are created from the Marketplace (see
`marketplace-and-services.md`).

## Booking lifecycle

A booking moves through four statuses (`BookingStatus`):

```
           provider accepts              provider completes
PENDING ────────────────────► CONFIRMED ────────────────────► COMPLETED
   │                              │
   │ provider rejects /           │ either party cancels
   │ client deletes               ▼
   └──────────────────────────► CANCELLED
```

Every booking is created as **PENDING**. Status changes go through
`updateBookingStatus` — there is no server-side transition validation; the
allowed transitions are enforced entirely by which buttons the UI shows.

## Booking History (`/bookings`)

A unified list for both sides of a booking. Role decides the perspective inside
`getBookings`:
- **Clients** (`GENERAL_USER`, `ORGANIZER`) see bookings they made
  (`bookedByUserId`).
- **Vendors** see bookings placed against their services (`providerId`).

Two tabs — `ការកក់បច្ចុប្បន្ន` (upcoming, `date ≥ today`) and `ការកក់ចាស់ៗ`
(past, `date < today`) — over a table of ceremony, service, date/time, price,
status badge, and a details link to `/booking/:id`. Paginated 10 per page.

## Booking Detail (`/booking/:id`)

The full record plus a collaboration surface for one booking. It loads the
booking, its ceremony, its service, its comments, and its logs in parallel.

Two flags govern everything:
- `isProvider = currentUser.id === booking.providerId`
- `isPastBooking = booking.date < today` (disables all actions and the chat)

### Layout
- **Service info card** — image, name, description, location/map link, and a grid
  of date, time, and **total price** (`booking.price`, the snapshot taken at
  booking time).
- **Party card** — shows `អតិថិជន` (customer) to the provider, or
  `អ្នកផ្តល់សេវា` (provider) to the client.
- **Ceremony summary** — title, type, location, and a "Go to ceremony" button
  that routes organizers to `/organizer`, owners to `/owner`, and anyone else to
  the public `/invitation/:id` view.
- **Activity feed** (`ការពិភាក្សា & ប្រវត្តិ`) — see below.

### Actions by role and stage
Provider (while not past):
- PENDING → **Accept** (`ទទួល` → CONFIRMED) or **Reject** (`បដិសេធ` → CANCELLED)
- CONFIRMED → **Complete** (`បញ្ចប់` → COMPLETED) or **Cancel** (→ CANCELLED)
- Any time → **Edit schedule** (`កែប្រែកាលវិភាគ`) — date/start/end, recorded to
  the log as a `SCHEDULE_CHANGE`

Client/booker (while not past):
- PENDING → **Delete booking** (`លុបការកក់`, hard delete)
- CONFIRMED → **Cancel** (→ CANCELLED)
- Clients cannot confirm or complete.

Any move to CANCELLED prompts a confirmation dialog. Once a booking is past, all
mutating actions and the chat are hidden. `COMPLETED` and `CANCELLED` are
terminal in the UI.

### Activity feed: comments + audit log
The feed merges two streams, sorted by time:
- **Comments** — chat bubbles (right/rose for you, left/white for the other
  party). `addBookingComment` posts a new message; Enter sends. The input is
  disabled on past bookings.
- **Logs** — centered gray system pills. Written automatically by the data layer:
  `CREATED` on booking creation and `SCHEDULE_CHANGE` on reschedule (via
  `addBookingLog`). Logs are read-only audit records.

## Related data functions

`getBookings`, `getBookingsByService`, `getBookingById`, `createBooking`,
`updateBookingStatus`, `updateBookingSchedule`, `deleteBooking`,
`getBookingComments`, `addBookingComment`, `getBookingLogs` — all with the
Supabase ⇄ localStorage fallback. None of the booking screens use AI.
</content>
