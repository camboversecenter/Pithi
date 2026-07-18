# Organizer Portal

Route: `/organizer` · Role: `ORGANIZER` · Files: `pages/OrganizerPortal.tsx` and
`components/Organizer/*`

The Organizer Portal (`គ្រប់គ្រងកម្មវិធី` — "Manage events") is where a
professional planner creates and runs ceremonies **on behalf of clients**. It is
nearly identical to the [Owner Portal](owner-portal.md); the two differences are:

1. The Organizer can **assign a different `GENERAL_USER` as the ceremony owner**.
2. The Organizer Portal has **no Budget tab** (budget is owner-managed).

## Three views

The page is a single-component state machine:
1. **List** (default) — a paginated grid of the organizer's ceremony cards
   (9/page), each with view / edit / delete. Empty state:
   `អ្នកមិនទាន់មានកម្មវិធីទេ។ សូមបង្កើតថ្មី។`
2. **Form** — full-page create/edit (`OrganizerCeremonyForm`).
3. **Detail** — hero banner + four tabs, addressed by `?ceremonyId=`.

## Create / edit a ceremony (`OrganizerCeremonyForm`)

Fields: **name** (required), **date** (required), **planned budget**, **location**,
**event type** (Wedding `អាពាហ៍ពិពាហ៍`, Birthday `ខួបកំណើត`, Housewarming
`ឡើងផ្ទះ`, Funeral `បុណ្យសព`, 7-day memorial `បុណ្យ ៧ ថ្ងៃ`, or a free-text
Other), a **banner** image, a **KHQR** bank-QR image (shown to guests so they can
send cash gifts), and a **welcome message**.

Two AI helpers: **generate banner** (`generateCeremonyBanner`) and **AI-write the
welcome message** (`generateInvitationMessage`).

Organizer-only: an **Assign Owner** card (`ចាត់តាំងម្ចាស់កម្មវិធី`) — a searchable
select of "Self" plus all General Users (`getUsers(GENERAL_USER)`), setting the
ceremony's `ownerId` so the assigned host sees it under "My Events." Saving
uploads any new banner/KHQR (deleting old ones first) and calls
`createCeremony` / `updateCeremony`.

## Detail tabs

| Tab | Khmer | Component | What it does |
|-----|-------|-----------|--------------|
| Overview | ទូទៅ | `OrganizerOverview` | Read-only summary: type, description, welcome message, budget, guest count |
| Guests | ភ្ញៀវ (N) | `OrganizerGuests` | Full guest-list management (below) |
| Invitations | លិខិតអញ្ជើញ | `OrganizerInvitations` | Invitation templates + shareable links (below) |
| Plan | ផែនការ | `OrganizerPlan` | AI-generated ceremony plan |

### Guests tab
Toolbar with five actions plus search and a status filter (All / Accepted /
Pending / Declined):
- **Invite** (`អញ្ជើញ`) — pick registered General Users → `addGuest` with a linked
  `userId`, status PENDING.
- **Copy** (`ចម្លង`) — copy the whole guest list from another of the organizer's
  ceremonies.
- **Import** (`នាំចូល`) — CSV upload (`Name,PhoneNumber,Type`), header auto-detected,
  downloadable template.
- **Export** (`នាំចេញ`) — download `Name,Phone,Type,Status` CSV.
- **Add** (`បន្ថែម`) — manual entry (name, phone, guest type General/VIP/Family).

Guests are paginated 12/page; each row can be deleted (with confirm).

### Invitations tab
Manages **invitation templates**. Each template targets a guest tier
(General/VIP/Family) and carries a message (AI-writable), an optional dedicated
banner (AI-generatable, uploaded to the `templates` bucket), and an expiration
date. Backed by `saveInvitationTemplate` / `deleteInvitationTemplate`. The
**Copy link** button (`ចម្លងតំណ`) copies the public URL
`…/#/invitation/{ceremonyId}?type={type}` for sharing.

### Plan tab
A single button (`បង្កើតផែនការ` / regenerate) calls
`generateCeremonyPlan(ceremony.type)` and renders the Markdown result. The plan
is not persisted — it lives only in component state.

## Data & AI functions used

Data: `getCeremonies`, `getCeremonyById`, `createCeremony`, `updateCeremony`,
`deleteCeremony`, `getGuests`, `addGuest`, `deleteGuest`,
`getInvitationTemplates`, `saveInvitationTemplate`, `deleteInvitationTemplate`.
AI: `generateCeremonyBanner`, `generateInvitationMessage`, `generateCeremonyPlan`.
Storage: `uploadImage`, `deleteImage`. Auth: `getUsers`, `getCurrentUser`.
</content>
