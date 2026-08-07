# Domain Boundaries

## 1. Knowledge & Evidence Core

Owns public truth that should remain consistent everywhere. This is where the
existing `jvto-web/content` data belongs today.

Examples:

- legal name, brand name, address, contact channels;
- NIB, TDUP, HPWKI, police assignment, BBKSDA evidence;
- founder and crew records;
- narrative claims and their evidence references;
- travel guide pages;
- policy pages;
- destination knowledge;
- FAQ sets.

Should not own:

- per-booking payment state;
- private customer data;
- crew assignment for a specific trip;
- real-time availability.

## 2. Product & Commercial Core

Owns what JVTO sells.

Examples:

- tour product ID;
- route and duration;
- included and excluded items;
- price model;
- deposit rule;
- add-ons;
- luggage constraints;
- health requirements;
- cancellation and credit behavior;
- partner channel mapping.

Should not own:

- customer-specific payment status;
- crew assignment;
- marketing copy that is not part of the product contract.

## 3. Booking & Journey Core

Owns each customer timeline.

Examples:

- inquiry status;
- quote version;
- selected product version;
- travelers;
- payment records;
- pickup/drop-off details;
- health requirements;
- documents;
- communication log;
- review request.

Should not own:

- canonical public policy text;
- global product definitions.

## 4. Operations Core

Owns execution readiness.

Examples:

- trip readiness state;
- missing data;
- crew assignment;
- vehicle assignment;
- hotel/partner confirmation;
- health certificate state;
- weather or closure handling;
- plan-B;
- incident log;
- domain events.

Should not own:

- public destination articles;
- product marketing pages.

## 5. Experience Engine

Owns channel outputs generated from the other cores.

Examples:

- website sections;
- SEO metadata;
- JSON-LD;
- knowledge feed;
- WhatsApp messages;
- email templates;
- quote/invoice PDFs;
- guest portal views;
- ops console views;
- AI answer payloads.

Should not become a new source of truth. It should render, compile, and adapt
data from the four cores.

