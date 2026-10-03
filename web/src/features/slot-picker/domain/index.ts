/**
 * The pure entrypoint: types and logic with no React and no I/O. Importable
 * from both server and client code.
 */

export type {
  BookingPort,
  SlotDay,
  SlotPickerPorts,
  SlotPickerViewProps,
  SlotSourcePort,
  SlotView,
} from './types';

export { dayKeyInZone, dropPastSlots, durationMinutes, groupSlotsByDay, isFree } from './grouping';
