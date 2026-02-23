// @group Utilities : Feed status and verification badge components

import { Badge } from '@/components/ui/badge'
import { CheckCircle, Zap } from 'lucide-react'

interface StatusBadgeProps {
  isActive?: boolean
  isVerified?: boolean
  isPublic?: boolean
}

export function StatusBadge({ isActive, isVerified, isPublic }: StatusBadgeProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {isActive !== undefined && (
        <Badge variant={isActive ? 'success' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )}
      {isVerified && (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      )}
      {isPublic !== undefined && (
        <Badge variant="outline">{isPublic ? 'Public' : 'Private'}</Badge>
      )}
    </div>
  )
}

export function LiveBadge() {
  return (
    <Badge variant="success" className="gap-1">
      <Zap className="h-3 w-3" />
      Live
    </Badge>
  )
}
