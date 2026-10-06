import { Suspense } from 'react';
import BookAppointment from '../../components/appointments/BookAppointment';

export const metadata = {
  title: 'Book an appointment',
  description:
    'Book an appointment with a named consultant. Live availability from each doctor’s clinic schedule, in four short steps.',
};

export default function AppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <BookAppointment />
    </Suspense>
  );
}