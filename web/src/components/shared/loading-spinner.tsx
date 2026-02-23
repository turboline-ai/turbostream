// @group Utilities : Full-page and inline loading spinner

import { cn } from '@/utils/cn'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  fullPage?: boolean
}

export function LoadingSpinner({ className, size = 'md', fullPage = false }: LoadingSpinnerProps) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6'

  if (fullPage) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className={cn('animate-spin text-primary', sizeClass, className)} />
      </div>
    )
  }

  return <Loader2 className={cn('animate-spin text-primary', sizeClass, className)} />
}
