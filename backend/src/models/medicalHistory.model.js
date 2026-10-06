const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Past medical / surgical / obstetric / family history entries. */
const MedicalHistory = sequelize.define(
  'MedicalHistory',
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
    category: {
      type: DataTypes.ENUM('MEDICAL', 'SURGICAL', 'OBSTETRIC', 'FAMILY', 'SOCIAL', 'SHORTNESS'),
      allowNull: false,
      defaultValue: 'MEDICAL',
    },
    condition: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    onsetDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    resolutionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    isOngoing: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'medical_history',
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ['patientId', 'category'] }],
  },
);

module.exports = MedicalHistory;