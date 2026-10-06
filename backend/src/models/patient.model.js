const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { PATIENT_STATUS, GENDERS, BLOOD_GROUPS } = require('../config/constants');
const { calculateAge } = require('../utils/dates');

/** Core patient demographics record. */
const Patient = sequelize.define(
  'Patient',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    /** Auto generated, e.g. HOSP-2026-000001 */
    hospitalNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    firstName: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: { notEmpty: true },
    },
    lastName: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    middleName: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM(...GENDERS),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: { isEmail: true },
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    emergencyContactName: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    emergencyContactPhone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    emergencyContactRelationship: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    bloodGroup: {
      type: DataTypes.ENUM(...BLOOD_GROUPS),
      allowNull: true,
    },
    genotype: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    maritalStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    occupation: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    /** Denormalised emergency summary shown on the patient banner. */
    allergySummary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PATIENT_STATUS)),
      allowNull: false,
      defaultValue: PATIENT_STATUS.ACTIVE,
    },
    registeredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'patients',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['hospitalNumber'] },
      { fields: ['lastName', 'firstName'] },
      { fields: ['phone'] },
      { fields: ['email'] },
      { fields: ['status'] },
    ],
  },
);

Patient.prototype.getFullName = function getFullName() {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
};

/** Age in whole years from `dateOfBirth`. */
Patient.prototype.getAge = function getAge() {
  return calculateAge(this.dateOfBirth);
};

module.exports = Patient;