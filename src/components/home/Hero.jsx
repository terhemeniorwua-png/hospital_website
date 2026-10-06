'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { config } from '../../lib/config';
import { heroImages } from '../../content/hospital';
import { ButtonLink } from '../ui/Button';
import { IconArrowRight, IconCalendar, IconClock, IconPhone, IconSearch, IconShield, IconStethoscope } from '../ui/Icon';

/**
 * Home hero.
 *
 * Photography sits behind a gradient scrim with `next/image`, the search is a
 * real form that navigates to /search, and the reduced-motion preference is
 * honoured through `useReducedMotion` so the floating card never animates for
 * users who have asked for stillness.
 */
export default function Hero() {
  const reduceMotion = useReducedMotion();

  const reveal = (delay) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: 0 } }
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <section className="relative isolate overflow-hidden bg-ink">
      {/* Backdrop */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={heroImages.primary}
          alt="Senior consultant reviewing a patient chart with a colleague in a bright hospital ward"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="sa-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      </div>

      <div className="sa-container relative py-20 sm:py-24 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          {/* Copy */}
          <div className="max-w-2xl">
            {/* <motion.div {...reveal(0)} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
              <IconShield className="size-4" />
              Fully accredited · 320 beds · 24-hour emergency care
            </motion.div> */}

            <motion.h1
              {...reveal(0.08)}
              className="mt-6 text-4xl leading-[1.08] font-bold tracking-tight text-white text-balance sm:text-5xl lg:text-6xl"
            >
              {config.hospital.name}
            </motion.h1>

            <motion.p {...reveal(0.16)} className="mt-5 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
              {config.hospital.tagline} Book a named consultant, collect your results and manage your records —{' '}
              <span className="font-semibold text-white">with fees shown before you arrive.</span>
            </motion.p>

            {/* Search */}
            <motion.form
              {...reveal(0.24)}
              action="/search"
              method="get"
              className="mt-8 flex flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-lift backdrop-blur sm:flex-row"
              role="search"
            >
              <label htmlFor="hero-search" className="sr-only">
                Search for a doctor, department, medicine or patient resource
              </label>
              <div className="flex flex-1 items-center gap-2.5 px-2">
                <IconSearch className="size-5 shrink-0 text-muted" />
                <input
                  id="hero-search"
                  name="q"
                  type="search"
                  placeholder="Doctor, department, medicine or symptom…"
                  className="h-11 w-full border-0 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Search
                <IconArrowRight className="size-4" />
              </button>
            </motion.form>

            <motion.div {...reveal(0.32)} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
              <a href={`tel:${config.hospital.emergencyPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 font-semibold text-white transition hover:text-primary-200">
                <IconPhone className="size-4" />
                Emergency {config.hospital.emergencyPhone}
              </a>
              <span className="flex items-center gap-2">
                <IconClock className="size-4" />
                Clinics 8:00–16:00, Monday to Friday
              </span>
            </motion.div>

            <motion.div {...reveal(0.4)} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/appointments" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
                <IconCalendar className="size-5" />
                Book an appointment
              </ButtonLink>
              <ButtonLink href="/doctors" variant="outlineDark" size="lg">
                Find a doctor
              </ButtonLink>
            </motion.div>
          </div>

          {/* Floating status card
          <motion.aside
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="hidden rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl lg:block"
            aria-label="At a glance"
          >
            <p className="text-xs font-semibold tracking-[0.12em] text-white/70 uppercase">At a glance</p>
            <dl className="mt-4 space-y-3.5">
              <Stat label="Consultations" value="8 departments" />
              <Stat label="Routine lab results" value="Within 4 hours" />
              <Stat label="Emergency department" value="Open 24 hours" />
              <Stat label="Teaching partners" value="2 medical colleges" />
            </dl>
            <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-white/10 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-500 text-white">
                <IconStethoscope className="size-5" />
              </span>
              <p className="text-xs leading-relaxed text-white/80">
                Residents treat under consultant supervision, so every visit is reviewed twice.
              </p>
            </div>
          </motion.aside> */}
        </div>
      </div>

      {/* Trust strip */}
      <div className="border-t border-white/10 bg-ink/60 py-5">
        <div className="sa-container grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {[
            { value: '320', label: 'Inpatient beds' },
            { value: '1974', label: 'Serving Lagos since' },
            { value: '6', label: 'Operating theatres' },
            { value: '24/7', label: 'Emergency care' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</p>
              <p className="mt-0.5 text-xs font-medium text-white/65 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <dt className="text-sm text-white/70">{label}</dt>
      <dd className="text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
