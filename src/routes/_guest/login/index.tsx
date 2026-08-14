import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/features/auth/pages/login'

export const Route = createFileRoute('/_guest/login/')({
  component: LoginForm,
})
