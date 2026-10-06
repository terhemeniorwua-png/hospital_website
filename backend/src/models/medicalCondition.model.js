const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Long standing chronic condition on the patient's problem list. */
const MedicalCondition = sequelize.define(
  'MedicalCondition',
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
    conditionName: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    icdCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'RESOLVED', 'REMISSION', 'CHRONIC', 'DECEASED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    severity: {
      type: DataTypes.ENUM('MILD', 'MODERATE', 'SEVERE'),
      allowNull: true,
    },
    diagnosedAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATEONLY,
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
    tableName: 'medical_conditions',
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ['patientId'] }, { fields: ['conditionName'] }],
  },
);

module.exports = MedicalCondition;