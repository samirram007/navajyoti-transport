import { z } from 'zod'

/**
 * Base search schema for paginated list routes.
 *
 * Shared across all list pages so pagination / sort / search params are
 * validated consistently. The `page` param accepts both strings (from the
 * URL) and numbers (from TanStack Router's re-validation on re-render)
 * and silently drops invalid values (NaN, zero, negative) so the
 * component can default to page 1 without a SearchParamError.
 */
export const paginationSearchSchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined
      const num = typeof val === 'string' ? Number(val) : val
      if (isNaN(num) || num < 1) return undefined
      return num
    }),
  size: z.coerce.number().optional(),
  sort: z.string().optional(),
  dir: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
})

export type PaginationSearchParams = z.infer<typeof paginationSearchSchema>
