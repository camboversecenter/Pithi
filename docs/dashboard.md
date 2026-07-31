# Home Dashboard

Route: `/` · All logged-in roles · File: `pages/Dashboard.tsx`

The role-adaptive landing screen. Its quick actions, stats, and feeds change with
the user's role.

## Layout

- **Header** — Khmer-localized date, a `សួស្តី, {name}` greeting, and a Sparkles
  button that opens the **PITHI AI assistant** chat.
- **Hero status card** — celebratory card if there's a ceremony **today**
  (with that event's own banner), otherwise a neutral "no program today" card. It
  is deliberately independent of the calendar selection: tapping a past date used
  to swap this card's title while it still said "today" with today's date.
- **Quick actions** — role-specific shortcuts:
  - `GENERAL_USER` → My Events (`/owner`)
  - `ORGANIZER` → Manage (`/organizer`)
  - non-vendors → Marketplace (`/marketplace`)
  - everyone → Bookings (`/bookings`; labelled "Jobs" for vendors), badged with
    the upcoming booking count
  - everyone → Messages (`/messages`) and Invitations (`/invited`, badged with
    the pending-invite count)
- **Left column** — pending invitations (with an inline **Attend/accept** button)
  and a recent-activity feed. Each activity row links to its `/booking/:id`
  record, and a "see all bookings" link sits underneath.
- **Right column** — a `CalendarView` plus the **selected day's** schedule,
  headed by that day's date and an upcoming/past chip. Each event shows its own
  picture (greyed out when the day is in the past).

## AI assistant

The Sparkles button opens a chat modal wired to `chatWithAI`, which receives an
`AssistantSnapshot` (the user's ceremonies, bookings and the marketplace, rebuilt
each turn) plus the full message history — so answers cite the user's real events
rather than generic advice. Messages can carry a **photo** or a **voice note**.
Because `chatWithAI` supports **function calling**, the assistant can create
ceremonies and book services conversationally in Khmer, and the dashboard
refreshes afterwards — see [ai-assistant.md](ai-assistant.md).

## Data & AI functions

Data: `getRecentActivities`, `getMyInvitations`, `getUserCalendarEvents`,
`getCeremonies`, `getBookings`, `respondToInvitation`, `getAssistantSnapshot`.
AI: `chatWithAI`.

Notes:
- Only **Accept** is offered inline here; declining an invitation is done on the
  [Invited Ceremonies](invitations-and-rsvp.md) detail view.
- Vendor "income" on the dashboard is the sum of `COMPLETED` booking prices
  (rating is a fixed demo value).
</content>
