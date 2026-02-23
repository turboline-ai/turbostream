// @group BusinessLogic > Account > Security : Password change and 2FA management

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/services/auth-api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import toast from 'react-hot-toast'
import { ShieldCheck, ShieldOff, Key, Loader2 } from 'lucide-react'
import type { TwoFactorSetupResponse } from '@/types/user'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirm: z.string(),
}).refine((d) => d.newPassword === d.confirm, { message: "Passwords don't match", path: ['confirm'] })

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

export function SecurityTab() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  const { register, handleSubmit, reset: resetPwForm, formState: { errors, isSubmitting } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (values: ChangePasswordForm) =>
      authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
    onSuccess: () => { toast.success('Password changed'); resetPwForm() },
    onError: () => toast.error('Failed to change password. Check current password.'),
  })

  const setup2FAMutation = useMutation({
    mutationFn: authApi.setup2FA,
    onSuccess: (data) => setSetupData(data),
    onError: () => toast.error('Failed to start 2FA setup'),
  })

  const enable2FAMutation = useMutation({
    mutationFn: () => authApi.enable2FA({ secret: setupData!.secret, token: verifyCode }),
    onSuccess: (data) => {
      setSetupData(null)
      setVerifyCode('')
      updateUser({ twoFactorEnabled: true })
      setBackupCodes(data.backupCodes)
      toast.success('2FA enabled!')
    },
    onError: () => toast.error('Invalid code. Try again.'),
  })

  const disable2FAMutation = useMutation({
    mutationFn: authApi.disable2FA,
    onSuccess: () => { updateUser({ twoFactorEnabled: false }); toast.success('2FA disabled') },
    onError: () => toast.error('Failed to disable 2FA'),
  })

  const regenBackupCodesMutation = useMutation({
    mutationFn: authApi.regenerateBackupCodes,
    onSuccess: (data) => { setBackupCodes(data.backupCodes); toast.success('Backup codes regenerated') },
  })

  return (
    <div className="space-y-4">
      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-4 w-4" /> Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => changePasswordMutation.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" {...register('currentPassword')} />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" {...register('newPassword')} />
              {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input type="password" {...register('confirm')} />
              {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-factor authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Two-factor authentication
          </CardTitle>
          <CardDescription>
            {user?.twoFactorEnabled ? '2FA is enabled on your account.' : 'Add an extra layer of security to your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {user?.twoFactorEnabled ? (
            <>
              <Button variant="destructive" size="sm" onClick={() => disable2FAMutation.mutate()} disabled={disable2FAMutation.isPending}>
                <ShieldOff className="h-4 w-4 mr-1" /> Disable 2FA
              </Button>
              <Button variant="outline" size="sm" onClick={() => regenBackupCodesMutation.mutate()} disabled={regenBackupCodesMutation.isPending}>
                Regenerate backup codes
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setup2FAMutation.mutate()} disabled={setup2FAMutation.isPending}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Enable 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 2FA setup modal */}
      <Dialog open={!!setupData} onOpenChange={(open) => !open && setSetupData(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</DialogDescription>
          </DialogHeader>
          {setupData && (
            <div className="space-y-4">
              <img src={setupData.qrCodeUrl} alt="2FA QR code" className="mx-auto rounded-lg border p-2 bg-white" />
              <p className="text-xs text-center text-muted-foreground font-mono">{setupData.manualEntryKey}</p>
              <div className="space-y-2">
                <Label>Verification code</Label>
                <Input
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              <Button className="w-full" onClick={() => enable2FAMutation.mutate()} disabled={verifyCode.length < 6 || enable2FAMutation.isPending}>
                {enable2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify and enable'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Backup codes modal */}
      <Dialog open={!!backupCodes} onOpenChange={(open) => !open && setBackupCodes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup codes</DialogTitle>
            <DialogDescription>Save these codes in a secure place. Each code can only be used once.</DialogDescription>
          </DialogHeader>
          {backupCodes && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code) => (
                  <span key={code} className="rounded border bg-muted px-3 py-1.5 text-center">{code}</span>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigator.clipboard.writeText(backupCodes.join('\n')).then(() => toast.success('Copied!'))}>
                Copy all codes
              </Button>
              <Button className="w-full" onClick={() => setBackupCodes(null)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
