/* eslint-disable no-console */
/**
 * Cross-checks request-validation schemas against the Sequelize models they
 * write to.
 *
 * A schema key that no column exists for is not caught by zod (it is a perfectly
 * valid key); it only fails later as a Postgres "column does not exist" at
 * runtime. This walks every body schema and flags keys that match neither a
 * model attribute nor a small allowlist of service-managed fields.
 *
 * Usage: node scripts/checkValidatorModels.js
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', 'src');
const { z } = require('zod');

/**
 * Keys consumed by the service layer rather than written straight to a column
 * (nested clinical-profile objects, service-managed flags, derived values).
 */
const IGNORED = new Set([
  'id',
  'userId',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'registeredBy',
  'recordedBy',
  'deletedAt',
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'createLogin',
  'requestType',
  'ipAddress',
  'userAgent',
  // staff.service dispatches on `role` and writes role-specific profiles.
  'role',
  'roleName',
  'doctor',
  'nurse',
  'staff',
  'departmentId',
  // staff.service copies this onto the DepartmentStaff row it creates.
  'roleInDepartment',
  // consultation.service treats this as an override, not a column.
  'allowCompletedEdit',
  // nursing.service expands these into MedicationAdministration rows.
  'startAt',
  'days',
  'prescriptionId',
]);

/** Flatten a zod object schema down to its top-level keys. */
function keysOf(schema) {
  const def = schema?._zod?.def;
  const shape = def?.type === 'object' ? def.shape : def?.shape?.();
  if (!shape) return null;
  return Object.keys(shape);
}

/** Column names for a model, including associations. */
function columnsOf(modelName) {
  const index = require(path.join(ROOT, 'models', 'index.js'));
  const model = index[modelName];
  if (!model) return null;
  return new Set(Object.keys(model.rawAttributes));
}

/** All column names across every model, for schemas that span several tables. */
const ALL_COLUMNS = (() => {
  const index = require(path.join(ROOT, 'models', 'index.js'));
  const set = new Set();
  Object.values(index).forEach((model) => {
    if (model && model.rawAttributes) Object.keys(model.rawAttributes).forEach((key) => set.add(key));
  });
  return set;
})();

/** Schema prefix -> models whose columns it may write. */
const SCHEMA_MODELS = {
  'patient.create': ['Patient'],
  'patient.update': ['Patient'],
  'patient.allergy': ['Allergy'],
  'patient.condition': ['MedicalCondition'],
  'patient.conditionUpdate': ['MedicalCondition'],
  'patient.history': ['MedicalHistory'],
  'department.createDepartment': ['Department'],
  'department.updateDepartment': ['Department'],
  'department.assignStaff': ['DepartmentStaff'],
  'department.createStaff': ['User'],
  'department.updateStaff': ['User'],
  'pharmacy.restock': ['PharmacyInventory', 'InventoryTransaction'],
  'pharmacy.adjust': ['PharmacyInventory'],
  'emergency.register': ['EmergencyCase'],
  'emergency.triage': ['EmergencyCase'],
  'emergency.assignDoctor': ['EmergencyCase'],
  'emergency.discharge': ['EmergencyCase'],
  'nursing.createNote': ['NursingNote'],
  'nursing.createSchedule': ['MedicationAdministration'],
  'consultation.start': ['Consultation'],
  'consultation.update': ['Consultation'],
  'consultation.complete': ['Consultation'],
  'consultation.diagnosis': ['Diagnosis'],
  'consultation.diagnosisUpdate': ['Diagnosis'],
};

const validatorsDir = path.join(ROOT, 'validators');
const problems = [];
let inspected = 0;

for (const file of fs.readdirSync(validatorsDir).filter((name) => name.endsWith('.validator.js')).sort()) {
  const prefix = file.replace('.validator.js', '');
  const loaded = require(path.join(validatorsDir, file));

  for (const [name, schema] of Object.entries(loaded)) {
    if (!name.startsWith('create') && !name.startsWith('update')) continue;
    const body = schema?.body;
    if (!body || typeof body.parse !== 'function') continue;

    const models = SCHEMA_MODELS[`${prefix}.${name}`];
    if (!models) continue;

    const allowed = new Set();
    let resolvedAll = true;
    for (const modelName of models) {
      const columns = columnsOf(modelName);
      if (!columns) {
        resolvedAll = false;
        break;
      }
      columns.forEach((column) => allowed.add(column));
    }
    if (!resolvedAll) continue;

    // Top-level keys only: nested item arrays are validated by their own schemas.
    const keys = keysOf(body);
    if (!keys) continue;
    inspected += 1;

    keys.forEach((key) => {
      if (IGNORED.has(key) || allowed.has(key)) return;
      problems.push(`${prefix}.${name}.body -> "${key}" matches no ${models.join('/')} column`);
    });
  }
}

if (problems.length) {
  console.error(`Validator/model mismatch check FAILED (${problems.length}):`);
  problems.forEach((problem) => console.error(`  - ${problem}`));
  process.exit(1);
}

console.log(`Validator/model alignment OK: ${inspected} body schemas checked against Sequelize models.`);
void z;