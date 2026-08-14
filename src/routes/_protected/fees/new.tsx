/* oxlint-disable react/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { FeesPosPage } from '@/features/fees/pages/fees-pos-page'

export const Route = createFileRoute('/_protected/fees/new')({
  validateSearch: z.object({
    riderId: z.coerce.number().optional(),
  }),
  component: NewFeePage,
})

function NewFeePage() {
  const { riderId } = Route.useSearch()
  return <FeesPosPage initialRiderId={riderId} />
}