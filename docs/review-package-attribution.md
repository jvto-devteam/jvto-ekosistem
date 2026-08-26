# Attributing a review to a tour package

A review says which tour someone took. When the booking system captured that,
`packageSlug` came with the record and nothing here applies. This document covers
the other case: 71 of the 221 reviews arrived with no package, leaving twelve
products with no reviews of their own.

Nineteen of those 71 were attributed on 2026-08-26 by reading what the reviewer
wrote. Those records carry a `packageAttribution` object; a review without one has
a slug that came from the booking, not from inference. Never collapse that
distinction — the field is what lets a future reader tell an observation from a
deduction.

## What counts as evidence

Four signals, checked against every product contract:

1. **Destinations named in the review**, matched against the product's
   `routes-and-itineraries/*.itinerary.json` — not the slug, and not
   `route[]` in the product contract. Both of those are unreliable:
   `ijen-papuma-tumpak-sewu-bromo-4d3n` does not list Tumpak Sewu in `route[]`,
   and `from-bali/bromo-ijen-3d2n` visits Madakaripura despite its slug.
2. **Paid add-ons** from `add-ons/add-ons-index.json`. Madakaripura Waterfall is
   sold as an add-on on eight products, so a reviewer naming it has not ruled
   out a product whose base itinerary omits it.
3. **Trip length**, in English, French, German, Spanish and Italian, written
   either as `4D3N` or as "4 days".
4. **Pick-up and drop-off city.** "From Surabaya" means `originCity`, never
   `endCity` — four products start in Bali and end in Surabaya, and conflating
   the two matches every one of them.

## The rule

A product is a candidate when every destination the review names is on its
itinerary or add-on list, its length matches any length the review states, and
its endpoints match any the review states. Rank candidates by whether the named
set is exactly the itinerary, then by whether it is exactly what the product's
name advertises. **A review is attributed only when one candidate stands alone.**

Order of mention is not evidence. Guests list destinations by impression, not by
itinerary sequence, and two Surabaya 3D2N products differ in nothing else —
`bromo-madakaripura-ijen-3d2n` and `ijen-bromo-madakaripura-3d2n` have the same
route, length and origin. Where order was the only thing separating candidates,
the review was left unattributed.

`confidence: "high"` means the itinerary matched exactly and the review either
stated its length or named three or more destinations. `"medium"` means it
rested on the product name, on a single destination, or on a stated length one
day off the contract.

## What was deliberately left alone

Fifty-two reviews. Forty-seven name no destination at all — they thank a guide
and praise the sunrise, which fits every product JVTO sells. Five name a
combination that more than one product covers.

Seven products still have no reviews. That is the correct state: no guest has
described taking them in a way that identifies them, and the fix is to capture
the package at review time, not to distribute reviews across products until the
grid looks full.

## Re-running it

The matcher was a one-time script, not a pipeline — the input is a fixed backlog
that shrinks as attribution moves upstream to capture time. Should another batch
of unattributed reviews accumulate, rebuild it from the rules above rather than
from the old script; the product catalogue moves, and a stale destination table
is how a review lands on the wrong tour.
