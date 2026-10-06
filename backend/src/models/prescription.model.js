const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { PRESCRIPTION_STATUS } = require('../config/constants');

/**
 * Prescription lifecycle:
 * DRAFT/PENDING_VERIFICATION -> VERIFIED -> (PARTIALLY_)DISPENSED
 */
const Prescription = sequelize.define(
  'Prescription',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    prescriptionNumber: {
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
    consultationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Consultation', key: 'id' },
      onDelete: 'SET NULL',
    },
    prescribedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Doctor', key: 'id' },
      onDelete: 'SET NULL',
    },
    prescribedByUser: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PRESCRIPTION_STATUS)),
      allowNull: false,
      defaultValue: PRESCRIPTION_STATUS.DRAFT,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pharmacyNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    isBilled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dispensedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    dispensedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'prescriptions',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['prescriptionNumber'] },
      { fields: ['patientId', 'status'] },
      { fields: ['status'] },
    ],
  },
);

Prescription.STATUSES = PRESCRIPTION_STATUS;

module.exports = Prescription;