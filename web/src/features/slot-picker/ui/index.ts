/**
 * The client entrypoint. Nothing reachable from here may reach server code or a
 * persistence adapter — `brick-lint` rule R6 enforces that, so a host SDK can
 * never be dragged into a client bundle by an import chain.
 */

export { SlotPicker } from './slot-picker';
export type { SlotPickerProps } from './slot-picker';
