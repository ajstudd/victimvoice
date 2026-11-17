# Codebase map

This is a complete inventory of tracked source/configuration/test/document/design files, with generated and local-only folders explained separately. It does not enumerate third-party package internals or cache files. Initial scan: 368 existing files plus the six map files themselves.

Maintain the individual descriptions in build-map.py. It deliberately fails on an unknown file instead of silently inventing its purpose. Run it to update Markdown and JSON, then run build-word.py with the configured bundled document Python runtime. Render the resulting Word file through the documents skill and inspect pages before delivery. Paths are repository-relative; no private environment values are read.

A listed component or schema is not a promise that the associated feature is operating. Older documentation and generation artifacts are labelled; the current scoped SQL and release records take precedence. This reference complements the product/architecture guide and the chronological project log.
