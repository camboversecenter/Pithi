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

## Feature catalogue

| Feature | Function | Model | Fallback |
|---------|----------|-------|----------|
| Ceremony plan | `generateCeremonyPlan(type)` | `gemini-3.5-flash` | Rich per-type Khmer plan text (tone shifts solemn for funerals) |
| Invitation message | `generateInvitationMessage(type, host)` | `gemini-3.5-flash` | Per-type Khmer message templates |
| Ceremony banner | `generateCeremonyBanner(type)` | `gemini-2.5-flash-image` (16:9) | **Canvas-drawn** banner (`createProceduralBanner`) |
| Service description | `generateServiceDescription(name, role)` | `gemini-3.5-flash` | Role-specific Khmer blurb |
| Service photo | `generateServicePhoto(name, role)` | `gemini-2.5-flash-image` (4:3) | **Canvas-drawn** photo (`createProceduralServicePhoto`) |
| Receipt OCR | `scanBankReceipt(image)` | `gemini-2.5-flash` (vision + JSON) | `null` |
| Business-card OCR | `scanBusinessCard(image)` | `gemini-2.5-flash` (vision + JSON) | `null` |
| Post moderation | `moderateSocialPost(title, content)` | `gemini-3-flash-preview` (JSON) | `{ allowed: true }` |
| Chat assistant | `chatWithAI(context, history)` | `gemini-3-flash-preview` (tools) | Error message string |

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

`chatWithAI` gives Gemini two tools — `createCeremony` and `bookService`. When the
model calls a tool, the **client executes it** against `dataService`:
- `createCeremony` → `createCeremony(...)` for the current user.
- `bookService` → resolves the named ceremony and service from the user's data,
  then `createBooking(...)`.

This is what lets a user type "book a chef for the 20th" and have the booking
actually created. The assistant replies in Khmer. In mock mode, the local
simulation recognizes intent keywords and returns matching tool calls so the
demo flow works offline.

## Configuration

To enable real AI, set the `GEMINI_API_KEY` secret on the deployed `gemini-proxy`
Edge Function. With no key (or in mock mode), every feature still works via the
fallbacks above.
</content>
