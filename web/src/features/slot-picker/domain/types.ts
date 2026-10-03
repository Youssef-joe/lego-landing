import type { ISODateTime, Principal, Route } from '../host/contract';

/** A bookable slot, already resolved to instants by whoever supplies them. */
export interface SlotView {
  id: string;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  /** Absent means free. */
  priceMinor?: number;
  currency?: string;
}

export interface SlotDay {
  /** "YYYY-MM-DD" in the viewer's zone. */
  dayKey: string;
  slots: SlotView[];
}

/**
 * Where slots come from.
 *
 * Note what this port buys: the brick does not compute availability and does
 * not depend on `timekit`. Bricks cannot import each other under a copy-only
 * installer, so composition happens in the host's file, which is free to call
 * both. This is the ports-not-imports rule doing real work rather than being
 * an aspiration.
 */
export interface SlotSourcePort {
  listSlots(input: {
    ownerId: string;
    fromISO: ISODateTime;
    toISO: ISODateTime;
    durationMin: number;
  }): Promise<SlotView[]>;
}

export interface BookingPort {
  requestBooking(input: {
    ownerId: string;
    slotId: string;
    startsAt: ISODateTime;
    note?: string;
  }): Promise<{ ok: true; bookingId: string } | { ok: false; reason: 'taken' | 'denied' | 'error' }>;
}

/** What the brick needs from a host, beyond the shared contract. */
export interface SlotPickerPorts {
  slots: SlotSourcePort;
  booking: BookingPort;
}

/** Props the host passes into the client component. */
export interface SlotPickerViewProps {
  ownerId: string;
  ownerName: string;
  days: SlotDay[];
  /** The zone the viewer sees times in. */
  timeZone: string;
  principal: Principal | null;
  canBook: boolean;
  /** Called on selection; the host wires this to a server action or route. */
  onBook: (slot: SlotView) => Promise<{ ok: boolean; message?: string }>;
  detailRoute?: (slotId: string) => Route;
}
