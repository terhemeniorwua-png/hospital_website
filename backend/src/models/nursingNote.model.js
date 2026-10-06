const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Nursing documentation for an inpatient or day patient. */
const NursingNote = sequelize.define(
  'NursingNote',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    admissionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Admission', key: 'id' },
      onDelete: 'CASCADE',
    },
    nurseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    wardId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Ward', key: 'id' },
      onDelete: 'SET NULL',
    },
    noteType: {
      type: DataTypes.ENUM('ASSESSMENT', 'PROGRESS', 'NURSING_CARE', 'TRANSFER', 'INCIDENT', 'DISCHARGE'),
      allowNull: false,
      defaultValue: 'PROGRESS',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isCritical: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    shift: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'nursing_notes',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['patientId', 'recordedAt'] },
      { fields: ['admissionId'] },
    ],
  },
);

module.exports = NursingNote;