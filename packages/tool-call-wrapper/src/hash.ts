import { hashCanonical } from "@decision-passport/core";

/**
 * Hash any serialisable value deterministically using the same canonical
 * serialisation as the core protocol (sorted keys, stable number encoding).
 *
 * The same semantic object always produces the same hash regardless of
 * property insertion order.
 */
export function hashValue(value: unknown): string {
  return hashCanonical(value);
}
