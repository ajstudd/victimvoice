# Android app surface brief

Mode: Operate, with Read for guide detail. Android phones first; iPhone and tablets are not validated release targets. The user approved the revised six-screen board and said “okay build it.” Board: ../design/app-concepts/05-redesigned-core-screens.png. Earlier boards were rejected as bland.

Use warm parchment, plum structure, coral urgent actions, peach/lilac content surfaces and jade only for meaningful states. Editorial serif headings, legible sans controls, ample touch targets, four tabs (Home / My Circle / Guide / My Space). Relationship diagrams use the user's chosen contacts; no decorative fake people. Home has a prominent Get help action; a dark help/check-in state reduces competing content. Motion is native stack navigation and restrained press feedback, with a wall-clock countdown during the explicitly labeled rehearsal.

First viewport contract: show the brand and account entry, a calm personal heading, one strong help action, a deliberate check-in entry, and routes to the user's circle. Secondary actions remain in a scrolling surface above persistent tabs. At 1.3 font scale controls and core actions must remain reachable without overlap.

Use local empty states and actual capability in place of the board's illustrative routes, portraits, responder counts and delivery claims. The current pilot has no live journey tracking, background sensing, automated dispatch or volunteer network; these cannot be represented as operating. Do not add a server-backed private journal: native notes are encrypted locally. Cloud support requests have a review/disclosure step and no promise of staffed response.

Implementation tokens and reusable primitives live in src/components/ui.tsx. Source of truth for boundaries: README.md, ../PRODUCT.md, ../ACTIVE_SAFETY.md and ../APP_PLAN.md.

Visual authority: the revised board 05 was directly approved by the user. No catalog FORM selection or QUALITY BAR card is recorded as authority for this build; earlier exploratory tool output is not an approved direction. The Home check-in entry appears immediately after Get help so it remains visible at the captured phone size and larger text setting.
