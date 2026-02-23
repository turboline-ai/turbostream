// @group Authentication : TOTP / backup code entry after login

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { ROUTES } from '@/config/routes'
import { ShieldCheck, Loader2 } from 'lucide-react'

const totpSchema = z.object({
  code: z.string().min(6, 'Enter your 6-digit code').max(10),
})

type TOTPForm = z.infer<typeof totpSchema>

export function TwoFactorPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { email?: string; password?: string } | null
  const [error, setError] = useState<string | null>(null)
  const [isBackupMode, setIsBackupMode] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TOTPForm>({
    resolver: zodResolver(totpSchema),
  })

  if (!state?.email || !state?.password) {
    // No credentials in state — redirect to login
    navigate(ROUTES.LOGIN, { replace: true })
    return null
  }

  const onSubmit = async (values: TOTPForm) => {
    setError(null)
    try {
      const result = await login(state!.email!, state!.password!, values.code)
      if (result.success) {
        navigate(ROUTES.DASHBOARD, { replace: true })
      } else {
        setError('Invalid code. Please try again.')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? 'Invalid code')
      } else {
        setError('An unexpected error occurred')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <ShieldCheck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>
              {isBackupMode
                ? 'Enter one of your backup codes'
                : 'Enter the 6-digit code from your authenticator app'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">{isBackupMode ? 'Backup code' : 'TOTP code'}</Label>
                <Input
                  id="code"
                  placeholder={isBackupMode ? 'xxxxxxxx-xxxx' : '000000'}
                  autoComplete="one-time-code"
                  inputMode={isBackupMode ? 'text' : 'numeric'}
                  maxLength={isBackupMode ? 20 : 6}
                  {...register('code')}
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setIsBackupMode((v) => !v)}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isBackupMode ? 'Use authenticator app instead' : "Use a backup code instead"}
            </button>

            <button
              type="button"
              onClick={() => navigate(ROUTES.LOGIN)}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to sign in
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
