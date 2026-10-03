/**
 * The server entrypoint. Never reachable from ui/ — a brick's client bundle must
 * not be able to pull in service code, and brick-lint rule R6 enforces it.
 */

export { HOLD_TTL_MS, createMentorshipService } from './service';
export type { MentorshipDeps, MentorshipService, RequestBookingInput, RequestBookingResult } from './service';
