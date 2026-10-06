'use client';

import { useState } from 'react';
import { PageHeader, PageBody, PageSection, CtaStrip } from '../../components/layout/PageShell';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ICONS } from '../../components/ui/IconMap';
import { faqs, resources } from '../../content/hospital';

export default function ResourcesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Patient resources"
        title="Guides, fees and answers"
        description="Plain-language information about consent, fees, medicines, scans and results — written for patients, not for clinicians."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Resources' }]}
        actions={
          <ButtonLink href="/messages" variant="primary" size="lg">
            Ask our team
          </ButtonLink>
        }
      />

      <PageBody>
        <PageSection>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource, index) => {
              const Icon = ICONS[resource.icon] || ICONS.file;
              return (
                <li key={resource.title} id={resource.icon === 'pill' ? 'medicines' : undefined}>
                  <Card className="h-full p-5">
                    <div className="flex items-center gap-3.5">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
                        <Icon className="size-5.5" />
                      </span>
                      <h2 className="text-base font-semibold text-ink">{resource.title}</h2>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{resource.description}</p>
                    <p className="mt-4 text-xs font-medium text-muted">Guide {index + 1} of {resources.length}</p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </PageSection>

        <PageSection
          title="Frequently asked questions"
          description="If your question is not answered here, message your care team from your portal — we answer between appointments."
        >
          <FaqList />
        </PageSection>
      </PageBody>

      <CtaStrip
        title="Still have a question?"
        description="Send it to your care team in the portal. Non-urgent messages are usually answered within one working day."
        primary={
          <ButtonLink href="/messages" variant="primary" size="lg" className="bg-white text-primary-700 hover:bg-primary-50">
            Message my care team
          </ButtonLink>
        }
        secondary={
          <ButtonLink href="/contact" variant="outlineDark" size="lg">
            Call the switchboard
          </ButtonLink>
        }
      />
    </>
  );
}

/** Accessible accordion: one open item at a time, real buttons, aria-expanded. */
function FaqList() {
  const [open, setOpen] = useState(0);

  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {faqs.map((faq, index) => {
        const isOpen = open === index;
        return (
          <div key={faq.question}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${index}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-canvas"
              >
                <span className="text-sm font-semibold text-ink sm:text-base">{faq.question}</span>
                <ICONS.chevronDown
                  className={`size-5 shrink-0 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </h3>
            {isOpen ? (
              <div id={`faq-panel-${index}`} className="px-5 pb-5">
                <p className="text-sm leading-relaxed text-muted">{faq.answer}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
