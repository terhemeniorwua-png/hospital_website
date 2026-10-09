'use client';

import { PageHeader, PageBody, PageSection } from '../../components/layout/PageShell';
import { Card } from '../../components/ui/Card';
import { config } from '../../lib/config';

const SECTIONS = [
  {
    title: 'What we collect',
    body: [
      'Identity and contact details you give us when you register or book an appointment, including your name, date of birth, phone number and email address.',
      'Clinical information created during your care: consultations, prescriptions, laboratory and imaging results, allergies, conditions and documents your clinicians attach to your chart.',
      'Operational records such as appointment history, queue position, invoices, payments and insurance claims.',
      'Technical information needed to keep your session secure — session identifiers, device and browser details, and the timestamps of account activity.',
    ],
  },
  {
    title: 'Why we use it',
    body: [
      'To deliver care: scheduling, triage, consultations, prescribing, dispensing and results reporting.',
      'To run the hospital: billing, insurance claims, appointment reminders and clinical records we are legally required to keep.',
      'To protect your account: authenticating you, enforcing role-based permissions and detecting unusual access.',
      'To improve the service: aggregated, non-identifying usage statistics. We do not sell your data.',
    ],
  },
  {
    title: 'Who can see your record',
    body: [
      'You can see your own record from the patient portal at any time.',
      'Clinicians involved in your care see the parts of your chart they are authorised for. Reception and billing staff see administrative fields only.',
      'Every request is authorised against the backend permissions for your role; the frontend never decides who may read what.',
      'Access to your record is logged as part of normal audit practice.',
    ],
  },
  {
    title: 'How long we keep it',
    body: [
      'Clinical records are retained for the period required by applicable health records legislation, then securely deleted or archived.',
      'Account and session data is kept for as long as your account is active, and for a short period afterwards to meet security and audit obligations.',
      'You can ask us to correct inaccurate information at any time from your profile, or by contacting the hospital data protection officer.',
    ],
  },
  {
    title: 'Keeping it safe',
    body: [
      'Data travels over encrypted connections (HTTPS) and passwords are stored only as salted hashes.',
      'Sessions use short-lived access tokens with refresh rotation, and you can end every session at once from your profile.',
      'Staff access follows least-privilege rules: permissions are granted per role and enforced server-side.',
    ],
  },
  {
    title: 'Your choices',
    body: [
      'Access and correction: view your data from the portal and request corrections.',
      'Portability: ask for a copy of your record in a structured, machine-readable format.',
      'Objection and restriction: contact us if you believe processing of your data is unnecessary or unlawful.',
      'Withdrawal of consent where consent is the legal basis for processing.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        description="How we collect, use, share and protect your personal and clinical information."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Privacy' },
        ]}
      />

      <PageBody>
        <PageSection>
          <Card className="p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-muted">
              This policy applies to the {config.hospital.name} website and patient portal, including the
              doctor and patient dashboards. It explains what happens to information you entrust to us when
              you book, attend, register or sign in. Clinical care is provided under our duty of
              confidentiality; this policy describes the operational and technical handling behind that duty.
            </p>
          </Card>
        </PageSection>

        <PageSection>
          <div className="grid gap-5 md:grid-cols-2">
            {SECTIONS.map((section, index) => (
              <Card key={section.title} className="h-full p-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold tabular-nums text-primary-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-base font-semibold text-ink">{section.title}</h2>
                </div>
                <ul className="mt-3 space-y-3">
                  {section.body.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-muted">
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </PageSection>

        <PageSection title="Contact">
          <Card className="p-6">
            <p className="text-sm leading-relaxed text-muted">
              Questions about this policy or about how we handle your information can be sent to the
              hospital data protection officer through the{' '}
              <a href="/contact" className="font-semibold text-primary-700 hover:underline">
                contact page
              </a>
              , or by calling{' '}
              <a href={`tel:${config.hospital.phone.replace(/\s/g, '')}`} className="font-semibold text-primary-700 hover:underline">
                {config.hospital.phone}
              </a>
              . We respond to data access requests within the timeframe set by applicable law.
            </p>
          </Card>
        </PageSection>
      </PageBody>
    </>
  );
}
