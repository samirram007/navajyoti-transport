import { z } from 'zod'

export const SettingSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(255, 'Key must be at most 255 characters'),
  value: z
    .string()
    .min(1, 'Value is required')
    .max(5000, 'Value must be at most 5000 characters'),
})

export type SettingInput = z.infer<typeof SettingSchema>
