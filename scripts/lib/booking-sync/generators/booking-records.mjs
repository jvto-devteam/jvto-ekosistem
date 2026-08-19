const PRIVACY_NOTE =
  "Customer names, phones, emails, portal links, payment links, receipts, references, expense, profit, and free-form notes are excluded from this working file.";

function balanceStatus(balance) {
  if (balance > 0) return "balance_due";
  if (balance < 0) return "overpaid_or_adjustment";
  return "settled";
}

function readiness(raw) {
  return {
    hasPickup: Boolean(raw.pickup?.text?.trim()),
    hasDropoff: Boolean(raw.dropoff?.text?.trim()),
    hasVehicle: (raw.vehicles ?? []).length > 0,
    hasDriver: (raw.drivers ?? []).length > 0,
    hasGuide: (raw.guides ?? []).length > 0,
    hasHotels: (raw.hotels ?? []).length > 0,
    hasPaymentHistory: (raw.paymentHistory ?? []).length > 0,
    hasNotes: Boolean(raw.notes?.trim()),
    balanceStatus: balanceStatus(raw.financial?.balance ?? 0),
  };
}

function toBookingRecord(raw) {
  return {
    bookingId: raw.booking_id,
    bookingCode: raw.id,
    orderChannel: raw.orderChannel,
    packageId: raw.package_id,
    packageName: raw.package,
    duration: raw.duration,
    totalPax: raw.total_pax,
    bookingDate: raw.booking_date,
    tripDate: raw.date,
    pickup: {
      meetingPoint: raw.pickup?.meeting_point ?? null,
      arrival: raw.pickup?.meeting_point_arrival ?? null,
      value: raw.pickup?.meeting_point_value ?? null,
      time: raw.pickup?.pickup_time ?? null,
      text: raw.pickup?.text ?? null,
      complete: Boolean(raw.pickup?.text?.trim()),
    },
    dropoff: {
      dropPoint: raw.dropoff?.drop_point ?? null,
      arrival: raw.dropoff?.drop_point_arrival ?? null,
      value: raw.dropoff?.drop_point_value ?? null,
      time: raw.dropoff?.drop_time ?? null,
      text: raw.dropoff?.text ?? null,
      complete: Boolean(raw.dropoff?.text?.trim()),
    },
    itinerary: raw.itinerary ?? [],
    hotels: raw.hotels ?? [],
    tshirt: {
      text: raw.tshirtSize ?? null,
      sizes: raw.tshirtRaw ?? {},
    },
    vehicles: raw.vehicles ?? [],
    drivers: (raw.drivers ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      tags: d.tags,
      monthlyEscortCount: d.recap_this_month_escort ?? 0,
    })),
    guides: (raw.guides ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      role: g.type,
      tags: g.tags,
      monthlyEscortCount: g.recap_this_month_escort ?? 0,
      monthlyIjenCount: g.recap_this_month_ijen ?? 0,
    })),
    isShuttle: raw.is_shuttle,
    ijenDate: raw.at_ijen ?? null,
    customer: {
      guestId: raw.guest_id ?? null,
      countryId: raw.guestDetails?.country_id ?? null,
      country: raw.guestDetails?.country ?? null,
    },
    payment: {
      paid: raw.financial?.payment ?? 0,
      invoiceTotal: raw.financial?.invoice?.total ?? 0,
      balance: raw.financial?.balance ?? 0,
      paymentMethod: raw.financial?.paymentMethod ?? null,
      history: (raw.paymentHistory ?? []).map((p) => ({
        id: p.id,
        amount: p.nominal,
        methodId: p.paymentMethodId,
        method: p.paymentMethod,
        description: p.description,
        date: p.date,
      })),
    },
    readiness: readiness(raw),
  };
}

export function generateBookingRecords({ overviewRecords }) {
  const records = overviewRecords
    .map(toBookingRecord)
    .sort((a, b) => {
      if (a.tripDate.start_ymd < b.tripDate.start_ymd) return -1;
      if (a.tripDate.start_ymd > b.tripDate.start_ymd) return 1;
      return 0;
    });
  return { privacy: PRIVACY_NOTE, records };
}
