'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { Avatar, Badge } from '../ui/Badge';
import { Input } from '../ui/Form';
import { IconSearch, IconUser } from '../ui/Icon';
import { cn, fullName } from '../../lib/utils';
import { useDebounced } from '../../hooks/useAsync';
import { searchPatients } from '../../lib/services/patients';

/**
 * Patient scoping shared by the clinical tabs (`/records`, `/prescriptions`,
 * `/lab-results`, `/billing`, `/documents`).
 *
 * A patient is always pinned to their own record - the backend would reject
 * anything else anyway. A clinician picks which chart they are reading, and
 * until they do, the page explains itself instead of showing an empty list.
 */
export function usePatientScope() {
  const { role, patientId } = useAuth();
  const isPatient = role === 'PATIENT';
  const [selectedId, setSelectedId] = useState(null);

  return {
    isPatient,
    patientId: isPatient ? patientId : selectedId,
    setPatientId: setSelectedId,
    /* Patients never need to pick; the picker renders only for clinicians. */
    needsSelection: !isPatient && !selectedId,
  };
}

function PatientResults({ query, onPick }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('idle');

  useEffect(() => {
    const term = (query || '').trim();
    if (!term) {
      setItems([]);
      setState('idle');
      return undefined;
    }
    let cancelled = false;
    setState('loading');
    searchPatients({ q: term, limit: 8 })
      .then((response) => {
        if (cancelled) return;
        setItems(response.data || []);
        setState('done');
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (state === 'idle') return null;
  if (state === 'loading') return <p className="px-4 py-3 text-sm text-muted">Searching…</p>;
  if (state === 'error') return <p className="px-4 py-3 text-sm text-danger-600">Search failed. Try again.</p>;
  if (!items.length) return <p className="px-4 py-3 text-sm text-muted">No patients match that search.</p>;

  return (
    <ul>
      {items.map((patient) => (
        <li key={patient.id}>
          <button
            type="button"
            onClick={() => onPick(patient)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-primary-50"
          >
            <Avatar firstName={patient.firstName} lastName={patient.lastName} size="xs" ring={false} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">
                {patient.fullName || `${patient.firstName} ${patient.lastName}`.trim()}
              </span>
              <span className="block truncate text-xs text-muted">{patient.hospitalNumber}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Search box + result list that lets a clinician open a patient's scope. */
export function PatientPicker({ onSelect, className }) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(term, 350);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          aria-label="Find a patient"
          placeholder="Search by name or hospital number"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9"
        />
      </div>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close results"
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-white shadow-lift">
            <PatientResults
              query={debounced}
              onPick={(patient) => {
                onSelect(patient);
                setOpen(false);
                setTerm(fullName(patient));
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Read-only banner telling a patient the view is scoped to them. */
export function OwnRecordNotice() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-muted">
      <IconUser className="size-4" />
      Showing your own record.
      <Badge tone="muted" size="sm">Private</Badge>
    </div>
  );
}

/** Shared header row: scope banner/picker plus any page-specific controls. */
export function ScopeBar({ scope, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        {scope.isPatient ? (
          <OwnRecordNotice />
        ) : (
          <PatientPicker
            className="w-full sm:max-w-md"
            onSelect={(patient) => scope.setPatientId(patient.id)}
          />
        )}
      </div>
      {children}
    </div>
  );
}
