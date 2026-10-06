const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { LAB_ORDER_STATUS } = require('../config/constants');

/** A doctor's lab request: ORDERED -> SAMPLE_COLLECTED -> PROCESSING -> COMPLETED. */
const LaboratoryOrder = sequelize.define(
  'LaboratoryOrder',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    orderNumber: {
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
    admissionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Admission', key: 'id' },
      onDelete: 'SET NULL',
    },
    orderedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Department', key: 'id' },
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(LAB_ORDER_STATUS)),
      allowNull: false,
      defaultValue: LAB_ORDER_STATUS.ORDERED,
    },
    priority: {
      type: DataTypes.ENUM('ROUTINE', 'URGENT', 'STAT'),
      allowNull: false,
      defaultValue: 'ROUTINE',
    },
    clinicalNotes: {
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
    orderedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    sampleCollectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sampleCollectedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
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
    tableName: 'laboratory_orders',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['orderNumber'] },
      { fields: ['patientId', 'status'] },
      { fields: ['status', 'orderedAt'] },
    ],
  },
);

LaboratoryOrder.STATUSES = LAB_ORDER_STATUS;

module.exports = LaboratoryOrder;