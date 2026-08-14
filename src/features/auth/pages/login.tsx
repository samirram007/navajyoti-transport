import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormError } from '@/components/ui/form-error'
import { toast } from 'sonner'
import { LoginSchema } from '@/features/auth/schemas'

export function LoginForm() {
  const [email, setEmail] = useState('admin@admin.com')
  const [password, setPassword] = useState('password')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = LoginSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({ email: fieldErrors.email?.[0] ?? '', password: fieldErrors.password?.[0] ?? '' })
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      toast.success('Login successful!')
      navigate({ to: '/dashboard' })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">GoSchool</CardTitle>
        <CardDescription>Enter your credentials to login</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email / Username</Label>
            <Input id="email" type="text" value={email} onChange={e => setEmail(e.target.value)} />
            <FormError message={errors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <FormError message={errors.password} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
