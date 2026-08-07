# JVTO Operating Ecosystem

This workspace follows the five-part structure from the ChatGPT architecture
response:

1. `1-knowledge-and-evidence-core`
2. `2-product-and-commercial-core`
3. `3-booking-and-journey-core`
4. `4-operations-core`
5. `5-experience-engine`

The project is still a data and architecture workspace, not a finished
application. Its purpose is to organize JVTO truth before building UI, APIs,
database tables, automations, or AI tooling.

## Current Status

The workspace now contains structured data for:

- public knowledge and evidence;
- tour products;
- pricing and add-ons;
- itineraries;
- booking journey rules;
- operations readiness;
- website, SEO, schema, knowledge-feed, and message outputs.

Raw snapshots are kept only in `archive/` for reference. The working data lives
inside the five ecosystem folders.

## Operating Rule

The five folders are not just file groups. They are domain boundaries:

- stable public facts can live as versioned files;
- product contracts can start as files, then move to database or internal
  services if needed;
- booking and operations state should become database-backed;
- experience outputs should be generated from the cores, not written as a
  competing source of truth.
