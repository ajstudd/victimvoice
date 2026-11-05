# Victim Voice — Product Vision

Recorded on 23 October 2026 from the founder's direction. This document is the source of truth for product scope and future feature decisions.

## Vision

Victim Voice will be a complete safety guide and companion for women: helping them feel safer in everyday life, find help in an unsafe situation, share what happened, and receive support afterward.

Start with women in India. Build the product so it can later serve women globally, with local languages, resources, services, and cultural contexts.

The ambition is to explore the full range of useful software capabilities across prevention, immediate help, reporting, and recovery. A support request is one part of this larger experience.

## Product surfaces

**The mobile app is the primary product.** It should be close at hand in everyday life and during difficult situations, with essential safety actions one tap away. Prioritize fast entry, clear actions, and continuity of support on the user's phone.

**The website is the visibility and quick-access layer.** It introduces the product, makes useful information discoverable, and offers immediate access to relevant guidance and help. It supports the mobile app's adoption and use.

“One tap away” is a product goal to design and verify across relevant device states. Explore app shortcuts, home-screen widgets, lock-screen entry points, and wearable integrations where supported. Choose these mechanisms according to platform capabilities, user consent, privacy, and demonstrated reliability. Track whether an action was initiated, sent, and acknowledged accurately.

Android launches first, followed by iPhone (confirmed 23 October 2026). The Android pilot uses Expo / React Native and shares the Supabase backend. See [the mobile app plan](APP_PLAN.md) for proposed capabilities and release stages.

## Founder’s words

> “I want this product to be complete safety guide and partner for women in India, can become a global product later. so it should have all the features, that we can provide via software to make a woman feel safer, feel safe, and share and get help in bad situation and even after bad situation.”

Follow-up direction:

> “The website will just be the quick access/visibility layer, actually we need to build an app for this, so in any situation it is just one tap away.”

## The needs we serve

### Before something happens

Help a woman understand her options, prepare for situations that concern her, and build a support network. Everyday safety should be useful even when she has no incident to report.

### During an unsafe situation

Help her reach appropriate assistance quickly, communicate with people she trusts, and understand the next available action with as little effort as possible.

### After something happens

Give her a private, respectful way to share, preserve information, ask for help, follow up, and find ongoing support. She chooses what to disclose and what steps to take.

## Feature areas to explore

These are candidate areas that express the vision, not a claim that they are implemented or a commitment to ship them all in the first release.

- **Safety guidance:** practical, situation-specific guidance and preparation for everyday, online, home, work, and travel contexts.
- **Trusted support:** trusted contacts, personal safety plans, check-ins, and consent-based sharing.
- **Urgent help:** easy access to verified local emergency resources and clear ways to ask for assistance.
- **Proactive technology:** opt-in sensor-triggered check-ins, a proposed 20-second countdown before notifying chosen contacts, manual SOS, an optional audible attention alarm, and a consent-based nearby responder network. See [Active Safety](ACTIVE_SAFETY.md); sensing, delivery, privacy, and responder operations must be validated.
- **Private sharing and reporting:** incident accounts, support requests, follow-up conversations, and progress tracking.
- **Evidence and records:** private incident timelines, evidence organization, and controlled sharing or export.
- **Finding human help:** verified support organizations, counselors, legal assistance, and other relevant services, with clear availability and coverage.
- **Support after an incident:** recovery resources, continued contact, and help navigating next steps at the user's pace.
- **Community:** carefully moderated opportunities to share experiences and find solidarity, with privacy and abuse prevention designed first.

## Working principles

- Respect the woman's agency. Sharing, location access, notifications, and escalation must be explicit and understandable.
- Make urgent actions easy to find. Use calm, clear language without blame or pressure.
- Design for privacy, including situations where someone else can access the user's phone or account.
- Collect only information needed for the chosen task. Keep access limited and explain who can see it.
- Validate safety guidance and local resources before publishing them; record sources and review dates.
- Clearly distinguish software assistance from human response. Only promise response times, monitoring, confidentiality, or dispatch when the actual service supports them.
- Design the core experience for the mobile app: fast entry, accessibility, language, connectivity, and people who prefer Google to phone-based login. Keep essential guidance and quick access available on the website.
- Deliver useful capabilities in stages, verifying reliability before presenting them as safety features.

## Launch scope and constraints

- **Primary product:** a mobile safety companion, with essential actions one tap away.
- **Website role:** visibility, discovery, and quick access to guidance and help.
- **First market:** India.
- **Later expansion:** other countries through country-specific content, service directories, language support, and operating arrangements.
- **Current foundation:** the existing web interface, Supabase Auth/database, Google and phone login, and support-request workflows. An Android pilot now implements the core screens, encrypted on-device notes, trusted contacts, manual help actions, foreground safety rehearsals, and shared Supabase support workflows. See [mobile implementation and release boundaries](mobile/README.md); automatic dispatch and background protection are not active.
- **Fresh start:** no old reports or accounts will be imported.
- **Cost constraint:** keep Supabase within the Free plan. SMS delivery has separate provider costs. New features must account for their operating costs before adoption.

## Success

A woman can understand her options, prepare, reach help when she needs it, share safely on her terms, and continue receiving useful support afterward. Evaluate features against these outcomes as well as whether they make her feel supported and in control.
