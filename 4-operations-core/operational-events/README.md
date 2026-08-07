# Operational Events

This folder contains operational event intelligence and activity/meal events
from itinerary-core. It does not yet contain a timestamped per-booking event log.

Available data:

- `operational-events.json`
- `activities-master.json`
- `meal-logic.json`
- `meal-stops.json`

Still needed for a true event log:

- event id;
- booking id;
- event type;
- timestamp;
- actor;
- before/after state;
- payload.

Do not create inferred per-booking events from snapshots unless the system
explicitly marks them as generated observations.
