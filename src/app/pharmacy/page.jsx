import { Suspense } from 'react';
import PharmacyCatalogue from '../../components/PharmacyCatalogue';
import { GridSkeleton } from '../../components/ui/States';

export const metadata = {
  title: 'Pharmacy',
  description:
    'Browse the hospital pharmacy catalogue with published prices. Prescription-only items are clearly marked, and your basket is kept until you sign in.',
};

/** See DoctorsPage for why the catalogue sits behind a Suspense boundary. */
export default function PharmacyPage() {
  return (
    <Suspense fallback={<GridSkeleton count={9} className="sa-container py-12" />}>
      <PharmacyCatalogue />
    </Suspense>
  );
}
