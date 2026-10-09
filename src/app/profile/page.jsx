'use client';

import { useState } from 'react';
import RequireAuth from '../../components/dashboard/RequireAuth';
import DashboardShell from '../../components/dashboard/DashboardShell';
import { AsyncView, StatCard, StatGrid } from '../../components/dashboard/primitives';
import { Card, CardBody, CardHeader, DetailRow } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import {
  IconLogout,
  IconHeart,
  IconLock,
  IconShield,
  IconUser,
} from '../../components/ui/Icon';
import { CardSkeleton, EmptyState, Notice } from '../../components/ui/States';
import { useAuth } from '../../components/providers/AuthProvider';
import { useToast } from '../../components/providers/ToastProvider';
import { useSubmit } from '../../hooks/useAsync';
import { changePassword, logoutAll } from '../../lib/services/auth';
import { getPatientSummary } from '../../lib/services/auth';
import { formatDate, fullName } from '../../lib/utils';

function IdentityCard() {
  const { user, role, patientId } = useAuth();
  const patient = user?.patient;
  const doctor = user?.doctorProfile;

  return (
    <Card>
      <CardHeader
        icon={<IconUser className="size-5" />}
        title="Account"
        description={fullName(user) || user?.email}
        action={<Badge tone="primary" size="sm">{role}</Badge>}
      />
      <CardBody className="space-y-1">
        <dl className="divide-y divide-line">
          <DetailRow label="Full name" value={fullName(user) || '—'} />
          <DetailRow label="Email" value={user?.email || '—'} />
          <DetailRow label="Phone" value={user?.phone || patient?.phone || '—'} />
          <DetailRow label="Member since" value={user?.createdAt ? formatDate(user.createdAt, 'full') : '—'} />
          {patientId ? <DetailRow label="Hospital number" value={patient?.hospitalNumber || 'Linked record'} /> : null}
          {doctor ? <DetailRow label="Department" value={doctor.departmentName || doctor.departmentId || '—'} /> : null}
        </dl>
      </CardBody>
    </Card>
  );
}

function ClinicalCard() {
  const { patientId } = useAuth();

  if (!patientId) {
    return (
      <Card>
        <CardHeader icon={<IconShield className="size-5" />} title="Care team" />
        <CardBody>
          <EmptyState
            compact
            icon={<IconShield className="size-6" />}
            title="Staff account"
            description="Clinical details live on each patient chart, not on the staff profile."
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <AsyncView
      fetcher={() => getPatientSummary(patientId)}
      deps={[patientId]}
      skeleton={<Card><CardSkeleton lines={5} /></Card>}
      isEmpty={(payload) => !payload?.data?.patient}
      empty={
        <EmptyState
          compact
          icon={<IconHeart className="size-6" />}
          title="No record linked"
          description="Your account is not linked to a patient chart yet."
        />
      }
    >
      {(response) => {
        const data = response.data || {};
        const patient = data.patient || {};
        const allergies = data.allergies || [];
        const conditions = data.conditions || [];
        const vitals = data.latestVitals || null;
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader
                icon={<IconHeart className="size-5" />}
                title="Your record"
                description={patient.hospitalNumber}
                action={<StatusBadge status={patient.status} size="sm" />}
              />
              <CardBody>
                <dl className="divide-y divide-line">
                  <DetailRow label="Date of birth" value={patient.dateOfBirth ? formatDate(patient.dateOfBirth, 'full') : '—'} />
                  <DetailRow label="Gender" value={patient.gender || '—'} />
                  <DetailRow label="Blood group" value={patient.bloodGroup || '—'} />
                  <DetailRow label="Genotype" value={patient.genotype || '—'} />
                  <DetailRow label="Allergies on file" value={String(allergies.length)} />
                  <DetailRow label="Active conditions" value={String(conditions.length)} />
                </dl>
              </CardBody>
            </Card>

            {vitals ? (
              <StatGrid>
                <StatCard label="Blood pressure" value={`${vitals.systolic}/${vitals.diastolic}`} hint="mmHg" tone="primary" />
                <StatCard label="Pulse" value={vitals.pulse} hint="bpm" tone="success" />
                <StatCard label="Temperature" value={vitals.temperature} hint="°C" tone="warning" />
                <StatCard label="SpO₂" value={vitals.oxygenSaturation} hint="%" tone="danger" />
              </StatGrid>
            ) : null}

            {allergies.length ? (
              <Notice tone="warning" title="Allergies">
                <ul className="list-disc pl-5">
                  {allergies.map((allergy) => (
                    <li key={allergy.id || allergy.name}>{allergy.name || allergy.allergen || allergy.allergyName}</li>
                  ))}
                </ul>
              </Notice>
            ) : null}
          </div>
        );
      }}
    </AsyncView>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState(null);

  const { submit, pending, error, reset } = useSubmit(async () => {
    if (form.newPassword !== form.confirmPassword) {
      setMessage('New password and confirmation do not match.');
      return;
    }
    await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword,
    });
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setMessage(null);
    toast.success('Password changed', 'Use your new password the next time you sign in.');
  });

  return (
    <Card>
      <CardHeader icon={<IconLock className="size-5" />} title="Change password" description="Minimum 8 characters" />
      <CardBody className="space-y-4">
        <Input
          type="password"
          aria-label="Current password"
          placeholder="Current password"
          value={form.currentPassword}
          onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
        />
        <Input
          type="password"
          aria-label="New password"
          placeholder="New password"
          value={form.newPassword}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
        />
        <Input
          type="password"
          aria-label="Confirm new password"
          placeholder="Confirm new password"
          value={form.confirmPassword}
          onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
        />

        {message ? <p className="text-sm text-danger-600">{message}</p> : null}
        {error ? <p className="text-sm text-danger-600">{error.message}</p> : null}

        <Button
          loading={pending}
          disabled={!form.currentPassword || !form.newPassword || !form.confirmPassword}
          onClick={() => submit().catch(() => { reset(); })}
        >
          Update password
        </Button>
      </CardBody>
    </Card>
  );
}

function SessionsCard() {
  const toast = useToast();
  const { logout } = useAuth();

  const { submit, pending, error } = useSubmit(async () => {
    await logoutAll();
    toast.info('Signed out everywhere', 'All active sessions were ended.');
    await logout();
  });

  return (
    <Card>
      <CardHeader icon={<IconLogout className="size-5" />} title="Sessions" description="End every device at once" />
      <CardBody className="space-y-3">
        <p className="text-sm text-muted">
          Signs you out of this device and every other browser or phone signed in to your account.
        </p>
        {error ? <p className="text-sm text-danger-600">{error.message}</p> : null}
        <Button variant="secondary" loading={pending} onClick={() => submit().catch(() => {})}>
          Sign out everywhere
        </Button>
      </CardBody>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <DashboardShell title="Profile" description="Account, record and security" wide>
        <div className="grid gap-6 lg:grid-cols-2">
          <IdentityCard />
          <PasswordCard />
          <ClinicalCard />
          <SessionsCard />
        </div>
      </DashboardShell>
    </RequireAuth>
  );
}
