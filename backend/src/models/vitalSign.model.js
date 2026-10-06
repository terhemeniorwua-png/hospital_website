const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Observations: temperature, pulse, BP, SpO2, weight, BMI, pain score. */
const VitalSign = sequelize.define(
  'VitalSign',
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
    consultationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Consultation', key: 'id' },
      onDelete: 'SET NULL',
    },
    admissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Admission', key: 'id' },
      onDelete: 'CASCADE',
    },
    emergencyCaseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'EmergencyCase', key: 'id' },
      onDelete: 'SET NULL',
    },
    temperature: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    pulse: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    respiratoryRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bloodPressureSystolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bloodPressureDiastolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    spo2: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bloodGlucose: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    weight: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    height: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    bmi: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    painScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    recordedAt: {
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
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'vital_signs',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['patientId', 'recordedAt'] },
      { fields: ['admissionId'] },
    ],
  },
);

/** Computes BMI when both height (cm) and weight (kg) are present. */
VitalSign.prototype.calculateBmi = function calculateBmi() {
  const height = Number(this.height);
  const weight = Number(this.weight);
  if (!height || !weight || height <= 0) return null;
  return Math.round(((weight / (height * height)) * 100) * 100) / 100;
};

module.exports = VitalSign;