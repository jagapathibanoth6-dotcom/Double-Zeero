/**
 * The shape of a value after it has been sent as JSON from an API route.
 * Dates become ISO strings; everything else keeps its type.
 *
 *   type BookingJson = Serialized<Booking>;
 */
export type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
