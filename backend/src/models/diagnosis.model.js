const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** A coded diagnosis attached to a consultation (ICD-10 aligned). */
const Diagnosis = sequelize.define(
  'Diagnosis',
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
      onDelete: 'CASCADE',
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'ICD-10 code',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('PRIMARY', 'SECONDARY', 'PROVISIONAL', 'FINAL', 'Differential'),
      allowNull: false,
      defaultValue: 'PRIMARY',
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'RESOLVED', 'CHRONIC', 'RULED_OUT'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    diagnosedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    diagnosedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'diagnoses',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['patientId'] },
      { fields: ['consultationId'] },
      { fields: ['code'] },
    ],
  },
);

module.exports = Diagnosis;