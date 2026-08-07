# Architecture Direction

JVTO should be modeled as an operating ecosystem, not only as a website.

The public website is one consumer of the data. The same underlying facts and
contracts should also support sales, WhatsApp/email, quotations, invoices,
guest preparation, operations, partner channels, analytics, and AI answers.

## Principles

- One fact, many uses.
- One product, many channels.
- One booking, one timeline.
- One published version.

## Static vs Dynamic

Static or slow-changing:

- organization identity;
- credentials;
- evidence records;
- public claims;
- policies;
- destinations;
- people and crew public profiles;
- safety and health rules;
- evergreen FAQs.

Dynamic:

- inquiries;
- quotations;
- bookings;
- travelers;
- payments;
- pickup and drop-off state;
- health certificate status;
- crew and vehicle assignment;
- operational readiness;
- incidents;
- communication logs.

## Implementation Stance

This project starts as a contract and data-organization workspace. After the
contracts stabilize, it can become one or more of:

- a module inside `jvto-web`;
- a Prisma/database schema;
- an internal API;
- a public content compiler;
- an ops console;
- a guest portal;
- an AI knowledge source.

