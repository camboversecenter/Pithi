# Direct Messages & Announcements

Files: `pages/Messages.tsx`, `components/ChatComposer.tsx`,
`components/AnnouncementsPanel.tsx`, `services/chatService.ts`, announcement
functions in `services/dataService.ts`.

Two complementary channels: a **one-to-one thread** between any two accounts,
and a **one-to-many broadcast** from a host or a vendor.

## Direct messages (`/messages`)

A thread does **not** require a booking, so terms can be discussed before
anything is committed:

| Who | Reaches whom | Entry point |
|-----|--------------|-------------|
| Event owner / organizer | A vendor | 💬 button on the Marketplace service card |
| Either party of a booking | The other party | "ផ្ញើសារផ្ទាល់" under the booking chat |
| Event owner | The organizer who set the event up | Organizer card in the ceremony overview |
| Organizer | The event owner they book for | Owner card in the ceremony overview |
| Guest | The ceremony owner | Owner card in `/invited` detail |

The page is a conversation list plus a thread. `getConversations` folds the flat
message table into one row per partner (last message, unread count) and decorates
it with the partner's name, role and avatar. Opening a thread marks the incoming
messages read; new messages arrive over Supabase Realtime.

`sendDirectMessage` refuses an empty message and **surfaces failures** — a
message stored only in the sender's browser would never reach anybody.

### Attachments
`ChatComposer` is shared by direct messages, the booking chat, and the AI
assistant. It sends:
- **text**,
- a **photo** (`image/*`, max 8 MB), and
- a **voice note** recorded in-page with `MediaRecorder` (webm/m4a/ogg depending
  on the browser), with a live timer and a preview before sending.

Attachments upload to the `chat/` folder of the `PITHI` bucket
(`uploadImage(file, 'chat')`) and are stored as `attachmentUrl` +
`attachmentType` (`IMAGE` | `AUDIO`). `ChatAttachmentView` renders an image as a
clickable thumbnail and audio as a player.

### Storage & security
`direct_messages` rows are visible only to the sender and the recipient
(`auth.uid()` must match one of them); a row can only be inserted as yourself.
The `notify_on_direct_message` trigger pushes a `MESSAGE` notification to the
recipient, deep-linking to `/messages?with=<senderId>`.

## Announcements

A host or vendor writes once and every relevant person is notified.

| Audience | Who may post | Who receives it |
|----------|--------------|-----------------|
| `CEREMONY_GUESTS` | The ceremony's owner or organizer | Every guest of that ceremony who has an account, plus the other planner |
| `VENDOR_CLIENTS` | Any service provider | Every client with a PENDING / CONFIRMED / COMPLETED booking against them |

The UI is `AnnouncementsPanel`: a compose form (title + message), the recipient
rule spelled out, and the history of what was already sent with its recipient
count. It appears as the **ជូនដំណឹង** tab in the Owner portal, the Organizer
portal (per ceremony), and the Vendor portal (per vendor).

`createAnnouncement` inserts one row; the `fanout_announcement` trigger walks the
guest list (or the vendor's clients) and writes an `ANNOUNCEMENT` notification
for each recipient, then records how many were reached in `recipientCount`.
Row-Level Security enforces the "who may post" column above, so a guest cannot
broadcast to a ceremony and a vendor cannot post to somebody else's clients.

Guests without an account cannot receive in-app announcements — there is nobody
to notify. They still see the shared invitation link.
