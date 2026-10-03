/** The server entrypoint. Never reachable from a client bundle (rule R6). */

export { createLmsService } from './service';
export type { EnrollResult, LmsDeps, LmsService } from './service';
