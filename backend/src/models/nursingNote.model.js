const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Nursing documentation for an inpatient or day patient. */
const NursingNote = sequelize.define(
  'NursingNote',
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
    nurseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    wardId: {
      type: DataTypes.INTEGER,
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