# Owner Portal

Route: `/owner` · Role: `GENERAL_USER` (event owner/host) · Files:
`pages/OwnerPortal.tsx` and `components/Owner/*`

The Owner Portal (`កម្មវិធីរបស់ខ្ញុំ` — "My events") is where an event host
creates and manages **their own** ceremonies. It mirrors the
[Organizer Portal](organizer-portal.md) — same list/form/detail views, same
guest/invitation/plan tabs, same AI helpers — with two differences:

1. There is **no Assign-Owner step**; `ownerId` is always the current user.
2. It **adds a Budget tab** (`ថវិកា`), which is the owner's distinctive feature.

The Overview, Guests, Invitations, and Plan tabs behave exactly as documented in
[organizer-portal.md](organizer-portal.md). This page covers the Budget tab.

## Budget tab (`components/Owner/OwnerBudget.tsx`)

The financial hub for a ceremony. When the detail view loads, the portal also
fetches `getTransactions` and `getPendingReportedTransactions` to feed this tab.

### Summary
Three cards computed from the ceremony's transactions:
- **Expense** (`ចំណាយ`) = sum of `EXPENSE` amounts
- **Revenue** (`ចំណូល`) = sum of `INCOME` amounts
- **Balance** (`សមតុល្យ`) = revenue − expense

All shown in USD.

### Manual entries
The **Add** button opens a transaction modal: type (Income/Expense, default
Income), amount, description/name, and category (Gift `ចំណងដៃ`, General, Food,
Decoration). Backed by `addTransaction`. Each ledger row can be deleted.

### Confirming guest gift reports (the KHQR flow)
This is the second half of the guest gift flow that starts on the invitation
pages (see [invitations-and-rsvp.md](invitations-and-rsvp.md)):

1. Guests scan the ceremony's **KHQR** code, pay, upload their bank receipt, and
   the receipt is OCR-scanned by AI — creating a **pending reported transaction**.
2. In the Budget tab, a `សំណើផ្ទេរប្រាក់ដែលរង់ចាំការបញ្ជាក់` ("transfers awaiting
   confirmation") section lists each pending report with its receipt thumbnail,
   guest name, amount, and currency.
3. The owner clicks **Accept** (`ទទួល`) or **Reject** (`បដិសេធ`):
   - Accept → `confirmReportedTransaction` marks it CONFIRMED **and
     auto-creates an INCOME transaction** in the ledger (category `Gift`, donor =
     guest name). **KHR amounts are converted to USD at a fixed 1 USD = 4000 KHR
     rate** before being recorded.
   - Reject → `rejectReportedTransaction` deletes the report.

So a guest's cash gift becomes a confirmed budget line only after the owner
approves it.

## Data & AI functions used

Data: the ceremony/guest/invitation/plan functions shared with the Organizer
Portal, plus `getTransactions`, `addTransaction`, `deleteTransaction`,
`getPendingReportedTransactions`, `confirmReportedTransaction`,
`rejectReportedTransaction`. The Budget tab itself makes no AI calls.
</content>
