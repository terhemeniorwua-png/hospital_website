import Link from 'next/link';
import { config } from '../../lib/config';
import { departments } from '../../content/hospital';
import { IconAmbulance, IconClock, IconMail, IconMapPin, IconPhone, IconStethoscope } from '../ui/Icon';

const QUICK_LINKS = [
  { href: '/doctors', label: 'Find a doctor' },
  { href: '/appointments', label: 'Book an appointment' },
  { href: '/pharmacy', label: 'Pharmacy catalogue' },
  { href: '/lab-results', label: 'Laboratory results' },
  { href: '/records', label: 'Medical records' },
  { href: '/billing', label: 'Billing & invoices' },
  { href: '/messages', label: 'Message my care team' },
];

const PATIENT_LINKS = [
  { href: '/dashboard', label: 'My dashboard' },
  { href: '/prescriptions', label: 'Prescriptions' },
  { href: '/documents', label: 'My documents' },
  { href: '/profile', label: 'Profile & settings' },
  { href: '/emergency', label: 'Emergency care' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line bg-white">
      {/* Emergency strip */}
      <div className="border-b border-line bg-danger-600">
        <div className="sa-container flex flex-col items-center justify-between gap-3 py-4 text-white sm:flex-row">
          <p className="flex items-center gap-2.5 text-sm font-semibold">
            <IconAmbulance className="size-5" />
            Emergency department open 24 hours. Do not wait for an appointment.
          </p>
          <a
            href={`tel:${config.hospital.emergencyPhone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-danger-700 transition hover:bg-danger-50"
          >
            <IconPhone className="size-4" />
            {config.hospital.emergencyPhone}
          </a>
        </div>
      </div>

      <div className="sa-container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-600 text-white">
              <IconStethoscope className="size-6" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold text-ink">{config.hospital.shortName}</span>
              <span className="block text-[11px] font-medium tracking-wide text-muted uppercase">Teaching Hospital</span>
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            A 320-bed teaching hospital on the Victoria Island waterfront, providing specialist outpatient care,
            emergency medicine, diagnostics, inpatient services and a full hospital pharmacy since {1974}.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-muted">
            <li className="flex items-start gap-2.5">
              <IconMapPin className="mt-0.5 size-4 shrink-0 text-primary-600" />
              {config.hospital.address}
            </li>
            <li className="flex items-start gap-2.5">
              <IconPhone className="mt-0.5 size-4 shrink-0 text-primary-600" />
              <a href={`tel:${config.hospital.phone.replace(/\s/g, '')}`} className="hover:text-primary-700">
                {config.hospital.phone}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <IconMail className="mt-0.5 size-4 shrink-0 text-primary-600" />
              <a href={`mailto:${config.hospital.email}`} className="hover:text-primary-700">
                {config.hospital.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <IconClock className="mt-0.5 size-4 shrink-0 text-primary-600" />
              Outpatient clinics 8:00–16:00 · Emergency 24 hours
            </li>
          </ul>
        </div>

        <FooterColumn title="Departments" links={departments.slice(0, 6).map((d) => ({ href: '/departments', label: d.name }))} />
        <FooterColumn title="Patients" links={QUICK_LINKS} />
        <FooterColumn title="Your account" links={PATIENT_LINKS} />
      </div>

      <div className="border-t border-line">
        <div className="sa-container flex flex-col items-center justify-between gap-4 py-6 text-xs text-muted md:flex-row">
          <p>
            © {year} {config.hospital.name}. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-5">
            <Link href="/about" className="hover:text-primary-700">
              About
            </Link>
            <Link href="/contact" className="hover:text-primary-700">
              Contact
            </Link>
            <Link href="/resources" className="hover:text-primary-700">
              Patient resources
            </Link>
            <Link href="/privacy" className="hover:text-primary-700">
              Privacy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-muted transition hover:text-primary-700">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
