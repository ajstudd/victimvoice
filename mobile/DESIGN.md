---
name: Victim Voice Android
description: Calm, direct safety support on the user's terms.
colors:
  paper: "#FBF7F2"
  ink: "#30253D"
  muted: "#665B6D"
  coral: "#CB433C"
  error: "#A92E2A"
  jade: "#2C6D5D"
  lilac: "#ECE5F0"
  peach: "#F5DECC"
  line: "#E5DCE2"
  white: "#FFFFFF"
  field: "#FFFDFC"
  error-surface: "#F9E5E2"
  success-surface: "#E3EEE8"
  dark-muted: "#D6CBDF"
typography:
  title:
    fontFamily: "Lora"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: "43px"
    letterSpacing: "-1px"
  heading:
    fontFamily: "Lora"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: "30px"
    letterSpacing: "-0.4px"
  body:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22px"
  label:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  caption:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
  field:
    fontFamily: "Inter"
    fontSize: "15px"
    fontWeight: 400
  link:
    fontFamily: "Inter"
    fontSize: "13px"
    fontWeight: 600
  tab:
    fontFamily: "Inter"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "18px"
  tab-selected:
    fontFamily: "Inter"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "18px"
rounded:
  field: "14px"
  button: "16px"
  panel: "22px"
  chip: "24px"
spacing:
  field-gap: "8px"
  inline-gap: "12px"
  row-gap: "14px"
  button-inline: "18px"
  panel-inset: "20px"
  content-gap: "22px"
  page-inline: "22px"
  page-bottom: "32px"
components:
  button-plum:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "16px 18px"
  button-coral:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "16px 18px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "16px 18px"
  button-cream:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "16px 18px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.field}"
    padding: "15px"
  panel:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-inset}"
  chip:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    padding: "14px 17px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    padding: "14px 17px"
  row:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "17px 0"
  navigation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    typography: "{typography.tab}"
    padding: "7px 8px 0"
  notice:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.field}"
    padding: "14px"
  notice-error:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error}"
    typography: "{typography.caption}"
    rounded: "{rounded.field}"
    padding: "14px"
  notice-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.field}"
    padding: "14px"
---

# Design System: Victim Voice Android

## Overview

**Creative North Star: "Warm paper, clear next steps"**

Victim Voice's Android pilot pairs warm paper and plum structure with editorial serif headings and practical sans-serif controls. Generous controls, sparse choices and honest capability labels support quick action while leaving disclosure and escalation with the user.

The visual authority is the user's direct approval of revised board 05 ("okay build it"): `../design/app-concepts/05-redesigned-core-screens.png`. `DESIGN_BRIEF.md` is the direction contract: Operate for the app and Read for guide detail. No catalog FORM or QUALITY BAR selection is recorded as authority. This document describes the implemented native mobile system only; the separate website keeps its existing design.

The North Star above is a descriptive summary of the shipped system, not an additional user-selected concept. Source evidence is `src/components/ui.tsx`, the screen components, `src/app/_layout.tsx` and `app.json`. Product and behavior boundaries come from `../PRODUCT.md`, `../APP_PLAN.md`, `../ACTIVE_SAFETY.md`, `README.md` and `QA.md`.

**Key Characteristics:**
- Warm, flat surfaces with clear plum structure.
- Lora headings and Inter controls, with scalable native text.
- Coral urgent actions and explicit sharing boundaries.
- Four persistent destinations; focused dark help and rehearsal screens.

## Colors

The palette uses warm neutral grounds, structural plum and a small set of meaningful accents. Frontmatter is normative; color names below explain usage. The sidecar’s eight-step OKLCH tonal strips are synthesized panel metadata, not additional implemented palette tokens.

### Primary
- **Structural plum (`ink`)** anchors titles, primary non-urgent buttons, selected chips and the focused help/rehearsal ground.
- **Urgent coral (`coral`)** marks Get help and the message action, with white button text. It also appears on danger rows; pair it with explicit action labels rather than color alone.

### Secondary
- **Jade (`jade`)** marks the active tab and affirmative switch tracks. It indicates selected or meaningful state, not a promise of protection or confirmed response.

### Tertiary
- **Soft lilac (`lilac`)** groups related content, ordinary notices, unselected chips and alternating contact avatars.
- **Warm peach (`peach`)** gives private-note surfaces and alternate avatars a gentle material difference.

