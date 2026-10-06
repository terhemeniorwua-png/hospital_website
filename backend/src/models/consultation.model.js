const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { CONSULTATION_STATUS } = require('../config/constants');

/**
 * Clinical encounter record created by a doctor from an appointment,
 * queue entry, walk-in or admission.
 */
const Consultation = sequelize.define(
  'Consultation',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    consultationNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Doctor', key: 'id' },
      onDelete: 'RESTRICT',
    },
    appointmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Appointment', key: 'id' },
      onDelete: 'SET NULL',
    },
    queueEntryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'QueueEntry', key: 'id' },
      onDelete: 'SET NULL',
    },
    admissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Admission', key: 'id' },
      onDelete: 'SET NULL',
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Department', key: 'id' },
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CONSULTATION_STATUS)),
      allowNull: false,
      defaultValue: CONSULTATION_STATUS.DRAFT,
    },
    chiefComplaint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    history: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'History of present illness / past medical history',
    },
    physicalExamination: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assessment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    diagnosisSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    treatmentPlan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    doctorNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    /** Derived vitals snapshot captured when the consultation started. */
    vitalsSnapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    followUpDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'consultations',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['consultationNumber'] },
      { fields: ['patientId'] },
      { fields: ['doctorId', 'createdAt'] },
      { fields: ['status'] },
    ],
  },
);

Consultation.STATUSES = CONSULTATION_STATUS;

module.exports = Consultation;