# Home Dashboard

Route: `/` · All logged-in roles · File: `pages/Dashboard.tsx`

The role-adaptive landing screen. Its quick actions, stats, and feeds change with
the user's role.

## Layout

- **Header** — Khmer-localized date, a `សួស្តី, {name}` greeting, and a Sparkles
  button that opens the **PITHI AI assistant** chat.
- **Hero status card** — celebratory card if there's a ceremony today, otherwise a
  neutral "no program today" card.
- **Quick actions** — role-specific shortcuts:
  - `GENERAL_USER` → My Events (`/owner`)
  - `ORGANIZER` → Manage (`/organizer`)
  - non-vendors → Marketplace (`/marketplace`)
  - vendors → Jobs (`/bookings`), badged with upcoming booking count
  - everyone → Invitations (`/invited`), badged with pending-invite count
- **Left column** — pending invitations (with an inline **Attend/accept** button)
  and a recent-activity feed.
- **Right column** — a `CalendarView` plus the selected day's schedule.

## AI assistant

The Sparkles button opens a chat modal wired to `chatWithAI`, which receives the
current user + date as context and the full message history. Because `chatWithAI`
supports **function calling**, the assistant can create ceremonies and book
services conversationally in Khmer — see [ai-assistant.md](ai-assistant.md).

## Data & AI functions

Data: `getRecentActivities`, `getMyInvitations`, `getUserCalendarEvents`,
`getCeremonies`, `getBookings`, `respondToInvitation`. AI: `chatWithAI`.

Notes:
- Only **Accept** is offered inline here; declining an invitation is done on the
  [Invited Ceremonies](invitations-and-rsvp.md) detail view.
- Vendor "income" on the dashboard is the sum of `COMPLETED` booking prices
  (rating is a fixed demo value).
</content>
