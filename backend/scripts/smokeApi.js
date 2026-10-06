/* eslint-disable no-console */
/**
 * End-to-end smoke test against a running app instance and a live database.
 *
 * Walks a representative slice of every mounted module with a real access token
 * so that routing, RBAC, zod coercion and the SQL behind each service are all
 * exercised together. Exits non-zero on the first unexpected status.
 *
 * Usage: node scripts/smokeApi.js [apiPrefix]
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { Op } = require('sequelize');
const createApp = require('../src/app');
const env = require('../src/config/env');

const DEMO_PASSWORD = process.env.SMOKE_PASSWORD || 'Password123!';

/** Availability rejects past dates, so date-based checks use a future day. */
const TOMORROW = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
const ACCOUNTS = [
  ['superadmin', 'superadmin@hospital.test'],
  ['doctor', 'doctor@hospital.test'],
  ['nurse', 'nurse@hospital.test'],
  ['pharmacist', 'pharmacist@hospital.test'],
  ['reception', 'reception@hospital.test'],
];

/** A uuid that will never exist, used for the foreign-record checks. */
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

/**
 * Ids are uuids, so the checks below are built from real rows instead of
 * hard-coded `1`s. Resolved once against the seeded database.
 */
async function resolveIds() {
  const { Patient, Doctor, Department, LaboratoryTest } = require('../src/models');
  const [patient, doctor, department, test] = await Promise.all([
    Patient.findOne({ attributes: ['id'] }),
    Doctor.findOne({ attributes: ['id', 'departmentId'], where: { departmentId: { [Op.ne]: null } } }),
    Department.findOne({ attributes: ['id'] }),
    LaboratoryTest.findOne({ attributes: ['id'] }),
  ]);
  const ids = {
    patientId: patient && patient.id,
    doctorId: doctor && doctor.id,
    departmentId: (doctor && doctor.departmentId) || (department && department.id),
    testId: test && test.id,
  };
  if (Object.values(ids).some((value) => !value)) {
    throw new Error(`seeded database is missing base records: ${JSON.stringify(ids)}`);
  }
  return ids;
}

/** [method, path, expectedStatus, permissionContext] */
const checksFor = ({ patientId, doctorId, departmentId, testId }) => [
  ['GET', '/patients?limit=5', 200],
  ['GET', '/patients/statistics', 200],
  ['GET', '/patients/search?q=chi', 200],
  ['GET', `/patients/${patientId}`, 200],
  ['GET', `/patients/${patientId}/allergies`, 200],
  ['GET', `/patients/${patientId}/conditions`, 200],
  ['GET', `/patients/${patientId}/history`, 200],
  ['GET', '/departments', 200],
  ['GET', '/departments/overview', 200],
  ['GET', `/departments/${departmentId}`, 200],
  ['GET', `/departments/${departmentId}/staff`, 200],
  ['GET', '/staff/directory', 200],
  ['GET', '/staff/roles', 200],
  ['GET', '/appointments?limit=5', 200],
  ['GET', '/appointments/statistics', 200],
  ['GET', `/appointments/availability?doctorId=${doctorId}&date=${TOMORROW}`, 200],
  ['GET', `/appointments/doctors?departmentId=${departmentId}&date=${TOMORROW}`, 200],
  ['GET', '/appointments/follow-ups', 200],
  ['GET', '/appointments/statuses', 200],
  ['GET', `/queue/board?departmentId=${departmentId}`, 200],
  ['GET', '/queue?limit=5', 200],
  ['GET', '/queue/statistics', 200],
  ['GET', '/consultations?limit=5', 200],
  ['GET', '/consultations/statistics', 200],
  ['GET', `/medical-records/${patientId}/timeline`, 200],
  ['GET', `/medical-records/${patientId}/summary`, 200],
  ['GET', `/medical-records/${patientId}/records?limit=5`, 200],
  ['GET', `/medical-records/${patientId}/export?format=json`, 200],
  ['GET', '/laboratory/tests?limit=5', 200],
  ['GET', `/laboratory/tests/${testId}`, 200],
  ['GET', '/laboratory?limit=5', 200],
  ['GET', '/laboratory/statistics', 200],
  ['GET', '/laboratory/results?limit=5', 200],
  ['GET', '/imaging?limit=5', 200],
  ['GET', '/pharmacy?limit=5', 200],
  ['GET', '/pharmacy/medications?limit=5', 200],
  ['GET', '/pharmacy/inventory?limit=5', 200],
  ['GET', '/pharmacy/inventory/alerts', 200],
  ['GET', '/pharmacy/statistics', 200],
  ['GET', '/admissions/wards', 200],
  ['GET', '/admissions/beds?limit=5', 200],
  ['GET', '/admissions/beds/counts', 200],
  ['GET', '/admissions?limit=5', 200],
  ['GET', '/admissions/statistics', 200],
  ['GET', '/nursing/assigned-patients', 200],
  ['GET', '/nursing/notes?limit=5', 200],
  ['GET', '/nursing/administrations?limit=5', 200],
  ['GET', '/nursing/vitals?limit=5', 200],
  ['GET', '/nursing/statistics', 200],
  ['GET', '/emergency?limit=5', 200],
  ['GET', '/emergency/waiting-room', 200],
  ['GET', '/emergency/board', 200],
  ['GET', '/emergency/statistics', 200],
  ['GET', '/billing?limit=5', 200],
  ['GET', '/billing/payments?limit=5', 200],
  ['GET', '/billing/statistics', 200],
  ['GET', `/billing/statement/${patientId}`, 200],
  ['GET', '/insurance/providers', 200],
  ['GET', '/insurance/policies', 200],
  ['GET', '/insurance/claims?limit=5', 200],
  ['GET', '/insurance/statistics', 200],
  ['GET', '/notifications?limit=5', 200],
  ['GET', '/notifications/unread-count', 200],
  ['GET', '/notifications/conversations', 200],
  ['GET', '/documents?limit=5', 200],
  ['GET', '/analytics/overview', 200],
  ['GET', '/analytics/appointments-trend', 200],
  ['GET', '/analytics/bed-occupancy', 200],
  ['GET', '/analytics/revenue-by-day', 200],
  ['GET', '/analytics/department-utilisation', 200],
  ['GET', '/analytics/top-prescriptions', 200],
  ['GET', '/analytics/workload', 200],
  ['GET', '/analytics/audit-log?limit=5', 200],
  ['GET', '/analytics/audit-summary', 200],
  ['GET', '/analytics/performance', 200],
];

