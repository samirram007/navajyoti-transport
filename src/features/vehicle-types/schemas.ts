import { z } from 'zod'

export const VehicleTypeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
})

export type VehicleTypeInput = z.infer<typeof VehicleTypeSchema>
