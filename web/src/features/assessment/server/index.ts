/** The server entrypoint. Never reachable from a client bundle (rule R6). */

export { createAssessmentService } from './service';
export type { AssessmentDeps, AssessmentService, ClientQuestion, StartResult, SubmitResult } from './service';
