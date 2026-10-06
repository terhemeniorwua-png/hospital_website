const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { ADMISSION_STATUS } = require('../config/constants');

/**
 * Inpatient admission. A bed may hold at most one *live* admission - enforced
 * by the partial unique index `admissions_unique_active_bed` created in the
 * migrations plus the row lock taken in `admissionService.admitPatient`.
 */
const Admission = sequelize.define(
  'Admission',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    admissionNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    wardId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Ward', key: 'id' },
      onDelete: 'RESTRICT',
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Room', key: 'id' },
      onDelete: 'SET NULL',
    },
    bedId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Bed', key: 'id' },
      onDelete: 'SET NULL',
    },
    admittedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    attendingDoctorId: {
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
    emergencyCaseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'EmergencyCase', key: 'id' },
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ADMISSION_STATUS)),
      allowNull: false,
      defaultValue: ADMISSION_STATUS.ADMITTED,
    },
    admittedFrom: {
      type: DataTypes.ENUM('OPD', 'EMERGENCY', 'TRANSFER', 'REFERRAL', 'ELECTIVE'),
      allowNull: false,
      defaultValue: 'OPD',
    },
    reasonForAdmission: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    conditionOnAdmission: {
      type: DataTypes.ENUM('STABLE', 'CRITICAL', 'SERIOUS', 'EMERGENCY'),
      allowNull: false,
      defaultValue: 'STABLE',
    },
    dailyRate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    admittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expectedDischargeAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dischargedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dischargedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    dischargeSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dischargeType: {
      type: DataTypes.ENUM('NORMAL', 'ABSCONDED', 'TRANSFERRED_OUT', 'LAMA', 'REFERRED'),
      allowNull: true,
    },
    dischargedTo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    /** Number of nights billed - frozen at discharge time. */
    daysAdmitted: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'admissions',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['admissionNumber'] },
      { fields: ['patientId', 'status'] },
      { fields: ['wardId', 'status'] },
    ],
  },
);

Admission.STATUSES = ADMISSION_STATUS;

module.exports = Admission;