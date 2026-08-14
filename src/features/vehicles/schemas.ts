import { z } from 'zod'

export const VehicleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  registrationNo: z
    .string()
    .max(50, 'Registration number must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  registrationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  registrationValidDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  chassisNo: z
    .string()
    .max(100, 'Chassis number must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  engineNo: z
    .string()
    .max(100, 'Engine number must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  color: z
    .string()
    .max(50, 'Color must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  capacity: z.coerce
    .number({ message: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .optional(),
  insuranceId: z
    .string()
    .max(100, 'Insurance ID must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  vehicleTypeId: z.coerce
    .number({ message: 'Vehicle type must be a number' })
    .positive('Please select a vehicle type')
    .optional(),
})
// Refinement: registrationValidDate must be after or equal to registrationDate
.refine(
    (data) => {
      if (!data.registrationDate || !data.registrationValidDate) return true
      return new Date(data.registrationValidDate) >= new Date(data.registrationDate)
    },
    { message: 'Registration valid date must be on or after registration date', path: ['registrationValidDate'] }
  )

export type VehicleInput = z.infer<typeof VehicleSchema>
