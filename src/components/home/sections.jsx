'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { Card } from '../ui/Card';
import { ButtonLink } from '../ui/Button';
import { SectionHeading } from '../ui/Card';
import { IconArrowRight, IconAmbulance, IconPhone } from '../ui/Icon';
import { config } from '../../lib/config';
import { departments, emergencyGuide, facilities, gallery, services, telemedicine, testimonials, whyChooseUs } from '../../content/hospital';
import { ICONS } from '../ui/IconMap';

/** Section wrapper that fades content in as it enters the viewport. */
function Reveal({ children, delay = 0, className }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Services
 * ------------------------------------------------------------------ */
export function ServicesSection() {
  return (
    <section className="sa-section bg-white" aria-labelledby="services-heading">
      <div className="sa-container">
        <Reveal>
          <SectionHeading
            eyebrow="What we do"
            title="One hospital, from first consultation to follow-up"
            description="Specialist clinics, diagnostics, imaging, pharmacy, nursing care, inpatient wards and a 24-hour emergency department — connected by a single patient record."
            action={
              <ButtonLink href="/services" variant="secondary" size="md">
                All services
              </ButtonLink>
            }
          />
        </Reveal>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => {
            const Icon = ICONS[service.icon] || ICONS.stethoscope;
            return (
              <li key={service.title}>
                <Reveal delay={Math.min(index * 0.05, 0.3)}>
                  <Card interactive className="h-full p-5">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
                      <Icon className="size-6" />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-ink">{service.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{service.description}</p>
                  </Card>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Departments
 * ------------------------------------------------------------------ */
export function DepartmentsSection() {
  return (
    <section className="sa-section bg-canvas" aria-labelledby="departments-heading">
      <div className="sa-container">
        <Reveal>
          <SectionHeading
            eyebrow="Departments"
            title="Eight departments, one patient record"
            description="Each department keeps its own clinic schedule, but your notes, results and prescriptions are visible to every clinician who treats you."
            action={
              <ButtonLink href="/departments" variant="secondary" size="md">
                See all departments
              </ButtonLink>
            }
          />
        </Reveal>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {departments.map((department, index) => {
            const Icon = ICONS[department.icon] || ICONS.building;
            return (
              <li key={department.slug}>
                <Reveal delay={Math.min(index * 0.05, 0.3)}>
                  <Card interactive className="flex h-full flex-col p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
                        <Icon className="size-6" />
                      </span>
                      <IconArrowRight className="size-5 text-muted" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-ink">{department.name}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{department.blurb}</p>
                    <p className="mt-4 border-t border-line pt-3 text-xs font-medium text-muted">{department.location}</p>
                  </Card>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Telemedicine
 * ------------------------------------------------------------------ */
export function TelemedicineSection() {
  return (
    <section className="sa-section bg-white" aria-labelledby="telemedicine-heading">
      <div className="sa-container grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <div className="relative">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
              <Image
                src={telemedicine.image}
                alt="A doctor conducting a video follow-up consultation from a consulting room"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -right-4 -bottom-6 hidden rounded-2xl border border-line bg-white p-5 shadow-lift sm:block">
              <p className="text-3xl font-bold text-ink">20 min</p>
              <p className="mt-0.5 text-xs font-medium text-muted">Standard review length</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <span className="sa-eyebrow">
            <ICONS.video className="size-4" />
            Telemedicine
          </span>
          <h2 id="telemedicine-heading" className="mt-3 text-3xl font-bold tracking-tight text-ink text-balance sm:text-4xl">
            {telemedicine.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">{telemedicine.description}</p>
          <ul className="mt-6 space-y-3">
            {telemedicine.points.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-relaxed text-ink">
                <ICONS.check className="mt-0.5 size-4.5 shrink-0 text-success-600" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-lg border border-primary-100 bg-primary-50 p-3.5 text-sm text-primary-900">
            {telemedicine.note}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/appointments?type=FOLLOW_UP" variant="primary" size="lg">
              Book a review
            </ButtonLink>
            <ButtonLink href="/services#telemedicine" variant="ghost" size="lg">
              How it works
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Laboratory
 * ------------------------------------------------------------------ */
export function LaboratorySection() {
  return (
    <section className="relative isolate overflow-hidden bg-ink py-20 sm:py-24" aria-labelledby="lab-heading">
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1800&q=80"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/60" />
      </div>

      <div className="sa-container relative">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center">
          <Reveal>
            <span className="sa-eyebrow text-primary-300">
              <ICONS.flask className="size-4" />
              Diagnostics
            </span>
            <h2 id="lab-heading" className="mt-3 text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
              Results you can read without a phone call
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
              Routine haematology, chemistry, microbiology and serology are targeted within four hours. Urgent
              samples are flagged critical and phoned through to the clinician who ordered them. Everything is
              published to your portal the moment it is signed off.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/lab-results" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
                View my results
              </ButtonLink>
              <ButtonLink href="/services#diagnostics" variant="outlineDark" size="lg">
                Tests we offer
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <Card className="p-6">
              <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Turnaround targets</p>
              <dl className="mt-4 space-y-4">
                {[
                  { label: 'Routine bloods', value: '4 hours' },
                  { label: 'Microbiology culture', value: '48–72 hours' },
                  { label: 'Histopathology', value: '5 working days' },
                  { label: 'Critical results', value: 'Phoned immediately' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-b border-line pb-3 last:border-0 last:pb-0">
                    <dt className="text-sm text-muted">{row.label}</dt>
                    <dd className="text-sm font-semibold text-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Emergency banner
 * ------------------------------------------------------------------ */
export function EmergencySection() {
  return (
    <section className="sa-section bg-white" aria-labelledby="emergency-heading">
      <div className="sa-container">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-danger-100 bg-danger-50">
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:p-10">
              <div>
                <span className="sa-eyebrow text-danger-700">
                  <IconAmbulance className="size-4" />
                  Emergency
                </span>
                <h2 id="emergency-heading" className="mt-3 text-3xl font-bold tracking-tight text-ink text-balance sm:text-4xl">
                  {emergencyGuide.title}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/75">{emergencyGuide.intro}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={`tel:${config.hospital.emergencyPhone.replace(/\s/g, '')}`}
                    className="inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-danger-600 px-7 text-base font-bold text-white shadow-soft transition hover:bg-danger-700"
                  >
                    <IconPhone className="size-5" />
                    Call {config.hospital.emergencyPhone}
                  </a>
                  <ButtonLink href="/emergency" variant="secondary" size="lg">
                    Warning signs &amp; what to bring
                  </ButtonLink>
                </div>
              </div>

              <div className="rounded-xl border border-danger-100 bg-white p-5">
                <p className="text-sm font-semibold text-ink">Go to the emergency department now if you have:</p>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {emergencyGuide.redFlags.slice(0, 5).map((flag) => (
                    <li key={flag.title} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger-500" />
                      <span>
                        <span className="font-medium text-ink">{flag.title}</span> — {flag.description}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                  Full list of {emergencyGuide.redFlags.length} warning signs and how triage works.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Why choose us
 * ------------------------------------------------------------------ */
export function WhyChooseUsSection() {
  return (
    <section className="sa-section bg-canvas" aria-labelledby="why-heading">
      <div className="sa-container">
        <Reveal>
          <SectionHeading
            eyebrow="Why patients choose us"
            title="Care that is supervised, priced and recorded"
            align="center"
            className="text-center"
          />
        </Reveal>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {whyChooseUs.map((item, index) => {
            const Icon = ICONS[item.icon] || ICONS.shield;
            return (
              <li key={item.title}>
                <Reveal delay={Math.min(index * 0.05, 0.3)}>
                  <Card className="flex h-full gap-4 p-5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
                      <Icon className="size-5.5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
                    </div>
                  </Card>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Facilities + stats
 * ------------------------------------------------------------------ */
export function FacilitiesSection() {
  return (
    <section className="sa-section bg-white" aria-labelledby="facilities-heading">
      <div className="sa-container grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-center">
        <Reveal>
          <span className="sa-eyebrow">
            <ICONS.building className="size-4" />
            The hospital
          </span>
          <h2 id="facilities-heading" className="mt-3 text-3xl font-bold tracking-tight text-ink text-balance sm:text-4xl">
            Built for the volume Lagos actually brings
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Six theatres, a critical care unit, a digital imaging suite and a teaching centre that trains residents on
            our own patients — with consultant supervision on every shift.
          </p>
          <ButtonLink href="/about" variant="secondary" size="md" className="mt-6">
            More about the hospital
          </ButtonLink>
        </Reveal>

        <Reveal delay={0.1}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {facilities.map((facility) => (
              <li key={facility.title}>
                <Card className="h-full p-5">
                  <p className="text-base font-semibold text-ink">{facility.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{facility.description}</p>
                </Card>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Gallery
 * ------------------------------------------------------------------ */
export function GallerySection() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="sa-section bg-canvas" aria-labelledby="gallery-heading">
      <div className="sa-container">
        <Reveal>
          <SectionHeading
            eyebrow="Inside the hospital"
            title="Where your appointment happens"
            action={
              <ButtonLink href="/about#gallery" variant="secondary" size="md">
                View all
              </ButtonLink>
            }
          />
        </Reveal>
        <ul className="mt-10 grid auto-rows-[160px] grid-cols-2 gap-4 sm:auto-rows-[200px] lg:grid-cols-4">
          {gallery.slice(0, 6).map((photo, index) => (
            <li
              key={photo.src}
              className={
                index === 0
                  ? 'col-span-2 row-span-2 sm:row-span-2'
                  : index === 3
                    ? 'hidden sm:block'
                    : ''
              }
            >
              <Reveal delay={Math.min(index * 0.05, 0.3)} className="h-full">
                <figure className="group relative h-full overflow-hidden rounded-xl">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className={reduceMotion ? 'object-cover' : 'object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none'}
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-3.5 pt-8 text-xs font-semibold text-white">
                    {photo.caption}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Testimonials
 * ------------------------------------------------------------------ */
export function TestimonialsSection() {
  return (
    <section className="sa-section bg-white" aria-labelledby="testimonials-heading">
      <div className="sa-container">
        <Reveal>
          <SectionHeading
            eyebrow="From our patients"
            title="What changed for them"
            align="center"
            className="text-center"
          />
        </Reveal>
        <ul className="mt-10 grid gap-5 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <li key={item.name}>
              <Reveal delay={index * 0.08}>
                <Card className="flex h-full flex-col p-6">
                  <ICONS.star className="size-5 text-warning-500" />
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink/80">“{item.quote}”</blockquote>
                  <footer className="mt-5 border-t border-line pt-4">
                    <p className="text-sm font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-muted">{item.detail}</p>
                  </footer>
                </Card>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Closing CTA
 * ------------------------------------------------------------------ */
export function CtaSection() {
  return (
    <section className="relative isolate overflow-hidden bg-primary-700 py-16 sm:py-20">
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1800&q=80"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800/95 via-primary-700/90 to-primary-900/95" />
      </div>
      <div className="sa-container relative text-center">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
            Ready to book, or need us to explain something first?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/80">
            Book a consultation in under two minutes, or message our team with a question. We answer between visits,
            not instead of them.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/appointments" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
              Book an appointment
            </ButtonLink>
            <ButtonLink href="/contact" variant="outlineDark" size="lg">
              Contact the hospital
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
