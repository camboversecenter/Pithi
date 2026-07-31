# AI Features

File: `services/geminiService.ts` · Backend: `supabase/functions/gemini-proxy/`

All AI in PITHI runs on **Google Gemini**, reached through a Supabase Edge
Function proxy so the API key never touches the browser. Every AI feature is
built to **degrade gracefully** — if the proxy is down, the key is missing, or the
session is in mock mode, the app returns a plausible local result instead of
failing.

## How a call flows

`callGeminiFunction(action, payload)` is the single entry point:

1. If a `pithi_mock_user` exists, it **short-circuits to a local simulation**
   (`getLocalAISimulatedResponse`) — no network at all.
2. Otherwise it calls `supabase.functions.invoke('gemini-proxy', { action,
   payload })`.
3. On **any** error it logs a warning and falls back to the local simulation /
   canned response.

The Edge Function (`gemini-proxy/index.ts`, Deno) reads `GEMINI_API_KEY` from its
secrets and supports two actions: `generateContent` (text, JSON, vision, and
function-calling) and `generateImages` (extracts inline base64 image data).

Model IDs live in two constants at the top of `geminiService.ts` (`TEXT_MODEL`,
`IMAGE_MODEL`). They must name models the API actually serves: an invented ID
makes every proxy call fail, which quietly demotes the assistant to its offline
answers for good.

## Feature catalogue

| Feature | Function | Model | Fallback |
|---------|----------|-------|----------|
| Ceremony plan | `generateCeremonyPlan(type)` | `gemini-2.5-flash` | Rich per-type Khmer plan text (tone shifts solemn for funerals) |
| Invitation message | `generateInvitationMessage(type, host)` | `gemini-2.5-flash` | Per-type Khmer message templates |
| Ceremony banner | `generateCeremonyBanner(type)` | `gemini-2.5-flash-image` (16:9) | **Canvas-drawn** banner (`createProceduralBanner`) |
| Service description | `generateServiceDescription(name, role)` | `gemini-2.5-flash` | Role-specific Khmer blurb |
| Service photo | `generateServicePhoto(name, role)` | `gemini-2.5-flash-image` (4:3) | **Canvas-drawn** photo (`createProceduralServicePhoto`) |
| Receipt OCR | `scanBankReceipt(image)` | `gemini-2.5-flash` (vision + JSON) | `null` |
| Business-card OCR | `scanBusinessCard(image)` | `gemini-2.5-flash` (vision + JSON) | `null` |
| Post moderation | `moderateSocialPost(title, content)` | `gemini-2.5-flash` (JSON) | `{ allowed: true }` |
| Chat assistant | `chatWithAI(context, history)` | `gemini-2.5-flash` (tools, vision, audio) | Context-aware offline assistant |

## Tone awareness

Content generation is culturally tuned. Prompts instruct a **cheerful** tone for
weddings, birthdays, and housewarmings, and a **solemn, respectful** tone for
funerals and memorials. The canvas fallbacks follow suit — happy events get
gold/burgundy palettes, sad events get silver/charcoal (`isSad` detection on
`បុណ្យសព` / `បុណ្យ ៧ ថ្ងៃ`).

## Procedural image fallbacks

When image generation is unavailable, the app draws the image itself on an HTML5
Canvas — a decorated Khmer-style banner (lotus mandala, double gold borders,
corner flourishes, ceremony title) or a category-themed service photo (per-role
color scheme and icon). These are returned as JPEG data URLs, so the caller sees
a valid image either way.

## The chat assistant & function calling

`chatWithAI(snapshot, history)` takes an **`AssistantSnapshot`** — built by
`getAssistantSnapshot(userId, role, name)` — containing the signed-in user's
ceremonies (with UPCOMING/TODAY/PAST status), their bookings, and the current
marketplace listings. The snapshot becomes the system instruction, so answers
quote real titles, dates and prices instead of offering generic wedding advice.
It is refreshed on every turn, so an event created mid-conversation is
immediately known.

Two tools are exposed — `createCeremony` and `bookService`. When the model calls
one, the **client executes it** against `dataService`:
- `createCeremony` → `createCeremony(...)` for the current user. An unrecognised
  type is kept verbatim (falling back to `ផ្សេងៗ`), never coerced to a wedding.
- `bookService` → resolves the named ceremony and service from the user's data,
  then `createBooking(...)`, including a `quantity` when the user gave one.

Every tool result is reported back in the reply, and a failing tool returns the
reason rather than a silent nothing.

### Attachments
A message can carry a **photo** or a **voice note** (`ChatComposer` →
`ChatTurn.attachment`), sent to Gemini as `inlineData` alongside the text, so the
assistant can look at a venue photo or listen to a spoken request.

### The offline assistant
`buildOfflineAssistantResponse(userText, snapshot)` answers from the same
snapshot when the proxy is unreachable or the session is in mock mode: it lists
the user's upcoming events, their bookings and totals, computes budget vs.
committed spend, and parses "create …" / "book …" intents (extracting the type,
the date in `YYYY-MM-DD` or `DD/MM/YYYY`, and a quoted title) into real tool
calls. It asks for a missing date instead of inventing one.

## Configuration

To enable real AI, set the `GEMINI_API_KEY` secret on the deployed `gemini-proxy`
Edge Function. With no key (or in mock mode), every feature still works via the
fallbacks above.
</content>
