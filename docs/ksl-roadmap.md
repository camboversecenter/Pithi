# Khmer Sign Language (KSL) Model — Roadmap

> **Status: exploratory initiative.** This is a research/accessibility roadmap
> being explored alongside PITHI (e.g. as a future Deaf-accessibility feature or
> a standalone CamboVerse project). It is **not** part of the shipped PITHI web
> app. It is captured here so the plan and expectations are documented and
> shareable.

**North star:** point a camera at someone signing naturally → fluent Khmer on
screen.

**Reality:** that full capability is a multi-year research goal — unsolved today
for *every* sign language, not just KSL. The path below ships useful things early
and builds the data and community relationships needed to climb toward it.

## Phases at a glance

| Phase | Goal | Data needed | What you can build | Status |
|------|------|-------------|--------------------|--------|
| **0. Foundations** | Consent, ethics, data pipeline | DDP permission + lesson list | A labeled KSL keypoint dataset | Do first |
| **1. Isolated signs (ISLR)** | Recognize **one clear sign** from a fixed vocabulary | DDP tutorials (multi-teacher) | **Learning app + sign↔Khmer dictionary** | **← current** |
| **2. Narrow-domain phrases** | Translate short sentences in **one domain** | *New:* continuous, sentence-level clips + Khmer, in-domain | Clinic/greeting phrase helper | Medium term |
| **3. Natural translation** | Open-domain signing → fluent Khmer | Large continuous corpus + facial modeling | The camera→captions vision | Long term / research |

Primary data source under consideration: the **Deaf Development Programme (DDP)**
"Learn Cambodian Sign Language" tutorial series — isolated signs, labeled in
Khmer + English, performed by **multiple teachers** (signer diversity is the key
ingredient for a model that generalizes). Use only **with DDP's consent and
credit**.

---

## Phase 0 — Foundations (before any modeling)

- **DDP agreement**: scope (download → train → what may be released), credit
  wording, the full lesson list / source files, a native signer to validate
  labels, and consent handling for any videos featuring minors.
- **Community**: involve Deaf signers as owners of the language, not just as a
  data source.
- **Pipeline**: `yt-dlp` → detect the label cards → OCR the English gloss → cut &
  trim each sign → **MediaPipe** keypoints → dataset. Prefer releasing
  **keypoints** (derived features), not raw video.
- **Deliverable:** a documented dataset — *N signs × M teachers* — with a
  **signer-independent** train/test split.

---

## Phase 1 — Isolated Sign Recognition ← CURRENT STAGE

**Goal:** given a short clip of **one sign, performed clearly, facing the
camera**, output the Khmer word (with top-k alternatives).

**Data:** the DDP tutorial channel — already isolated, already labeled in Khmer +
English, and multi-teacher. Pilot on 1–2 lessons (~15–50 signs), then scale to a
few hundred signs.

**Method:** MediaPipe keypoints → fine-tune a pose-based recognizer (e.g.
OpenHands), **evaluated on held-out teachers**.

**Products this enables:**
1. **KSL learning & practice app** — learner performs a sign to webcam and gets
   feedback. Input conditions match the training data, so this is the strongest
   fit.
2. **Sign ↔ Khmer dictionary** — forward = Khmer word → sign video (lookup);
   reverse = sign → Khmer word (the model).

### ⭐ Expected result of the current stage

For a vocabulary of roughly **100–300 signs**, with **enough teachers per sign**
and clear front-facing signing:

- **Top-1 accuracy ≈ 70–90%**, with **top-5 notably higher** — measured on
  **held-out teachers** (the honest, signer-independent number; a random split
  would look inflated).
- **Near real-time** per clip on a normal laptop/phone.
- **Does well:** isolated, clear, in-vocabulary signs → a working dictionary and
  a practice-feedback tool.
- **Does not do:** conversational/continuous signing, messy real-world video, or
  anything outside the trained vocabulary.

> These figures are **estimates, not guarantees.** They improve with: smaller
> vocabulary, more **samples per sign** (aim for ≥ 20–30 across teachers), more
> distinct **teachers**, and consistent signing clarity.

**Success criteria:** signer-independent top-1 clears the usability bar (e.g.
≥ 80% for the dictionary, with top-5 as a safety net) on teachers the model never
trained on.

---

## Phase 2 — Narrow-domain phrases (medium term)

- **Needs new data:** continuous, **sentence-level** KSL clips paired with
  **Khmer translations**, in one chosen domain (greetings, clinic intake, …),
  across many signers — a real collection effort with DDP and the Deaf community.
- **Method:** continuous recognition (CTC) → gloss sequence → gloss→Khmer
  (fine-tune NLLB/mBART), or an end-to-end translation model.
- **Expected result:** useful for **constrained phrases in that domain**; still
  error-prone; not general conversation.

## Phase 3 — Natural translation (long term, research)

- **Needs:** a large continuous corpus + **facial / non-manual** modeling
  (expressions carry grammar) + a research team, over years.
- **Expected result:** research-grade and partial; **complements human
  interpreters, never replaces them** in medical, legal, or emergency settings.

---

## Cross-cutting principles (every phase)

- **Signer-independent evaluation** always — otherwise the accuracy numbers lie.
- **Consent + credit + Deaf-community governance.**
- **Never** rely on the model alone for high-stakes communication.

## Immediate next steps

1. Secure DDP's written consent and the full lesson list.
2. Run the extraction pipeline on **1 lesson × ~3 teachers** to prove the whole
   chain end to end.
3. Train a first ISLR model on that pilot; report **held-out-teacher** accuracy.
4. If the pilot clears the bar, scale to the full channel and wrap it in the
   dictionary / practice app.

## Why sign → Khmer is hard (context for expectations)

Natural signing is far harder than isolated recognition because: signs blend
together with **no gaps** to segment; sign grammar and word order **differ from
Khmer** (it is translation, not transcription); **facial expressions carry
grammar**; real-world video is visually messy; and continuous translation needs
**hours of sentence-level data** that does not yet exist for KSL. This is why the
roadmap ships the achievable dictionary/practice tool first and treats
camera-to-captions translation as the long-term research goal.
</content>
