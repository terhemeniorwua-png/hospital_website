const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Longitudinal EMR timeline entry. One row per clinically meaningful event so
 * a patient record can be rendered as a single chronological timeline.
 */
const MedicalRecord = sequelize.define(
  'MedicalRecord',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    recordType: {
      type: DataTypes.ENUM(
        'CONSULTATION',
        'DIAGNOSIS',
        'PRESCRIPTION',
        'LAB_RESULT',
        'IMAGING',
        'ADMISSION',
        'DISCHARGE',
        'VITAL_SIGNS',
        'NURSING_NOTE',
        'DOCUMENT',
        'PROCEDURE',
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    /** Polymorphic pointer to the source row (consultation_id, order_id, ...). */
    referenceType: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    /** Convenience columns used by the timeline UI. */
    consultationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Consultation', key: 'id' },
      onDelete: 'CASCADE',
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
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Clinical-only notes hidden from the patient portal',
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    recordedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'medical_records',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['patientId', 'occurredAt'] },
      { fields: ['recordType'] },
      { fields: ['referenceType', 'referenceId'] },
    ],
  },
);

module.exports = MedicalRecord;