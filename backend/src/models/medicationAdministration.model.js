const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Charting of a medication actually given to a patient, including the MAR
 * (medication administration record) status.
 */
const MedicationAdministration = sequelize.define(
  'MedicationAdministration',
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
    admissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Admission', key: 'id' },
      onDelete: 'CASCADE',
    },
    prescriptionItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'PrescriptionItem', key: 'id' },
      onDelete: 'SET NULL',
    },
    medicationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Medication', key: 'id' },
      onDelete: 'SET NULL',
    },
    medicationName: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    dose: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    route: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    frequency: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    administeredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('SCHEDULED', 'ADMINISTERED', 'REFUSED', 'HELD', 'OMITTED'),
      allowNull: false,
      defaultValue: 'SCHEDULED',
    },
    nurseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'medication_administrations',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['patientId', 'administeredAt'] },
      { fields: ['admissionId'] },
      { fields: ['status'] },
    ],
  },
);

module.exports = MedicationAdministration;