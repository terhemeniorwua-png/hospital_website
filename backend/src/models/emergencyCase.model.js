const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { EMERGENCY_STATUS, TRIAGE_LEVELS } = require('../config/constants');

/**
 * Emergency / triage record. Works for registered patients and walk-ins
 * (`patientId` is nullable and walk-in demographics are captured inline).
 */
const EmergencyCase = sequelize.define(
  'EmergencyCase',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    caseNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'SET NULL',
    },
    isWalkIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    walkInName: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    walkInAge: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    walkInGender: {
      type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'),
      allowNull: true,
    },
    walkInPhone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    chiefComplaint: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    presentingVitals: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    /** 1 = CRITICAL (seen immediately) ... 4 = LOW. */
    triageLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: Math.min(...Object.values(TRIAGE_LEVELS)),
        max: Math.max(...Object.values(TRIAGE_LEVELS)),
      },
    },
    triageCategory: {
      type: DataTypes.ENUM('CRITICAL', 'URGENT', 'MODERATE', 'LOW'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(EMERGENCY_STATUS)),
      allowNull: false,
      defaultValue: EMERGENCY_STATUS.ARRIVED,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    treatmentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Department', key: 'id' },
      onDelete: 'SET NULL',
    },
    assignedDoctorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Doctor', key: 'id' },
      onDelete: 'SET NULL',
    },
    consultationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Consultation', key: 'id' },
      onDelete: 'SET NULL',
    },
    admissionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Admission', key: 'id' },
      onDelete: 'SET NULL',
    },
    registeredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    arrivalAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    triagedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    triagedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    treatmentStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dischargedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    outcome: {
      type: DataTypes.ENUM('STABLE', 'IMPROVED', 'UNCHANGED', 'DECLINED', 'REFERRED_OUT', 'ADMITTED'),
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'emergency_cases',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['caseNumber'] },
      { fields: ['status', 'arrivalAt'] },
      { fields: ['patientId'] },
    ],
  },
);

EmergencyCase.STATUSES = EMERGENCY_STATUS;

module.exports = EmergencyCase;