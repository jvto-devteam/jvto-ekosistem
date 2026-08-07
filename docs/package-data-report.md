# Package Data Report

This report summarizes package, pricing, itinerary, add-on, channel, vehicle,
and website-output data now organized in the ecosystem folders.

## Package Count

- Total packages: 17
- Bali -> Bali: 1
- Bali -> Surabaya: 3
- Surabaya -> Surabaya: 11
- Surabaya -> Bali: 2

## Duration Split

- 1D1N: 1
- 2D1N: 2
- 3D2N: 6
- 4D3N: 4
- 5D4N: 3
- 6D5N: 1

## Main Data Locations

- Tour products: `2-product-and-commercial-core/tour-products`
- Itineraries: `2-product-and-commercial-core/routes-and-itineraries`
- Pricing tiers: `2-product-and-commercial-core/pricing-rules`
- Channel availability: `2-product-and-commercial-core/channel-availability`
- Add-ons: `2-product-and-commercial-core/add-ons`
- Vehicle plan: `4-operations-core/vehicle-assignment`
- Website product output: `5-experience-engine/public-website`

## Package Data Shape

Each product contract contains:

- `id`
- `packageId`
- `slug`
- `name`
- `shortLabel`
- `status`
- `version`
- `category`
- `originCity`
- `endCity`
- `duration`
- `route`
- `keyExperiences`
- `physicalDifficulty`
- `description`
- `inclusions`
- `exclusions`
- `travelerRequirements`
- `accommodationPlan`
- `gear`
- `marketing`
- `aggregateRating`
- `provider`
- `compliance`
- `operationalComplexityNote`

## Price Range

All package prices are in IDR.

| Start From | High Price | Duration | Slug |
|---:|---:|---|---|
| 1,000,000 | 1,550,000 | 1D1N | `tours/from-surabaya/bromo-1d1n` |
| 1,550,000 | 2,300,000 | 2D1N | `tours/from-surabaya/ijen-2d1n` |
| 1,750,000 | 4,500,000 | 2D1N | `tours/from-surabaya/bromo-2d1n` |
| 2,450,000 | 6,300,000 | 3D2N | `tours/from-surabaya/bromo-madakaripura-ijen-3d2n` |
| 2,450,000 | 6,300,000 | 3D2N | `tours/from-surabaya/ijen-bromo-madakaripura-3d2n` |
| 2,450,000 | 6,300,000 | 3D2N | `tours/from-surabaya/tumpak-sewu-bromo-3d2n` |
| 2,850,000 | 7,500,000 | 3D2N | `tours/from-bali/bromo-ijen-3d2n` |
| 2,850,000 | 7,500,000 | 3D2N | `tours/from-bali/ijen-bromo-madakaripura-3d2n` |
| 3,025,000 | 7,550,000 | 4D3N | `tours/from-surabaya/ijen-bromo-madakaripura-4d3n` |
| 3,125,000 | 8,050,000 | 4D3N | `tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-4d3n` |
| 3,125,000 | 8,050,000 | 4D3N | `tours/from-surabaya/tumpak-sewu-bromo-ijen-4d3n` |
| 3,475,000 | 9,050,000 | 4D3N | `tours/from-bali/ijen-papuma-tumpak-sewu-bromo-4d3n` |
| 3,650,000 | 9,050,000 | 5D4N | `tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-5d4n` |
| 3,700,000 | 4,700,000 | 3D2N | `tours/from-surabaya/taman-safari-prigen-bromo-madakaripura-3d2n` |
| 3,850,000 | 5,250,000 | 5D4N | `tours/from-surabaya/ijen-bromo-madakaripura-malang-5d4n` |
| 4,050,000 | 10,000,000 | 5D4N | `tours/from-bali/ijen-papuma-tumpak-sewu-bromo-5d4n` |
| 4,750,000 | 6,050,000 | 6D5N | `tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-malang-6d5n` |

## Add-ons

- Unique add-ons: 115
- Add-on records across all products: 338
- Transport add-ons: 114
- Madakaripura add-on: 1
- Transport size tiers:
  - small: 36
  - medium: 36
  - big: 36
  - other/null: 7

## Vehicle Plan

All products currently share one vehicle-plan shape:

- MPV: Toyota Avanza/Innova, max 3 pax, 3 medium bags;
- Hiace: Toyota Hiace, max 11 pax, 11 medium bags;
- Bromo jeep required at `mount-bromo`;
- 4WD Jeep capacity: 4-6 pax;
- jeep inclusions: experienced driver, Kingkong Hill access, vintage Jeep
  experience.

## Channel Data

Each package has channel availability data:

- enabled channels;
- external package IDs;
- freesale status;
- availability-check flag;
- supported pickup cities;
- supported dropoff cities;
- offered language;
- status;
- minimum lead time;
- minimum operational pax;
- maximum recommended pax.

## Data Quality Notes

The `route` field may be incomplete for some packages. These slugs mention a
destination in the slug/name that is not present in `route`:

- `tours/from-bali/ijen-papuma-tumpak-sewu-bromo-4d3n`: missing Tumpak Sewu Waterfall
- `tours/from-bali/ijen-papuma-tumpak-sewu-bromo-5d4n`: missing Tumpak Sewu Waterfall
- `tours/from-surabaya/ijen-bromo-madakaripura-malang-5d4n`: missing Malang City
- `tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-4d3n`: missing Tumpak Sewu Waterfall
- `tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-5d4n`: missing Tumpak Sewu Waterfall
- `tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-malang-6d5n`: missing Tumpak Sewu Waterfall

Review these against the itinerary day records before treating `route` as final
canonical product data.

