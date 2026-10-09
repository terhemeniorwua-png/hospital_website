'use client';

import { useEffect, useState } from 'react';
import { useToast } from '../providers/ToastProvider';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Form';
import { Notice } from '../ui/States';
import { useSubmit } from '../../hooks/useAsync';
import { SOAP_FIELDS, completeConsultation, startConsultation, updateConsultation } from '../../lib/services/consultations';

const BLANK = Object.fromEntries(SOAP_FIELDS.map((field) => [field.key, '']));

/**
 * SOAP note editor for a clinical encounter.
 *
 * `mode` decides which real endpoint is hit: `create` starts a consultation,
 * `edit` PUTs the note, `complete` closes the encounter. Field names are the
 * backend's own (`SOAP_FIELDS`), so nothing is mapped or guessed here.
 */
export default function SoapEditor({ open, mode = 'create', patientId, consultation, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(BLANK);
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    if (!open) return;
    if (consultation) {
      setForm({ ...BLANK, ...Object.fromEntries(SOAP_FIELDS.map((f) => [f.key, consultation[f.key] || ''])) });
      setFollowUpDate(consultation.followUpDate || '');
    } else {
      setForm(BLANK);
      setFollowUpDate('');
    }
  }, [open, consultation]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const { submit, pending, error } = useSubmit(async () => {
    const payload = Object.fromEntries(
      Object.entries(form)
        .map(([key, value]) => [key, String(value).trim()])
        .filter(([, value]) => value !== ''),
    );
    if (followUpDate) payload.followUpDate = followUpDate;

    if (mode === 'create') {
      await startConsultation({ patientId, ...payload });
      toast.success('Consultation started', 'The encounter is now open and can be edited until it is completed.');
    } else if (mode === 'complete') {
      await completeConsultation(consultation.id, payload);
      toast.success('Consultation completed', 'The encounter has been closed.');
    } else {
      await updateConsultation(consultation.id, { ...payload, status: 'IN_PROGRESS' });
      toast.success('Note saved');
    }
    onSaved?.();
  });

  const title =
    mode === 'create' ? 'Start consultation' : mode === 'complete' ? 'Complete consultation' : 'Edit clinical note';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={
        consultation
          ? `Encounter ${consultation.consultationNumber}`
          : 'Record the chief complaint, findings and plan for this patient.'
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={() => submit().catch(() => {})}
            loading={pending}
            disabled={mode === 'create' && !form.chiefComplaint.trim()}
          >
            {mode === 'complete' ? 'Complete encounter' : mode === 'edit' ? 'Save note' : 'Start encounter'}
          </Button>
        </>
      }
    >
      {mode === 'create' ? (
        <Notice tone="info" title="Starting an encounter">
          Only open a consultation when you are ready to see the patient - it appears in your active list immediately.
        </Notice>
      ) : null}

      <div className="mt-4 space-y-4">
        {SOAP_FIELDS.map((field, index) => (
          <Textarea
            key={field.key}
            label={field.label}
            hint={index === 0 ? 'Required to start an encounter.' : undefined}
            rows={field.rows}
            maxLength={field.max}
            value={form[field.key]}
            onChange={(event) => setField(field.key, event.target.value)}
            placeholder={field.key === 'chiefComplaint' ? 'Why has the patient come in?' : ''}
          />
        ))}

        <label className="block">
          <span className="text-sm font-medium text-ink">Follow-up date (optional)</span>
          <input
            type="date"
            value={followUpDate}
            onChange={(event) => setFollowUpDate(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-danger-600">{error.message}</p> : null}
    </Modal>
  );
}
