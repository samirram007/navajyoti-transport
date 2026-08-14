import { z } from 'zod'

/** Optional string field — accepts undefined (untouched), null (unset in DB),
 *  and '' (cleared input). */
const optionalString = (max: number, message?: string) =>
  z
    .string()
    .max(max, message)
    .nullish()
    .or(z.literal(''))

/** Optional date in YYYY-MM-DD — accepts undefined, null, and ''. */
const optionalDate = (message: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .nullish()
    .or(z.literal(''))

/** Optional time in HH:MM — accepts undefined, null, and ''. */
const optionalTime = (message: string) =>
  z
    .string()
    .regex(/^\d{2}:\d{2}$/, message)
    .nullish()
    .or(z.literal(''))

export const RiderSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  code: optionalString(50, 'Code must be at most 50 characters'),
  contactNo: z
    .string()
    .max(20, 'Contact number must be at most 20 characters')
    .regex(/^[+]?[\d\s\-()]{0,20}$/, 'Invalid contact number format')
    .nullish()
    .or(z.literal('')),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be at most 255 characters')
    .nullish()
    .or(z.literal('')),
  standard: optionalString(50, 'Standard must be at most 50 characters'),
  section: optionalString(50, 'Section must be at most 50 characters'),
  rollNo: optionalString(50, 'Roll number must be at most 50 characters'),
  monthlyCharge: z.coerce
    .number({ message: 'Monthly charge must be a number' })
    .min(0, 'Monthly charge must be 0 or greater')
    .nullish(),
  schoolId: z.coerce
    .number({ message: 'School must be a number' })
    .positive('Please select a school')
    .nullish(),
  vehicleId: z.coerce
    .number({ message: 'Vehicle must be a number' })
    .positive('Please select a vehicle')
    .nullish(),
  pickupSlotId: z.coerce
    .number()
    .positive()
    .nullish(),
  dropSlotId: z.coerce
    .number()
    .positive()
    .nullish(),
  riderType: optionalString(50, 'Rider type must be at most 50 characters'),
  status: optionalString(50, 'Status must be at most 50 characters'),
  isActive: z.coerce.boolean().nullish(),
  joinDate: optionalDate('Date must be in YYYY-MM-DD format'),
  dissociateDate: optionalDate('Date must be in YYYY-MM-DD format'),
  emergencyContactNo: optionalString(20, 'Emergency contact must be at most 20 characters'),
  isFree: z.coerce.boolean().nullish(),
  schoolTime: optionalString(50, 'School time must be at most 50 characters'),
  pickupTime: optionalTime('Time must be in HH:MM format'),
  dropTime: optionalTime('Time must be in HH:MM format'),
  pickupPointId: optionalString(50, 'Pickup point must be at most 50 characters'),
  dropPointId: optionalString(50, 'Drop point must be at most 50 characters'),
})

export type RiderInput = z.infer<typeof RiderSchema>
