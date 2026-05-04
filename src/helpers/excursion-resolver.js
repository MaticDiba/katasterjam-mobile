import { db } from 'src/db/db'

/**
 * Resolve an excursion identifier to a numeric server id.
 *
 * Excursions live in two states:
 *  - server-assigned numeric id (the canonical one),
 *  - locally-created with a UUID `externalId` and `id: -1` until synced.
 *
 * Many places need to talk to the backend in terms of the numeric id only.
 * This helper walks the local Dexie table to find the numeric id when given
 * a UUID, and is tolerant of nullish / empty input.
 *
 * @returns {Promise<{ linked: boolean, id: number | null }>}
 *   `linked: false` when the input was empty (nothing to resolve);
 *   `id: null` with `linked: true` when the excursion is known locally but
 *   not yet synced to the server.
 */
export async function resolveExcursionId (fkExcursionId) {
  if (fkExcursionId == null || fkExcursionId === '') return { linked: false, id: null }
  if (typeof fkExcursionId === 'number') return { linked: true, id: fkExcursionId }
  const asNum = Number(fkExcursionId)
  if (!Number.isNaN(asNum) && String(asNum) === String(fkExcursionId)) {
    return { linked: true, id: asNum }
  }
  const excursion = await db.excursions.where('externalId').equals(fkExcursionId).first()
  if (excursion && excursion.id && excursion.id !== -1) {
    return { linked: true, id: excursion.id }
  }
  return { linked: true, id: null }
}
