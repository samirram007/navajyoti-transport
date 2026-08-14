import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axiosClient from '@/lib/axios-client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getGravatarUrl } from '@/lib/utils'
import { toast } from 'sonner'
import {
  User, Mail, Phone, Calendar, Shield, Key,
  Loader2, CheckCircle2, Eye, EyeOff,
} from 'lucide-react'
import { useEffect } from 'react'

export function ProfilePage() {
  const { user } = useAuth()

  const [avatarUrl, setAvatarUrl] = useState<string>()
  useEffect(() => {
    if (user?.email) {
      getGravatarUrl(user.email).then(setAvatarUrl).catch(() => setAvatarUrl(undefined))
    }
  }, [user?.email])

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      return res.data
    },
    onSuccess: () => {
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to change password')
    },
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    passwordMutation.mutate()
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const profileFields = [
    { label: 'Name', value: user?.name, icon: User },
    { label: 'Username', value: user?.username, icon: User },
    { label: 'Email', value: user?.email, icon: Mail },
    { label: 'Contact No', value: user?.contactNo || 'Not set', icon: Phone },
    { label: 'User Type', value: user?.userType || 'Not set', icon: Shield },
    { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown', icon: Calendar },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Profile"
        description="View your profile information and manage your account"
      />

      {/* Profile Info Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4 bg-muted/30">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg">
              <AvatarImage src={avatarUrl} alt={user?.name || 'User'} />
              <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{user?.name || 'User'}</CardTitle>
              <CardDescription className="text-sm mt-0.5">{user?.email || ''}</CardDescription>
              {user?.userType && (
                <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                  {user.userType}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="divide-y">
            {profileFields.map(field => (
              <div key={field.label} className="flex items-center gap-3 py-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
                  <field.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
                  <dd className="text-sm font-medium truncate mt-0.5">{field.value || '—'}</dd>
                </div>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              <Key className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Update your account password. You'll need your current password to set a new one.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs font-medium text-foreground/80">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="h-9 text-sm pr-9"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-medium text-foreground/80">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="h-9 text-sm pr-9"
                  placeholder="Enter new password (min 6 chars)"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground/80">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="h-9 text-sm pr-9"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-destructive font-medium mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                className="gap-1.5 h-9"
                disabled={
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword ||
                  newPassword.length < 6 ||
                  passwordMutation.isPending
                }
              >
                {passwordMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Update Password</>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-9"
                onClick={() => {
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
