import { Suspense } from 'react';
import DoctorsDirectory from '../../components/DoctorsDirectory';
import { GridSkeleton } from '../../components/ui/States';

export const metadata = {
  title: 'Find a doctor',
  description:
    'Browse our consultants by department and specialty. Every doctor publishes their consultation fee and live availability, so you know the cost before you book.',
};

/**
 * The directory reads `?q=` from the URL, which makes it a client component.
 * Wrapping it in Suspense keeps this route statically prerenderable while the
 * search term resolves.
 */
export default function DoctorsPage() {
  return (
    <Suspense fallback={<GridSkeleton count={6} className="sa-container py-12" />}>
      <DoctorsDirectory />
    </Suspense>
  );
}
