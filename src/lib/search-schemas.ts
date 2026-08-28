import { z } from 'zod'

/**
 * Base search schema for paginated list routes.
 *
 * Shared across all list pages so pagination / sort / search params are
 * validated consistently. The `page` param uses `.min(1).catch(undefined)`
 * so that empty strings, zero, NaN, and negative values are silently
 * replaced with `undefined` (component defaults to page 1) instead of
 * throwing a SearchParamError that breaks the route.
 */
export const paginationSearchSchema = z.object({
  page: z.coerce.number().min(1).catch(undefined),
  size: z.coerce.number().optional(),
  sort: z.string().optional(),
  dir: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
})

export type PaginationSearchParams = z.infer<typeof paginationSearchSchema>
