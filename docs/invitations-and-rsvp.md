# Invitations, RSVP & Guest Gifts

Files: `pages/InvitationCard.tsx` (public), `pages/InvitedCeremonies.tsx`
(authenticated), plus guest/report functions in `services/dataService.ts`.

There are **two RSVP entry points** that serve different audiences.

## 1. Public invitation card (`/invitation/:id`)

The shareable, styled invitation opened from a link (optionally
`?type=VIP` etc. to select a guest tier). Designed for **guests who are not
logged in**, but it also works for signed-in users (name auto-filled, captcha
skipped).

### What loads
`getCeremonyById` + `getInvitationTemplates`. If a `?type=` is present, the
matching template overrides the ceremony's banner, message, and expiration date.
If today is past the template's (or ceremony's) date, the invitation is marked
**expired**.

### The card
An envelope-style card with a banner (or the ceremony's `themeColor`), a
guest-type badge (VIP shows a crown), the ceremony title, the invitation message
(Markdown), and a date/location/expiry block. A share bar offers native
share / copy-link.

### RSVP flow
- If expired → a red "invitation has expired" notice.
- Otherwise a guest sees a form: an optional **business-card scanner**
  (`scanBusinessCard` OCR auto-fills name + phone), a name field, an optional
  phone field, and an **anti-spam math captcha**.
- Submitting calls `addGuest({ ceremonyId, name, phoneNumber, guestType })` with a
  default status of PENDING. There is a 60-second client-side rate limit
  (`localStorage.last_rsvp_time`) and captcha validation for guests. Success shows
  a thank-you confirmation.

This entry point is a **one-way "confirm attendance"** for people without
accounts.

## 2. Invited Ceremonies (`/invited`)

The authenticated guest's dashboard of ceremonies they were invited to. Requires
login. A list view (tabs: current `UPCOMING` / past `PAST`, 9/page) and a detail
view addressed by `?id=`.

### Two-way RSVP
In the detail view, a pending invite offers **Attend** (`ចូលរួម` → ACCEPTED) and
**Decline** (`មិនចូលរួម` → DECLINED). Once answered, a status banner appears with a
**Change** (`ផ្លាស់ប្តូរ`) link that resets to PENDING. Backed by
`respondToInvitation`.

### Reporting a gift / bank transfer
For upcoming ceremonies, guests can report a cash gift:
1. **Scan QR / Report** opens a modal showing the ceremony's **KHQR** image
   (`khqrUrl`) to pay against.
2. The guest **uploads their bank receipt**; `scanBankReceipt` OCRs it into an
   editable form (amount, currency USD/KHR, sender name, date).
3. Submitting uploads the receipt to the `receipts` bucket and calls
   `reportTransaction(...)`, creating a **PENDING** reported transaction. A guest
   can see their own report history with its confirmation status.

The ceremony owner later confirms or rejects that report from the
[Owner Portal Budget tab](owner-portal.md) — and on confirmation it becomes a
budget income line (with KHR converted to USD at 1:4000).

## Related data / AI / storage functions

Data: `getCeremonyById`, `getInvitationTemplates`, `addGuest`,
`getMyInvitations`, `respondToInvitation`, `reportTransaction`,
`getMyReportedTransactions`. AI: `scanBusinessCard`, `scanBankReceipt`. Storage:
`uploadImage(file, 'receipts')`. Auth: `getUserById`, `getCurrentUser`.
</content>