### Neutral
- **Warm paper (`paper`)** is the default screen and cream-button ground; **white (`white`)** is urgent-button text.
- **Muted plum (`muted`)** carries body/caption copy and placeholders on light grounds. **Pale plum (`dark-muted`)** carries secondary copy on dark grounds.
- **Light seam (`line`)** separates rows, fields and persistent navigation. **Near-white field (`field`)** distinguishes editable areas from paper.
- **Error plum-red (`error`)** on **error surface (`error-surface`)** is the Notice error pairing; do not substitute the brighter urgent coral for small error copy.
- **Success surface (`success-surface`)** uses ink notice text, not jade text.

**The Capability Truth Rule.** Name the action the software actually performs. Opening a composer is not delivery; a rehearsal is not monitoring or dispatch.

## Typography

**Display Font:** Lora SemiBold. **Body and Control Font:** Inter Regular / SemiBold. Native font imports are `Lora_600SemiBold`, `Inter_400Regular` and `Inter_600SemiBold`; `_layout.tsx` loads all three before the app renders. No app-defined fallback stack is specified. Sidecar HTML previews use local serif/sans fallbacks when the bundled native fonts are unavailable to the panel.

Lora gives short headings a humane editorial character; Inter keeps instructions, forms and controls compact and clear. Sizes in frontmatter use portable `px` notation for the raw React Native numeric values: native layout units are density-independent and text follows platform font scaling. They are not screenshot pixel dimensions. There is no mathematical type-scale ratio in source.

### Hierarchy
- **Title:** the primary short screen heading, with the negative tracking in the title token.
- **Heading:** section headings, panels and empty-state titles.
- **Body:** descriptions and guide paragraphs, normally muted; ink is used on peach panels and where stronger emphasis is needed.
- **Label:** button labels, row titles, field labels and header titles.
- **Caption:** secondary explanations, status, notice copy and metadata. Tabs override caption size and weight with the two tab tokens.
- **Field:** editable text. Input line height is platform/default, not an invented token. Search uses body-size Inter within the field shell.
- **Link:** underlined inline navigation; the token records the observed smaller semibold size. Text is sentence case, apart from existing isolated status copy.

Help locally enlarges its title to (43 / 50); the rehearsal heading uses (44 / 52), and its centered Lora countdown uses (132 / 150). The journey timer uses (64 / 76). These are specialized screen treatments, not general heading roles. Avatar initials scale to 0.38 × diameter with line height 0.5 × diameter.

**The Scalable Content Rule.** Keep controls and content in the scrolling native layout; use minimum control heights rather than fixed text boxes. Preserve the deliberate check-in entry directly after Get help on Home.

Text and TextInput retain React Native font scaling defaults: no `allowFontScaling={false}` or maximum multiplier is defined. Buttons permit label shrink/wrap within minimum-height controls. Contact-name previews intentionally truncate to one line; latest-note previews truncate to three. Default and 1.3-font/night Android captures are in `.impeccable/review/`; TalkBack, larger scales and physical-device behavior remain verification work in `QA.md`.

## Layout

Android portrait phones are the validated design target. `app.json` requests portrait and a light UI: dark help/rehearsal screens are deliberate task modes, not a complete OS-dark theme. Night-setting captures verify the existing light system under that setting. iPhone and tablet release layouts are not validated.

`Page` wraps content in top/bottom safe areas. Its header is (56) high with page-inline padding, brand/title at the left and account entry at the right; nested screens use a back control. A flexible ScrollView carries the content with top inset (12), page-inline inset, content gap and page-bottom inset from frontmatter. Keyboard taps persist as handled. KeyboardAvoidingView adds padding on iOS only; Android keyboard behavior must be checked natively.

The persistent four-tab bar sits after the ScrollView, above the safe-area bottom, with a thin top seam. Main destinations are Home, My Circle, Guide and My Space. Each equal-width tab is at least (64) high; top padding is (7), horizontal inset (8), and icon/label gap (5). There is no responsive native breakpoint or multicolumn layout. Native screens fill the device width; web preview alone caps the app at (480) within a neutral outer canvas.

Minimum control sizes observed in shared patterns are: buttons (56) high; inputs (54) high; action rows and tabs (64) high; header/back/account and standalone text actions (48) high, with icon controls (48 × 48). Guide chips are at least (48) high. These are native minimum dimensions, not fixed heights for text containers. Keep at least the established (48) touch minimum for new standalone actions, while checking actual hit regions and text growth on device.

