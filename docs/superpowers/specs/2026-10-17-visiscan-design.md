# VisiScan — Design

Date: 2026-10-17

## Intent

Field executives visit businesses and collect visiting cards. Typing every detail by hand
wastes time standing in front of the client. VisiScan lets them photograph the card
(front and back), an AI model reads it, a pre-filled form opens, they fix anything wrong,
and save. That is the whole job of the app.

First use: a demo to a client. The app must look visually stunning — that is as important
as working. What people do with the contacts afterwards is not the app's concern; it only
collects and displays them neatly.

**Scope: demo only for now.** No backup/export needed yet.

**Build workflow (user's):** pnpm. User runs `pnpm expo prebuild`, then
`pnpm expo run:ios --device` on their iPhone for development, and builds the Android APK
with `./gradlew assembleRelease` to hand out. Builder delivers the Expo project and makes
sure prebuild + both builds work; no EAS, no store setup.

## Goals

- Scan front + back of a visiting card, extract all details, review/edit, save locally.
- Accuracy even on low-end phones, bad light, bad angles (this is why plain OCR was rejected).
- Premium, minimal but colourful visual identity: saturated pastels, real depth/3D, never flat.
- Smooth on older, slower Android phones.
- Works on all phone sizes and tablets, portrait and landscape.

## Non-goals (for now)

- No login, no accounts, no backend, no sync between phones. An API comes later.
- No actions on contacts (call, email, export, share). They only view.
- No multi-card batch scanning — one card per scan.

## Anti-goals

- Flat UI. Washed-out or neon colours.
- Janky animation on old Androids.
- Wrong data saved silently — the executive always sees and confirms before save.

## Fields captured

All fields from the card. Lists where cards commonly carry several.

- Business name
- Contact person, designation
- Mobile numbers (list)
- Landline / office numbers (list)
- Email IDs (list)
- Addresses (list, multi-line each)
- Website
- GST number
- Business description / "what they do" line
- Any other text not fitting above → "other" free-text field (so nothing on the card is lost)
- Notes (typed by the executive, not extracted)
- Front photo, back photo (back optional — some cards are blank on the back)
- Created / updated timestamps
- Assigned pastel colour (picked once at save, stays fixed)

## Screens and flow (decided with the user)

1. **Home** opens directly (no login). Header "VisiScan" + card count.
   - Search bar: filters by name, company, any number, city/address text.
   - Filter chips: All / Today / This week.
   - View toggle top-right: **Stack** or **List**. Choice remembered across launches.
   - **Stack view**: saved contacts drawn as physical business cards fanned in a deck,
     each in its pastel colour with a light sheen, swipe through them.
   - **List view**: plain rows (colour strip, company, person + main number, date). For fast
     scrolling by people who don't care for animation.
   - Big dark "Scan a card" button pinned to the bottom.
2. **Scan**: capture front, then back (with a clear "skip — back is blank" option).
3. **Review form**: opens pre-filled after extraction. Every field editable; list fields
   can add/remove items. Photos visible so the executive can compare. Save / discard.
4. **Detail**: one saved contact, shown as the hero business card with all fields laid out
   neatly; original photos viewable. Edit and delete available *(my call: needed to fix
   mistakes found later)*.

Mockups of Home (both views) and the palette: `.superpowers/brainstorm/*/content/style-b-v2.html`.

## Visual identity (decided with the user)

- Palette: Peach `#FFB59A`, Lilac `#C3B1FF`, Mint `#9EE6C4`, Sky `#A9C8FF`, Butter `#FFE08A`,
  Rose `#FFB3C7`; Ink (deep plum) `#231C2E`; Paper (warm off-white) `#FBF7F2`;
  Muted text `#7D7389`.
- Depth from layered shadows, gradients, light sheens, inner highlights. **No live blur**
  (too slow on old Android).
- Fonts: Bricolage Grotesque (headings), Plus Jakarta Sans (body), bundled. Font family is
  fixed — the app never switches to the system font.
- Animation wherever it adds polish (deck swipe, screen transitions, press feedback, card
  flip to see photos, save success), driven on the UI thread.
- Light theme only *(my call: the palette is designed for paper background)*.

## Responsive and type scaling (decided with the user)

- Layout adapts to phone sizes, tablets, portrait and landscape. *My calls:* list view goes
  to 2–3 columns on wide screens; stack view stays centred with a max card width; review
  and detail screens go side-by-side (photos | fields) in landscape / tablet.
- Font sizes are dynamic: scale with screen size, and honour the user's system text-size
  setting, capped so layouts don't break *(my call: cap ~1.3–1.4×)*.

## Technical decisions

User's:
- Expo app, Android + iOS.
- Google Gemini (Flash family — cheapest model with strong accuracy) for extraction.
- Local storage on the device only.
- Gemini API key bundled from `.env.local` (`EXPO_PUBLIC_GEMINI_API_KEY`, optional
  `EXPO_PUBLIC_GEMINI_MODEL`), so many testers can use the APK without entering a key.
  No settings screen. Accepted risk: key extractable from the APK. Mitigations: restrict key
  to the Generative Language API, budget cap, rotate after testing; server proxy when the API
  is built.

My calls:
- **Image clean-up before AI**: use the platform document scanner (ML Kit Document Scanner
  on Android, VisionKit on iOS) for auto-crop, deskew and enhancement. If unavailable on a
  device, fall back to the plain camera. This needs a development build (not Expo Go).
- Resize/compress images before upload (~1600 px long edge, JPEG) to keep requests fast on
  weak networks and keep storage small.
- One Gemini request per card with both images, using structured JSON output matching the
  field list. Model ID kept in one constant; builder confirms the current cheapest Flash /
  Flash-Lite model from Google's docs and tests accuracy on real cards before choosing.
- Storage: SQLite (`expo-sqlite`) for records, photos as files in the app document dir.
- No network / extraction failure: show a clear message with **Retry** or **Fill manually**
  (opens the same form empty with the photos attached). Never lose the captured photos.
- **Non-Latin text** (Hindi etc.): extract text exactly as printed. Bundle Noto Sans
  Devanagari as the one allowed fallback font so it never shows as boxes.
- **Data safety**: records use UUIDs + created/updated timestamps and a schema version with
  migrations from day one, so upgrades never wipe data and a later API sync is clean.
- Free tier is fine for development; for real client data, use the paid tier (free tier
  inputs may be used by Google for training).

## Performance on old Android

- Animations on UI thread (Reanimated); stack renders only the top few cards.
- List view virtualised.
- Thumbnails, not full photos, in lists.
- Respect the system "reduce motion" setting.

## Left to the builder

- Exact animation timings, spacing scale, icon set, component structure.
- Exact responsive breakpoints.
- App icon and splash, consistent with the palette and fonts.
- Prompt wording for Gemini.
