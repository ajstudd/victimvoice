# Product guide

The Word document is the shareable guide. Its Markdown source includes relative links to seven diagrams and step-by-step app, support admin and Team & access instructions.

## Diagrams

- System architecture with the local vault and shared backend.
- Support data flow and private evidence access.
- Safety-message flow with SIM results and safe relay fallback.
- Support database relationships.
- Workforce database relationships.
- Emergency database relationships.
- Journey and incident-media database relationships.

PNG versions are embedded in Word; SVG versions allow independent editing. `diagrams/build-diagrams.py` generates both formats deterministically with Pillow and Arial fonts. `build-guide.py` generates Word from Markdown with python-docx. Run authoring with the configured bundled workspace Python runtime. Render with the documents skill's render_docx.py and inspect the page images before delivery. PNG and PDF render output is kept outside the repository as QA material.

The database diagrams show selected current tables, columns and relationships. Later scoped-workforce SQL supersedes the earlier assignment-to-legacy-staff foreign key. Auth references are often written inside nodes instead of drawn. Dashed gold edges indicate logical joins rather than declared foreign keys. Local private notes are not modeled as a cloud journal. The safety-plan schema foundation is distinguished from the current app's local plan storage.

Validated on 12 November 2026: 31 rendered pages; seven embedded diagrams; all new pages visually checked. Previously reviewed unchanged pages were verified by identical rendered PNG hashes. No app, backend, APK or live service configuration changed.