async function login(base, email) {
  const response = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.data?.accessToken) {
    throw new Error(`login failed for ${email}: ${response.status} ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body.data.accessToken;
}

async function main() {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}${env.API_PREFIX}`;

  let passed = 0;
  const failures = [];

  let checks = [];

  try {
    checks = checksFor(await resolveIds());
    const token = await login(base, ACCOUNTS[0][1]);

    for (const [method, routePath, expected] of checks) {
      const response = await fetch(`${base}${routePath}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await response.text();
      if (response.status === expected) {
        passed += 1;
      } else {
        let snippet = text.slice(0, 220);
        try {
          const parsed = JSON.parse(text);
          snippet = `${parsed.message} ${JSON.stringify(parsed.errors || [])}`.slice(0, 220);
        } catch {
          /* keep raw text */
        }
        failures.push(`${method} ${routePath} -> ${response.status} (expected ${expected}) ${snippet}`);
      }
    }

    /* RBAC: a doctor must not be able to read the audit log. */
    const doctorToken = await login(base, ACCOUNTS[1][1]);
    const audit = await fetch(`${base}/analytics/audit-log`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (audit.status === 403) passed += 1;
    else failures.push(`RBAC doctor -> /analytics/audit-log returned ${audit.status}, expected 403`);

    /* Patients must not see another patient's record. */
    const patientToken = await login(base, 'patient@hospital.test');
    const foreign = await fetch(`${base}/medical-records/${UNKNOWN_ID}/timeline`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (foreign.status === 403 || foreign.status === 404) passed += 1;
    else failures.push(`patient isolation /medical-records/${UNKNOWN_ID} -> ${foreign.status}, expected 403/404`);

    /* A patient must not be able to create a patient. */
    const forbidden = await fetch(`${base}/patients`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Mallory', gender: 'FEMALE' }),
    });
    if (forbidden.status === 403) passed += 1;
    else failures.push(`patient -> POST /patients returned ${forbidden.status}, expected 403`);
  } catch (error) {
    failures.push(`harness error: ${error.message}`);
  } finally {
    server.close();
    await require('../src/models').sequelize.close();
  }

  if (failures.length) {
    console.error(`\nAPI smoke FAILED: ${passed} passed, ${failures.length} failed\n`);
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }

  console.log(`\nAPI smoke OK: ${passed}/${checks.length + 3} checks passed.`);
}

main();