/**
 * The host contract — the single source of truth.
 *
 * `scripts/sync-contract.mjs` copies this file verbatim into every brick as
 * `host/contract.ts`, and CI asserts SHA-256 equality across all copies. The
 * duplication is deliberate: bricks may not import each other (a `../sibling`
 * import escapes the captured directory and BRICO's scanner classifies it as an
 * unresolvable external), and types erase at build time, so copying costs
 * nothing at runtime. TypeScript's structural typing makes two identical
 * declarations mutually assignable, so the host wires them with no cast.
 *
 * The governing rule: **a brick never imports its host; the host imports the
 * brick.** A brick declares what it needs here; the host implements it in one
 * composition file, outside every brick, where aliases and SDKs are all legal.
 * That quarantines every non-portable line into a single host-owned file.
 *
 * DO NOT EDIT a brick's copy. Edit this file and re-run the sync.
 */

/* ------------------------------------------------------------------ scalars */

export type UserId = string;

/** Always an ISO-8601 string, never a Date: it survives the RSC boundary and
 *  both a document store and SQL without a conversion the brick has to know. */
export type ISODateTime = string;

/** Minor units only. Floats do not represent money. */
export interface Money {
  amountMinor: number;
  currency: string;
}

/* ----------------------------------------------------------------- identity */

export interface Principal {
  id: UserId;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  /** Host-owned role strings. A brick never compares these; it asks `can`. */
  roles: readonly string[];
  locale?: string;
  /** IANA zone. Scheduling is unusable without it. */
  timeZone?: string;
}

/**
 * What a brick is allowed to ask about. A closed union on purpose: adding a
 * member is a compile error in every host that has not handled it, which is
 * how a forgotten case becomes a build failure instead of a silent denial.
 */
export type Capability =
  | 'mentorship:offer'
  | 'mentorship:book'
  | 'mentorship:moderate'
  | 'lms:author'
  | 'lms:enroll'
  | 'lms:grade'
  | 'media:upload'
  | 'reviews:write';

export interface AuthPort {
  /** Resolves the request principal, or null when nobody is signed in. */
  currentPrincipal(): Promise<Principal | null>;
  /** Returning false must be safe to render as a 403. */
  can(
    principal: Principal | null,
    capability: Capability,
    resource?: { ownerId?: UserId; id?: string },
  ): Promise<boolean>;
  /** The host owns its login URL shape. */
  signInUrl(returnTo: string): string;
}

/* -------------------------------------------------------------- persistence */

/**
 * The query algebra is the *intersection* of a document store and SQL, not the
 * union. Anything a document store cannot do is not expressible here, which is
 * the forcing function that stops an unportable query being written at all.
 */
export type Where<T> = {
  [K in keyof T]?:
    | { eq: T[K] }
    /** At most 10 members: a document store's `in` is bounded. */
    | { in: readonly T[K][] }
    /** A range may be applied to at most one field per query. */
    | { gte?: T[K]; lte?: T[K] };
};

