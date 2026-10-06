'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useToast } from '../providers/ToastProvider';

/**
 * Contact form.
 *
 * The backend exposes no public contact-form endpoint. Rather than posting to
 * something invented, this form hands the visitor to the one channel that does
 * exist — the authenticated portal inbox — and says so plainly.
 */
export default function ContactForm() {
  const { toast } = useToast();
  const [values, setValues] = useState({ name: '', email: '', subject: '', message: '' });

  function onSubmit(event) {
    event.preventDefault();
    const firstName = values.name.trim().split(' ')[0];
    toast.success(
      'Send this from your portal',
      `${firstName ? `${firstName}, your` : 'Your'} message belongs in the portal inbox, where our team replies and the thread is kept on your record.`,
    );
  }

  const field = 'h-11 rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted/70 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 focus:outline-none';

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2" noValidate>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Full name</span>
          <input
            type="text"
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            className={field}
            placeholder="Chioma Okonkwo"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Email address</span>
          <input
            type="email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            className={field}
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-ink">What is it about?</span>
          <select
            value={values.subject}
            onChange={(event) => setValues((current) => ({ ...current, subject: event.target.value }))}
            className={field}
          >
            <option value="">Choose a topic</option>
            <option value="appointment">Appointment booking or rescheduling</option>
            <option value="results">A laboratory or imaging result</option>
            <option value="prescription">A prescription or pharmacy query</option>
            <option value="billing">An invoice or insurance claim</option>
            <option value="feedback">Feedback or a complaint</option>
            <option value="other">Something else</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium text-ink">Message</span>
          <textarea
            rows={5}
            value={values.message}
            onChange={(event) => setValues((current) => ({ ...current, message: event.target.value }))}
            className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink placeholder:text-muted/70 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 focus:outline-none"
            placeholder="Please do not include sensitive clinical details in a public form — sign in and use your portal inbox for anything medical."
          />
        </label>

        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" size="lg">
            Continue in the portal inbox
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            There is no public contact-form endpoint on the server. Once you sign in, the same message goes to your
            care team as a secure portal conversation with a full audit trail.
          </p>
        </div>
      </form>
    </Card>
  );
}
