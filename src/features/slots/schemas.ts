import { z } from 'zod'

export const SlotSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  slotType: z
    .string()
    .max(50, 'Slot type must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  vehicleId: z.coerce
    .number({ message: 'Vehicle must be a number' })
    .positive('Please select a vehicle')
    .optional(),
  teamId: z
    .string()
    .max(50, 'Team ID must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  capacity: z.coerce
    .number({ message: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
    .optional()
    .or(z.literal('')),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
    .optional()
    .or(z.literal('')),
  isActive: z.coerce.boolean().optional(),
})
// Refinement: endTime must be after startTime
.refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true
      return data.endTime > data.startTime
    },
    { message: 'End time must be after start time', path: ['endTime'] }
  )

export type SlotInput = z.infer<typeof SlotSchema>