export interface Query<T> {
  where?: Where<T>;
  orderBy?: { field: keyof T & string; dir: 'asc' | 'desc' };
  /** Required. An unbounded read works in development and dies in production. */
  limit: number;
  /** Opaque keyset cursor. A brick must never construct or inspect one. */
  cursor?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

/** Every stored entity carries these. `version` drives optimistic concurrency. */
export interface Entity {
  id: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  version: number;
}

export interface Repository<T extends Entity> {
  get(id: string): Promise<T | null>;
  getMany(ids: readonly string[]): Promise<T[]>;
  list(query: Query<T>): Promise<Page<T>>;
  create(value: Omit<T, 'createdAt' | 'updatedAt' | 'version'>): Promise<T>;
  update(id: string, patch: Partial<T>, opts?: { expectedVersion?: number }): Promise<T>;
  delete(id: string): Promise<void>;
  /**
   * The portable uniqueness primitive. Document stores have no unique indexes,
   * so every uniqueness constraint becomes a deterministic id plus this call:
   * a document store's create-fails-if-exists, SQL's ON CONFLICT DO NOTHING.
   * Returns the existing row when there was one, and whether it created.
   */
  createIfAbsent(
    id: string,
    value: Omit<T, 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<{ entity: T; created: boolean }>;
}

/* ------------------------------------------------------------------ storage */

export interface StoragePort {
  /** Returns a target the *client* uploads to. The brick never sees a byte or
   *  a credential. */
  createUploadTicket(input: {
    purpose: string;
    contentType: string;
    maxBytes: number;
    ownerId: UserId;
  }): Promise<{ uploadUrl: string; method: 'PUT' | 'POST'; assetId: string }>;
  resolveUrl(assetId: string, variant?: string): Promise<string>;
  delete(assetId: string): Promise<void>;
}

/* ------------------------------------------------------------ notifications */

/** Closed union, for the same reason as Capability. */
export type Notification =
  | { kind: 'booking.requested'; to: UserId; bookingId: string; startsAt: ISODateTime }
  | { kind: 'booking.confirmed'; to: UserId; bookingId: string; startsAt: ISODateTime }
  | { kind: 'booking.cancelled'; to: UserId; bookingId: string; reason?: string }
  | { kind: 'course.enrolled'; to: UserId; courseId: string }
  | { kind: 'submission.graded'; to: UserId; submissionId: string; score?: number };

export interface NotificationsPort {
  send(notification: Notification): Promise<void>;
}

/* --------------------------------------------------------------- navigation */

/**
 * Every internal link a brick can produce. The host owns the URL shape,
 * including locale prefixes and route groups, so a brick hardcodes no hrefs.
 */
export type Route =
  | { name: 'mentor.list' }
  | { name: 'mentor.detail'; slug: string }
  | { name: 'mentor.book'; slug: string }
  | { name: 'booking.detail'; id: string }
  | { name: 'course.list' }
  | { name: 'course.detail'; slug: string }
  | { name: 'lesson.detail'; courseSlug: string; lessonId: string }
  | { name: 'external'; href: string };

export interface NavPort {
  href(route: Route): string;
  /** The host supplies its own link component: next/link, a locale-aware
   *  wrapper, or a plain anchor. */
  Link: LinkComponent;
}

/** Structural, so a brick needs no React type import in this file. */
export type LinkComponent = (props: {
  route: Route;
  children?: unknown;
  className?: string;
}) => unknown;

/* --------------------------------------------------------------------- i18n */

export interface I18nPort {
  locale: string;
  dir: 'ltr' | 'rtl';
  /** Must fall back to the brick's bundled default when a key is unknown: a
   *  missing translation is never a blank interface. */
  t(key: string, params?: Record<string, string | number>): string;
  formatDate(value: ISODateTime, style?: 'date' | 'time' | 'datetime' | 'relative'): string;
  formatMoney(value: Money): string;
  formatNumber(value: number, style?: 'decimal' | 'percent'): string;
}

/* ----------------------------------------------------------------- feedback */

export interface FeedbackPort {
  toast(input: { level: 'success' | 'error' | 'info'; title: string; description?: string }): void;
}

/* ------------------------------------------------------------------- config */

export interface PublicConfig {
  /** Mount point with no trailing slash, e.g. "/mentorship" or "/en/mentorship".
   *  Everything a brick renders is relative to this, so it never assumes it
   *  lives at the root. */
  basePath: string;
  appName: string;
  features?: Partial<Record<'payments' | 'reviews' | 'video' | 'certificates', boolean>>;
}

export interface ServerConfig extends PublicConfig {
  /** Absolute origin, needed for webhook and return URLs. */
  origin: string;
}

/* -------------------------------------------------------------- the two hosts */

/**
 * Split in two on purpose. Server ports (persistence, storage, secrets) must be
 * structurally incapable of reaching a client component, and ClientHost must be
 * constructible from values that survive serialization.
 */
export interface ServerHost {
  readonly contractVersion: 1;
  config: ServerConfig;
  auth: AuthPort;
  storage?: StoragePort;
  notifications?: NotificationsPort;
  nav: Pick<NavPort, 'href'>;
  i18n: I18nPort;
  log?: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields?: Record<string, unknown>,
  ) => void;
  /** Injected so tests and fixtures are deterministic. */
  now?: () => ISODateTime;
}

export interface ClientHost {
  readonly contractVersion: 1;
  config: PublicConfig;
  /** A serializable projection passed down from a server component. */
  principal: Principal | null;
  /**
   * Precomputed server-side. `can` is async and may hit the host's database,
   * and you cannot await in render. These booleans are cosmetic only — every
   * server entry point re-checks.
   */
  capabilities: Partial<Record<Capability, boolean>>;
  nav: NavPort;
  i18n: I18nPort;
  feedback: FeedbackPort;
}
