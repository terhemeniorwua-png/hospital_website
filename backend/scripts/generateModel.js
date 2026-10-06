/**
 * Scaffolds a new Sequelize model plus its association stubs.
 *
 *   node scripts/generateModel.js Ward
 *   node scripts/generateModel.js PatientRecord PatientRecord belongsTo Patient
 *
 * This is a developer convenience only: the model file is yours to edit
 * afterwards, and the migration is still created by
 * `node scripts/generateMigrations.js` (which refuses to overwrite files, so
 * remove the previous output first when you change the schema).
 */
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.resolve(__dirname, '..', 'src', 'models');
const INDEX_FILE = path.join(MODELS_DIR, 'index.js');

/** `PatientRecord` -> `patientRecord`, matching the existing file naming. */
const camelCase = (name) => {
  const pascal = name.charAt(0).toUpperCase() + name.slice(1);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

/** `PatientRecord` -> `patient_records`. */
const snakeCase = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

/** `PatientRecord` -> `patient-record.model.js`, matching e.g. `queueEntry`. */
const fileNameFor = (name) =>
  `${name.charAt(0).toLowerCase()}${name.slice(1).replace(/([a-z0-9])([A-Z])/g, '$1$2')}.model.js`;

const ASSOCIATIONS = {
  belongsTo: (model, key) => `${key}.belongsTo(${model});`,
  hasMany: (model, key) => `${key}.hasMany(${model}, { as: '${camelCase(model)}s', foreignKey: '${camelCase(model)}Id' });`,
  hasOne: (model, key) => `${key}.hasOne(${model}, { as: '${camelCase(model)}', foreignKey: '${camelCase(model)}Id' });`,
};

function renderModel(modelName, tableName) {
  return `'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ${modelName} = sequelize.define(
  '${modelName}',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // TODO: replace with the real columns.
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { notEmpty: true },
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: '${tableName}',
    freezeTableName: true,
    timestamps: true,
    indexes: [],
  },
);

module.exports = ${modelName};
`;
}

function renderAssociation(modelName, verb, target) {
  const render = ASSOCIATIONS[verb];
  if (!render) return null;
  return `// TODO: confirm the foreign key column exists on ${snakeCase(modelName)}.\n${render(target, modelName)}`;
}

function registerInIndex(modelName, lines) {
  const index = fs.readFileSync(INDEX_FILE, 'utf8');

  if (index.includes(`require('./${fileNameFor(modelName)}')`)) {
    console.log(`${modelName} is already registered in src/models/index.js`);
    return;
  }

  let updated = index.replace(
    /^const (\w+) = require\('\.\/\w+\.model'\);$/m,
    (line) => `${line}\nconst ${modelName} = require('./${fileNameFor(modelName)}');`,
  );

  updated = updated.replace(
    /^module\.exports = \{$/m,
    (line) => `// ${lines.join('\n\n')}\n\n${line}`,
  );

  updated = updated.replace(
    /(\nmodule\.exports = \{[\s\S]*?)(\n\};)/,
    (match, body, tail) => `${body}\n  ${modelName},${tail}`,
  );

  fs.writeFileSync(INDEX_FILE, updated);
  console.log(`Registered ${modelName} in src/models/index.js`);
}

function main() {
  const [modelName, verb, target] = process.argv.slice(2);

  if (!modelName || !/^[A-Z][A-Za-z0-9]*$/.test(modelName)) {
    console.error('Usage: node scripts/generateModel.js <ModelName> [belongsTo|hasMany|hasOne] [TargetModel]');
    process.exit(1);
  }
  if (verb && !ASSOCIATIONS[verb]) {
    console.error(`Unknown association "${verb}". Use belongsTo, hasMany or hasOne.`);
    process.exit(1);
  }

  const filePath = path.join(MODELS_DIR, fileNameFor(modelName));
  if (fs.existsSync(filePath)) {
    console.error(`${filePath} already exists; edit it directly instead.`);
    process.exit(1);
  }

  const tableName = snakeCase(modelName);
  fs.writeFileSync(filePath, renderModel(modelName, tableName));
  console.log(`Wrote ${path.relative(process.cwd(), filePath)} (table "${tableName}")`);

  const association = verb ? renderAssociation(modelName, verb, target) : null;
  if (!association) {
    console.log('\nNext steps:');
    console.log(`  1. Fill in the columns in src/models/${fileNameFor(modelName)}`);
    console.log('  2. Add the associations to src/models/index.js');
    console.log('  3. node scripts/generateMigrations.js   (after clearing src/migrations)');
    return;
  }

  registerInIndex(modelName, [association]);

  console.log('\nNext steps:');
  console.log(`  1. Fill in the columns in src/models/${fileNameFor(modelName)}`);
  console.log('  2. node scripts/generateMigrations.js   (after clearing src/migrations)');
}

main();