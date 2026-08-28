import { z } from 'zod'

/**
 * Base search schema for paginated list routes.
 *
 * Shared across all list pages so pagination / sort / search params are
 * validated consistently. The `page` param uses a transform to coerce
 * invalid values (empty string, NaN, zero, negative) to `undefined`
 * so that the component defaults to page 1 instead of throwing a
 * SearchParamError that breaks the route.
 */
export const paginationSearchSchema = z.object({
  page: z.string().optional().transform((val) => {
    if (val === undefined || val === '') return undefined
    const num = Number(val)
    if (isNaN(num) || num < 1) return undefined
    return num
  }),
  size: z.coerce.number().optional(),
  sort: z.string().optional(),
  dir: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
})

export type PaginationSearchParams = z.infer<typeof paginationSearchSchema>