Home places Get help followed immediately by the dark check-in/rehearsal entry before the contacts surface. It keeps secondary routes in scrolling content over persistent tabs. This ordering is a Home first-view contract; do not turn it into a universal screen template. Guide detail uses the same width and readable vertical sections with modest (8) vertical padding and (10) gap, not an invented desktop reading measure.

## Elevation & Depth

The system is flat. Tonal panels, round controls, negative space and fine lines establish depth; shared primitives define no shadow or Android elevation. Native device-authentication prompts and platform call/message/share surfaces follow their own system presentation.

**The Flat Surface Rule.** Use tone, spacing and light dividers for hierarchy. The shared native primitives define no shadows or elevation.

Motion is native stack navigation (`slide_from_right`) and immediate opacity press feedback. Buttons press to (0.8); action rows press to (0.65). No custom easing, animation duration or reduced-motion override is specified. The rehearsal refreshes its wall-clock countdown every (200 ms), displaying whole seconds and a progress strip; that is state feedback, not a decorative animation. Do not imply this is a background timer or automated alert. Native reduced-motion behavior needs verification before claiming support.

## Shapes

Fields and notices share soft corners, buttons use a slightly larger corner, and panels are the roundest broad surfaces; exact radii live in frontmatter. Guide chips are capsule-like. Outlined buttons and fields use a one-unit light seam; rows and tabs use one-unit separators. Avatars are circles with radius half their diameter, alternate peach/lilac grounds and actual name initials. Default avatars are (48) in diameter; Home uses (56), the circle diagram uses contact (62) and self (66). Account artwork is (34) within its larger touch control. Do not confuse illustration size with hit-target size.

## Components

### Page, T and Icon

`Page` owns safe areas, scroll, header, status-bar contrast and optional tabs. `dark` switches its ground to ink and status bar to light; children explicitly choose pale text. `T` maps `title`, `heading`, `body`, `label` and `caption` to shared styles. `Icon` uses Feather with default size (21); source components pass explicit larger or smaller sizes as needed. Use named icons with text or accessible labels.

### Buttons

Confident full-width actions with soft corners. `Button` supports `plum`, `coral`, `outline` and `cream`, with centered Inter labels, optional icon and inline gap. The frontmatter owns their colors, radius and padding; all have a minimum height of (56). Outline adds a one-unit line border. Disabled controls use opacity (0.45); pressed controls (0.8). `busy` replaces the icon with an ActivityIndicator and blocks interaction, but does not add disabled opacity. Labels wrap through `flexShrink: 1`. The source exposes button role and label; it does not define a separate focus ring, native hover appearance or `accessibilityState` for busy/disabled. Sidecar focus treatments are browser-preview affordances only.

### Rows and panels

`Row` is a quiet divider-separated action or information line: icon, a flexible title/subtitle group, and an end control or chevron. It has minimum height (64), vertical padding (17) and gap (14). It becomes Pressable only with `onPress`, then exposes a button role and opacity feedback. Danger mode colors the title/icon coral. `s.panel` is a lilac container with panel inset and inline gap; private-note surfaces switch to peach. Panels do not all become cards or navigation actions automatically.

### Inputs / Fields

`Field` keeps an external semibold label above a near-white input, separated by field-gap. It uses an accessible label, muted placeholder and one-unit light border. A multiline field starts at (150) high with top-aligned text; the private note editor locally raises this to (250). The source has no custom focus-border change, per-field error border or shared disabled style; validation appears in a Notice. Preserve these facts rather than presenting unimplemented state styling as shipped behavior.

### Navigation and chips

Tabs expose native `tab` roles and selected states; active icon/text is jade and semibold, inactive is muted regular. Routing replaces the destination for tabs and uses the native stack for detail screens. Guide categories are horizontally scrollable Pressables with button role and selected state: ink/paper selected, lilac/ink unselected. They use caption typography, chip corners and the frontmatter padding. There is no shared React chip component; this is an extracted Guide pattern.

### Notice and Empty

`Notice` is a quiet rounded status surface with (14) inset and `accessibilityLiveRegion="polite"`. Plain, error and success pairings are in frontmatter; color accompanies explicit message text. `Empty` centers a muted icon (34), heading and body, with vertical padding (30) and gap (12). It gives a truthful next step rather than fabricated data.

### Avatar and the circle

`Avatar` shows the first uppercase character of a saved name (or `+`), not a stock portrait. The relationship diagram renders the user's chosen contacts only and caps its visual sample at three; the list below remains the full circle. Saving contacts never sends invitations or messages. The diagram is informational, not a coverage or responder visualization.

