/**
 * One-off developer utility: renders Sequelize CLI migrations from the model
 * definitions in `src/models`. The generated files are the source of truth and
 * are committed; this script only exists to keep them consistent while the
 * schema is being built.
 *
 *   node scripts/generateMigrations.js
 */
const fs = require('fs');
const path = require('path');
const models = require('../src/models');

const OUT_DIR = path.resolve(__dirname, '..', 'src', 'migrations');

/** Partial unique indexes cannot be expressed with `addIndex` options. */
const EXTRA_SQL = {
  '20260101000003-create-appointments-and-queue.js': [
    // A doctor can hold only one live appointment per date/time. Cancelled and
    // no-show appointments release the slot for rebooking.
    `CREATE UNIQUE INDEX IF NOT EXISTS "appointments_unique_live_slot"
       ON "appointments" ("doctor_id", "appointment_date", "start_time")
     WHERE status NOT IN ('CANCELLED', 'NO_SHOW')`,
    // The same patient cannot hold two live appointments for the same slot.
    `CREATE UNIQUE INDEX IF NOT EXISTS "appointments_unique_live_patient_slot"
       ON "appointments" ("patient_id", "doctor_id", "appointment_date", "start_time")
     WHERE status NOT IN ('CANCELLED', 'NO_SHOW')`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "queue_entries_unique_open_ticket"
       ON "queue_entries" ("department_id", "queue_date", "ticket_number")
     WHERE status NOT IN ('COMPLETED', 'SKIPPED')`,
  ],
  '20260101000007-create-inpatient-and-nursing.js': [
    // A bed can hold at most one live admission.
    `CREATE UNIQUE INDEX IF NOT EXISTS "admissions_unique_active_bed"
       ON "admissions" ("bed_id")
     WHERE status IN ('ADMITTED', 'TRANSFERRED') AND "bed_id" IS NOT NULL`,
    // ... and a patient can only be admitted once at a time.
    `CREATE UNIQUE INDEX IF NOT EXISTS "admissions_unique_active_patient"
       ON "admissions" ("patient_id")
     WHERE status IN ('ADMITTED', 'TRANSFERRED')`,
  ],
  '20260101000009-create-billing-and-insurance.js': [
    // A charge may only be invoiced once.
    `CREATE UNIQUE INDEX IF NOT EXISTS "invoice_items_unique_reference"
       ON "invoice_items" ("reference_type", "reference_id")
     WHERE "reference_type" IS NOT NULL AND "reference_id" IS NOT NULL AND NOT is_billed`,
    // Insurance payment records are created by the claim workflow.
    `CREATE UNIQUE INDEX IF NOT EXISTS "payments_unique_invoice_reference"
       ON "payments" ("reference")
     WHERE "reference" IS NOT NULL`,
  ],
};

const GROUPS = [
  { file: '20260101000001-create-access-control.js', title: 'Access control, users and departments', tables: ['Role', 'Permission', 'RolePermission', 'Department', 'User', 'RefreshToken', 'PasswordReset'] },
  { file: '20260101000002-create-patients-and-staff.js', title: 'Patients and clinical staff profiles', tables: ['Patient', 'Doctor', 'Nurse', 'Staff', 'DepartmentStaff'] },
  { file: '20260101000003-create-appointments-and-queue.js', title: 'Appointment slots, appointments and the waiting-room queue', tables: ['AppointmentSlot', 'Appointment', 'QueueEntry'] },
  { file: '20260101000004-create-clinical-records.js', title: 'Consultations and the electronic medical record', tables: ['Consultation', 'MedicalRecord', 'VitalSign', 'Diagnosis', 'MedicalCondition', 'Allergy', 'MedicalHistory'] },
  { file: '20260101000005-create-laboratory-and-imaging.js', title: 'Laboratory catalogue, orders, results and imaging', tables: ['LaboratoryTest', 'LaboratoryOrder', 'LaboratoryOrderItem', 'LaboratoryResult', 'ImagingOrder'] },
  { file: '20260101000006-create-pharmacy.js', title: 'Medications, stock, prescriptions and dispensing', tables: ['Supplier', 'Medication', 'PharmacyInventory', 'InventoryTransaction', 'Prescription', 'PrescriptionItem'] },
  { file: '20260101000007-create-inpatient-and-nursing.js', title: 'Wards, rooms, beds, admissions and nursing records', tables: ['Ward', 'Room', 'Bed', 'Admission', 'NursingNote', 'MedicationAdministration'] },
  { file: '20260101000008-create-emergency.js', title: 'Emergency department and triage', tables: ['EmergencyCase'] },
  { file: '20260101000009-create-billing-and-insurance.js', title: 'Invoices, payments and insurance', tables: ['Invoice', 'InvoiceItem', 'Payment', 'InsuranceProvider', 'InsurancePolicy', 'InsuranceClaim'] },
  { file: '20260101000010-create-notifications-and-messaging.js', title: 'Notifications, messaging and documents', tables: ['Notification', 'Conversation', 'ConversationParticipant', 'Message', 'Document'] },
  { file: '20260101000011-create-audit-logs.js', title: 'Audit trail', tables: ['AuditLog'] },
];

/**
 * Foreign keys can only be attached once the referenced table exists. Any
 * constraint that points at a table created by a later migration is emitted
 * into one final file instead, so migration order never blocks a `up` run.
 */
const DEFERRED_FILE = '20260101000012-add-deferred-foreign-keys.js';

/* ------------------------------ helpers ------------------------------ */

const modelNameToTable = {};
for (const model of Object.values(models)) {
  // Sequelize model classes are functions; helpers such as `Op` are plain objects.
  if (!model || !['function', 'object'].includes(typeof model) || !model.tableName) continue;
  modelNameToTable[model.name] = model.tableName;
}

const knownTableNames = new Set(Object.values(modelNameToTable));

/**
 * Resolves a `references.model` to a table name. The reference may be a model
 * name ("Patient"), an explicit table name ("patients") or a model class.
 */
const refTable = (ref) => {
  if (!ref) return null;
  const model = ref.model;
  if (typeof model === 'string') {
    if (modelNameToTable[model]) return modelNameToTable[model];
    return knownTableNames.has(model) ? model : null;
  }
  return model?.tableName || null;
};

const jsLiteral = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map((v) => jsLiteral(v)).join(', ')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    return `{ ${entries.map(([k, v]) => `${k}: ${jsLiteral(v)}`).join(', ')} }`;
  }
  return JSON.stringify(value);
};

const renderType = (dataType) => {
  switch (dataType.key) {
    case 'STRING':
      return `Sequelize.STRING(${dataType._length || 255})`;
    case 'TEXT':
      return 'Sequelize.TEXT';
    case 'INTEGER':
      return 'Sequelize.INTEGER';
    case 'BIGINT':
      return 'Sequelize.BIGINT';
    case 'BOOLEAN':
      return 'Sequelize.BOOLEAN';
    case 'DATE':
      return 'Sequelize.DATE';
    case 'DATEONLY':
      return 'Sequelize.DATEONLY';
    case 'JSON':
    case 'JSONB':
      return 'Sequelize.JSONB';
    case 'DECIMAL':
    case 'NUMERIC':
      return `Sequelize.DECIMAL(${dataType._precision || 12}, ${dataType._scale || 2})`;
    case 'ENUM':
      return `Sequelize.ENUM(${dataType.values.map((v) => JSON.stringify(v)).join(', ')})`;
    default:
      return `Sequelize.${String(dataType.key).toUpperCase()}`;
  }
};

/** Column name for an attribute (models use `underscored: true`). */
const columnOf = (attr, attributeName) => attr.field || attributeName;

const renderAttribute = (columnName, attr) => {
  const parts = [`type: ${renderType(attr.type)}`, `allowNull: ${attr.allowNull !== false}`];
  if (attr.primaryKey) parts.push('primaryKey: true');
  if (attr.autoIncrement) parts.push('autoIncrement: true');
  if (attr.defaultValue !== undefined) {
    const dv = attr.defaultValue;
    parts.push(`defaultValue: ${dv && dv.key === 'NOW' ? "Sequelize.fn('NOW')" : jsLiteral(dv)}`);
  }
  if (attr.comment) parts.push(`comment: ${JSON.stringify(attr.comment)}`);
  return `        ${columnName}: {\n          ${parts.join(',\n          ')},\n        },`;
};

/** Foreign keys for one or more tables, emitted after every table exists. */
const collectConstraints = (modelsOrModel) => {
  const list = Array.isArray(modelsOrModel) ? modelsOrModel : [modelsOrModel];
  const constraints = [];
  for (const model of list) {
  for (const [attributeName, attr] of Object.entries(model.rawAttributes)) {
    const target = refTable(attr.references);
    if (!target || !attr.references.key) continue;
    const selfRef = target === model.tableName;
    constraints.push({
      table: model.tableName,
      field: columnOf(attr, attributeName),
      targetTable: target,
      targetField: 'id',
      onDelete: attr.references.onDelete || (selfRef ? 'NO ACTION' : 'CASCADE'),
      onUpdate: attr.references.onUpdate,
      name: `${model.tableName}_${columnOf(attr, attributeName)}_fk`,
    });
  }
  }
  return constraints;
};

/** Index list: model-level indexes (snake_cased) plus attribute level uniques. */
const collectIndexes = (model) => {
  const indexes = [];
  const covered = new Set();

  for (const idx of model.options.indexes || []) {
    if (idx.where) continue;
    const fields = idx.fields.map((field) => {
      const attr = model.rawAttributes[field];
      const column = columnOf(attr || {}, field);
      covered.add(column);
      return column;
    });
    indexes.push({
      name: idx.name || `${model.tableName}_${fields.join('_')}${idx.unique ? '_unique' : ''}`,
      fields,
      unique: !!idx.unique,
    });
  }

  for (const [attributeName, attr] of Object.entries(model.rawAttributes)) {
    if (!attr.unique) continue;
    const column = columnOf(attr, attributeName);
    if (covered.has(column)) continue;
    indexes.push({ name: `${model.tableName}_${column}_unique`, fields: [column], unique: true });
  }

  return indexes;
};

/**
 * Orders tables for `dropTable`: a table is always dropped before the tables it
 * references, so a foreign key never blocks a rollback (Kahn's algorithm over
 * the "references" graph, self references ignored).
 */
const sortForDrop = (modelsList) => {
  const tables = modelsList.map((m) => m.tableName);
  const dependents = new Map(tables.map((t) => [t, []]));
  const inDegree = new Map(tables.map((t) => [t, 0]));

  for (const model of modelsList) {
    for (const c of collectConstraints(model)) {
      if (c.targetTable === model.tableName) continue;
      if (!dependents.has(model.tableName) || !inDegree.has(c.targetTable)) continue;
      dependents.get(model.tableName).push(c.targetTable);
      inDegree.set(c.targetTable, inDegree.get(c.targetTable) + 1);
    }
  }

  const ready = tables.filter((t) => inDegree.get(t) === 0);
  const ordered = [];

  while (ready.length) {
    const table = ready.shift();
    ordered.push(table);
    for (const target of dependents.get(table)) {
      inDegree.set(target, inDegree.get(target) - 1);
      if (inDegree.get(target) === 0) ready.push(target);
    }
  }

  // Any table left over sits in a reference cycle; drop it last, it can only
  // reference tables that are already gone.
  return ordered.concat(tables.filter((t) => !ordered.includes(t)));
};

/** Renders an `addConstraint` call body for a single foreign key. */
const renderAddConstraint = (c, indent) => {
  const pad = ' '.repeat(indent);
  const out = [];
  out.push(`${pad}await queryInterface.addConstraint('${c.table}', {`);
  out.push(`${pad}  fields: ['${c.field}'],`);
  out.push(`${pad}  type: 'foreign key',`);
  out.push(`${pad}  name: ${JSON.stringify(c.name)},`);
  out.push(`${pad}  references: { table: '${c.targetTable}', field: '${c.targetField}' },`);
  if (c.onDelete) out.push(`${pad}  onDelete: ${JSON.stringify(c.onDelete)},`);
  if (c.onUpdate) out.push(`${pad}  onUpdate: ${JSON.stringify(c.onUpdate)},`);
  out.push(`${pad}  transaction,`);
  out.push(`${pad}});`);
  return out.join('\n');
};

/** Renders a `removeConstraint` call body for a single foreign key. */
const renderRemoveConstraint = (c, indent) => {
  const pad = ' '.repeat(indent);
  const out = [];
  out.push(`${pad}await queryInterface.removeConstraint('${c.table}', ${JSON.stringify(c.name)}, { transaction });`);
  return out.join('\n');
};

const emitFile = (group, groupModels, deferred) => {
  const lines = [];
  lines.push("'use strict';");
  lines.push('');
  lines.push('/**');
  lines.push(` * ${group.title}`);
  lines.push(' *');
  lines.push(' * Tables are created first and their foreign keys are attached');
  lines.push(' * afterwards, so the creation order never depends on cross references');
  lines.push(' * (for example users <-> patients). Constraints that reference a table');
  lines.push(' * from a later migration are added by the final migration instead.');
  lines.push(' */');
  lines.push('module.exports = {');
  lines.push('  async up(queryInterface, Sequelize) {');
  lines.push('    await queryInterface.sequelize.transaction(async (transaction) => {');

  for (const model of groupModels) {
    const attributes = Object.entries(model.rawAttributes)
      .filter(([, a]) => a && a.type)
      .map(([name, attr]) => renderAttribute(columnOf(attr, name), attr))
      .join('\n');
    lines.push(`      await queryInterface.createTable('${model.tableName}', {`);
    lines.push(attributes);
    lines.push('      }, { transaction });');
  }

  // Foreign keys whose target already exists are attached right away; the rest
  // are handed to the final migration.
  const groupConstraints = collectConstraints(groupModels);
  for (const c of groupConstraints.filter((constraint) => !deferredSet.has(constraint.name))) {
    lines.push(renderAddConstraint(c, 6));
  }

  for (const model of groupModels) {
    for (const idx of collectIndexes(model)) {
      lines.push(`      await queryInterface.addIndex('${model.tableName}', {`);
      lines.push(`        name: ${JSON.stringify(idx.name)},`);
      lines.push(`        fields: ${jsLiteral(idx.fields)},`);
      lines.push(`        unique: ${idx.unique},`);
      lines.push('        transaction,');
      lines.push('      });');
    }
  }

  for (const sql of EXTRA_SQL[group.file] || []) {
    lines.push(`      await queryInterface.sequelize.query(\n        \`${sql}\`,\n        { transaction },\n      );`);
  }

  lines.push('    });');
  lines.push('  },');
  lines.push('');
  lines.push('  async down(queryInterface) {');
  // Dependency aware: referencing tables are dropped before the tables they
  // point at, so a foreign key never blocks a rollback.
  lines.push(`    const tables = ${jsLiteral(sortForDrop(groupModels))};`);
  lines.push('    await queryInterface.sequelize.transaction(async (transaction) => {');
  lines.push('      for (const table of tables) {');
  lines.push('        await queryInterface.dropTable(table, { transaction });');
  lines.push('      }');
  lines.push('      // Postgres keeps enum types after a table is dropped; removing the');
  lines.push('      // leftovers keeps `migrate` / `migrate:undo` repeatable.');
  lines.push('      await dropEnumTypesFor(queryInterface, tables, transaction);');
  lines.push('    });');
  lines.push('  },');
  lines.push('};');
  lines.push('');
  lines.push("const { dropEnumTypesFor } = require('../utils/migrationHelpers');");
  lines.push('');

  fs.writeFileSync(path.join(OUT_DIR, group.file), lines.join('\n'));
};

const emitDeferredFile = (constraints) => {
  const lines = [];
  lines.push("'use strict';");
  lines.push('');
  lines.push('/**');
  lines.push(' * Foreign keys whose referenced table is created by a later migration');
  lines.push(' * (for example `users.patient_id -> patients`). They are attached last so');
  lines.push(' * that every table already exists.');
  lines.push(' */');
  lines.push('module.exports = {');
  lines.push('  async up(queryInterface) {');
  lines.push('    await queryInterface.sequelize.transaction(async (transaction) => {');
  for (const c of constraints) lines.push(renderAddConstraint(c, 6));
  lines.push('    });');
  lines.push('  },');
  lines.push('');
  lines.push('  async down(queryInterface) {');
  lines.push('    await queryInterface.sequelize.transaction(async (transaction) => {');
  for (const c of [...constraints].reverse()) lines.push(renderRemoveConstraint(c, 6));
  lines.push('    });');
  lines.push('  },');
  lines.push('};');
  lines.push('');
  fs.writeFileSync(path.join(OUT_DIR, DEFERRED_FILE), lines.join('\n'));
};

/* ------------------------------ generate ------------------------------ */

fs.mkdirSync(OUT_DIR, { recursive: true });
const existing = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.js'));
if (existing.length) {
  console.error(`Refusing to overwrite existing migrations: ${existing.join(', ')}`);
  process.exit(1);
}

const deferred = { constraints: [] };
let deferredSet = new Set();
const availableTables = new Set();

for (const group of GROUPS) {
  const groupModels = group.tables.map((name) => models[name]);
  const groupTables = new Set(groupModels.map((m) => m.tableName));
  // Everything created by this migration and every earlier one may be referenced.
  const visible = new Set([...availableTables, ...groupTables]);

  const forwardRefs = collectConstraints(groupModels).filter((c) => !visible.has(c.targetTable));
  const deferredNames = new Set(forwardRefs.map((c) => c.name));

  // Deferred constraints are filtered out again inside emitFile.
  deferredSet = deferredNames;
  emitFile(group, groupModels, deferred);
  deferred.constraints.push(...forwardRefs);

  groupTables.forEach((t) => availableTables.add(t));

  console.log(`wrote ${group.file} (${groupModels.length} tables, ${forwardRefs.length} deferred constraint(s))`);
}

void deferredSet;
emitDeferredFile(deferred.constraints);
console.log(`wrote ${DEFERRED_FILE} (${deferred.constraints.length} constraints)`);