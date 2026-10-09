import PatientChart from '../../../../components/dashboard/PatientChart';

export const metadata = {
  title: 'Patient chart',
  description: 'Clinical chart: consultations, prescriptions, lab results and timeline.',
};

export default function PatientChartPage() {
  return <PatientChart />;
}