### Focused help, rehearsal and private areas

Help uses a dark plum Page without tabs, a cream call action, coral contact-message action, optional fresh location choice and independent sound/stop controls. Calls open the calling app; messages open the composer for the user to review and send. Delivery is not confirmed. Sound stops on leaving/backgrounding.

Rehearsal is explicitly labeled, lasts twenty seconds, offers a prominent “I'm okay” cancel path and separate real-help entry, and sends no alerts. Motion sensing is foreground-only; leaving the foreground pauses/resets the rehearsal. The journey companion is a local self-check timer, with no route tracking, background notification or missed-arrival escalation.

`PrivateGate` optionally asks for device authentication for private areas and re-locks on blur/backgrounding. Essential help remains reachable. Native notes and the safety plan are encrypted locally; exporting creates copies outside that encryption. Web preview stores private changes in memory and loses them on refresh. Support requests are a distinct cloud workflow with review/disclosure before submission and no promise of staffed response. Do not transplant private-note styling or copy into a cloud form in a way that hides this difference.

`.impeccable/design.json` contains self-contained HTML/CSS illustrations of ten extracted patterns for the live panel. Literal resolved values translate React Native styles; browser focus/hover affordances help inspect them. They do not add native functionality, load native font bundles or validate device behavior. The eleven `phone*.png` files record reviewed native states; `web-preview.png` is a separate layout preview.

## Do's and Don'ts

### Do:
- **Do** use the shared Page, T, Button, Row, Field and Notice primitives for new mobile screens.
- **Do** keep the Home help and check-in entries prominent and reachable with larger text.
- **Do** use the user's actual saved contacts and honest empty states.
- **Do** show location, sharing and cloud-support disclosure at the point of choice.
- **Do** verify new layouts on Android with larger fonts, native keyboard and accessibility services.

### Don't:
- **Don't** reuse this mobile document to restyle the separate website.
- **Don't** imply automated dispatch, background protection, live journey tracking, staffed response or an operating volunteer network.
- **Don't** treat a saved note as a support request or upload private journal content automatically.
- **Don't** hide an unavailable capability behind fictional portraits, responders, routes or delivery confirmations.
- **Don't** describe a browser preview or a screenshot review as proof of real-device safety reliability.


## UI and interaction refresh — 3 November 2026

Home now uses a coral help panel, paired journey/rehearsal actions, a support panel, individual contact rows, and a three-step personal setup checklist. An active local journey also appears on Home. The checklist records configuration only; it is not a safety score. Header insets remain 24; scrolling content and fixed conversation footer use 22. Selected tab icons sit on a sage capsule. Action rows use a 40-unit tonal icon tile inside the existing minimum touch row. Fields show jade borders on focus and preserve scalable text. Buttons expose busy/disabled accessibility state.

The guide library uses category and bookmark metadata, tonal icons and bordered reading cards. Every bundled guide is already offline; saving adds a bookmark. My Space includes the safety plan and an explicitly saved support draft. Help lets the user select recipients, with no composer action when nobody is selected. Journey controls expose saving/error states and chosen check-in time. Device & permissions reads actual permissions, motion availability and device-lock enrollment without requesting a location.

Support cases use status badges, chronological left/right conversation bubbles, a fixed reply composer and guarded scrolling. New replies do not clear drafts or force a reader away from older messages. Evidence and Team & privacy remain separate sections. Request drafts are saved explicitly to the encrypted account-specific device vault, never uploaded automatically.

Native captures of this refresh are pending. The browser captures in ../design/mobile-refresh/ verify selected phone-width states, not physical-device delivery, permissions, capture blocking or response reliability.

## Support flow simplification — 7 November 2026

Talk to support is one screen: message, an optional topic, “When would you like a reply?” (worded choices mapped to low/medium/high priority) and the volunteer switch, with what is shared stated directly above **Send to support**. Choosing “As soon as possible” shows an inline Get help prompt instead of permanent warnings. Drafts are still saved only when the user asks. Conversations show plain-language status (`shared/support-copy.ts`, also used by the website), the first message as the opening bubble, and a paperclip in the composer that opens Files. The website’s survivor dashboard uses the same form and wording; it no longer asks for addresses or the accused’s details. Staff replies move a “Needs response” case to “In progress” automatically. Native captures of this change are pending.
