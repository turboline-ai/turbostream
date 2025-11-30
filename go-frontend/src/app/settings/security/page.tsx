import { Suspense } from 'react';
import SecuritySection from '@/components/profile/SecuritySection';

export const dynamic = 'force-dynamic';

export default function SecuritySettingsPage() {
  return (
    <Suspense fallback={<div>Loading security settings...</div>}>
      <SecuritySection />
    </Suspense>
  );
}