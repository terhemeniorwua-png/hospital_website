'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select, Checkbox } from '../ui/Form';
import { ICONS } from '../ui/IconMap';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';

/**
 * Account creation.
 *
 * Field-for-field against POST /auth/register (backend/src/validators/auth.validator.js):
 * required — firstName, email, password (8-72), phone, gender, dateOfBirth, bloodGroup
 * optional — lastName, address, city, state, emergencyContact*, occupation
 *
 * Registration returns tokens, so the visitor is signed in on success and never
 * sees the login form after this.
 */

const GENDERS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Carer', 'Other'];

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  bloodGroup: '',
  address: '',
  city: 'Lagos',
  state: 'Lagos',
  occupation: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  password: '',
  confirmPassword: '',
  consent: false,
};

/** Mirrors the backend's own password rules so failures never need a round trip. */
function passwordProblem(password) {
  if (!password) return 'Choose a password';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 72) return 'Password must be 72 characters or fewer';
  return null;
}

/** Mirrors the backend phone rule: optional +, then digits/spaces/dashes, 6-20 chars. */
function phoneProblem(value) {
  if (!value) return null;
  return /^\+?[0-9][0-9\s-]{5,19}$/.test(value.trim()) ? null : 'Enter a valid phone number';
}

export default function RegisterForm({ onSuccess }) {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [pending, setPending] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function validate() {
    const errors = {};

    if (!form.firstName.trim()) errors.firstName = 'First name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';

    const phone = phoneProblem(form.phone);
    if (phone) errors.phone = phone;

    if (!form.gender) errors.gender = 'Select your gender';
    if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    else if (form.dateOfBirth > new Date().toISOString().slice(0, 10))
      errors.dateOfBirth = 'Date of birth cannot be in the future';

    const password = passwordProblem(form.password);
    if (password) errors.password = password;
    if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match';

    if (!form.consent) errors.consent = 'Please accept the privacy notice to continue';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setPending(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        bloodGroup: form.bloodGroup || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
        emergencyContactRelationship: form.emergencyContactRelationship || undefined,
        password: form.password,
      };

      const data = await signUp(payload);
      toast.success('Account created', `Welcome to St. Aurelia, ${data?.user?.firstName || payload.firstName}.`);

      if (onSuccess) onSuccess(data);
      else router.push('/dashboard');
    } catch (caught) {
      if (caught?.fieldErrors && Object.keys(caught.fieldErrors).length) setFieldErrors(caught.fieldErrors);
      setFormError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <Section
        step={1}
        title="Who you are"
        description="This is what appears on your hospital records and appointment letters."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="First name"
            required
            autoComplete="given-name"
            maxLength={80}
            value={form.firstName}
            onChange={(event) => set('firstName', event.target.value)}
            error={fieldErrors.firstName}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            maxLength={80}
            value={form.lastName}
            onChange={(event) => set('lastName', event.target.value)}
            error={fieldErrors.lastName}
            hint="Optional, but it helps us match duplicate records."
          />
          <Input
            label="Date of birth"
            type="date"
            required
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
            value={form.dateOfBirth}
            onChange={(event) => set('dateOfBirth', event.target.value)}
            error={fieldErrors.dateOfBirth}
          />
          <Select
            label="Gender"
            required
            options={GENDERS}
            placeholder="Select"
            value={form.gender}
            onChange={(event) => set('gender', event.target.value)}
            error={fieldErrors.gender}
          />
          <Input
            label="Phone number"
            type="tel"
            autoComplete="tel"
            placeholder="+234 800 000 0000"
            value={form.phone}
            onChange={(event) => set('phone', event.target.value)}
            error={fieldErrors.phone}
            hint="Used for appointment reminders only."
          />
          <Select
            label="Blood group"
            options={BLOOD_GROUPS.map((group) => ({ value: group, label: group }))}
            placeholder="Not sure yet"
            value={form.bloodGroup}
            onChange={(event) => set('bloodGroup', event.target.value)}
            error={fieldErrors.bloodGroup}
          />
        </div>
      </Section>

      <Section step={2} title="How to reach you" description="Used for letters, lab results and delivery of prescriptions.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Email address"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(event) => set('email', event.target.value)}
            error={fieldErrors.email}
            containerClassName="sm:col-span-2"
          />
          <Input
            label="Street address"
            autoComplete="street-address"
            maxLength={255}
            value={form.address}
            onChange={(event) => set('address', event.target.value)}
            error={fieldErrors.address}
            containerClassName="sm:col-span-2"
          />
          <Input
            label="City"
            autoComplete="address-level2"
            maxLength={80}
            value={form.city}
            onChange={(event) => set('city', event.target.value)}
            error={fieldErrors.city}
          />
          <Input
            label="State"
            autoComplete="address-level1"
            maxLength={80}
            value={form.state}
            onChange={(event) => set('state', event.target.value)}
            error={fieldErrors.state}
          />
          <Input
            label="Occupation"
            maxLength={120}
            value={form.occupation}
            onChange={(event) => set('occupation', event.target.value)}
            error={fieldErrors.occupation}
            hint="Optional."
          />
        </div>
      </Section>

      <Section
        step={3}
        title="Emergency contact"
        description="Who we should call if you cannot be reached. You can change this at any time."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Contact name"
            maxLength={120}
            value={form.emergencyContactName}
            onChange={(event) => set('emergencyContactName', event.target.value)}
            error={fieldErrors.emergencyContactName}
          />
          <Input
            label="Contact phone"
            type="tel"
            placeholder="+234 800 000 0000"
            value={form.emergencyContactPhone}
            onChange={(event) => set('emergencyContactPhone', event.target.value)}
            error={fieldErrors.emergencyContactPhone}
          />
          <Select
            label="Relationship"
            options={RELATIONSHIPS.map((item) => ({ value: item, label: item }))}
            placeholder="Select"
            value={form.emergencyContactRelationship}
            onChange={(event) => set('emergencyContactRelationship', event.target.value)}
            error={fieldErrors.emergencyContactRelationship}
          />
        </div>
      </Section>

      <Section step={4} title="Secure your account" description="Choose a password you do not use anywhere else.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            leading={<ICONS.lock className="size-4" />}
            value={form.password}
            onChange={(event) => set('password', event.target.value)}
            error={fieldErrors.password}
            hint="At least 8 characters."
          />
          <Input
            label="Confirm password"
            type="password"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) => set('confirmPassword', event.target.value)}
            error={fieldErrors.confirmPassword}
          />
        </div>
        <div className="mt-5">
          <Checkbox
            checked={form.consent}
            onChange={(event) => set('consent', event.target.checked)}
            label="I agree to the privacy notice"
            description="We hold your health information to deliver your care. We never sell patient data."
          />
          {fieldErrors.consent ? (
            <p role="alert" className="mt-1.5 text-xs font-medium text-danger-600">
              {fieldErrors.consent}
            </p>
          ) : null}
        </div>
      </Section>

      {formError ? (
        <div role="alert" className="rounded-lg border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {formError.message}
          {formError.status === 409 ? (
            <p className="mt-1.5 text-danger-700/85">
              Already registered?{' '}
              <Link href="/login" className="font-semibold underline">
                Sign in instead
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" size="lg" loading={pending}>
          Create my account
        </Button>
        <p className="text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

function Section({ step, title, description, children }) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        icon={
          <span className="grid size-7 place-items-center rounded-full bg-primary-600 text-xs font-semibold text-white">
            {step}
          </span>
        }
      />
      <CardBody>{children}</CardBody>
    </Card>
  );
}
