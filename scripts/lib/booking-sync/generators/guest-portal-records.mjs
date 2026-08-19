const PRIVACY_NOTE =
  "Guest-facing projection of booking data. Customer identity, crew/driver/guide details, and expense/profit figures are excluded.";

function balanceStatus(balance) {
  if (balance > 0) return "balance_due";
  if (balance < 0) return "overpaid_or_adjustment";
  return "settled";
}

function toGuestPortalRecord(raw) {
  const pickupComplete = Boolean(raw.pickup?.meeting_point && raw.pickup?.meeting_point_value);
  const dropoffComplete = Boolean(raw.dropoff?.drop_point && raw.dropoff?.drop_point_value);

  return {
    bookingId: raw.booking_id,
    bookingCode: raw.id,
    packageName: raw.package,
    tripDate: raw.date,
    pickup: {
      meetingPoint: raw.pickup?.meeting_point ?? null,
      arrival: raw.pickup?.meeting_point_arrival ?? null,
      value: raw.pickup?.meeting_point_value ?? null,
      time: raw.pickup?.pickup_time ?? null,
      text: raw.pickup?.text ?? null,
      complete: pickupComplete,
    },
    dropoff: {
      dropPoint: raw.dropoff?.drop_point ?? null,
      arrival: raw.dropoff?.drop_point_arrival ?? null,
      value: raw.dropoff?.drop_point_value ?? null,
      time: raw.dropoff?.drop_time ?? null,
      text: raw.dropoff?.text ?? null,
      complete: dropoffComplete,
    },
    itinerary: raw.itinerary ?? [],
    hotels: raw.hotels ?? [],
    tshirt: {
      text: raw.tshirtSize ?? null,
      sizes: raw.tshirtRaw ?? {},
    },
    vehicles: raw.vehicles ?? [],
    payment: {
      invoiceTotal: raw.financial?.invoice?.total ?? 0,
      paid: raw.financial?.payment ?? 0,
      balance: raw.financial?.balance ?? 0,
    },
    readiness: {
      hasPickup: pickupComplete,
      hasDropoff: dropoffComplete,
      hasHotels: (raw.hotels ?? []).length > 0,
      balanceStatus: balanceStatus(raw.financial?.balance ?? 0),
    },
  };
}

export function generateGuestPortalRecords({ overviewRecords }) {
  return { privacy: PRIVACY_NOTE, records: overviewRecords.map(toGuestPortalRecord) };
}
