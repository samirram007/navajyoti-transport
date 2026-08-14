import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/')({
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})
