const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Result of a single ordered test. Only published results are visible to the
 * ordering doctor and the patient; drafts stay inside the laboratory.
 */
const LaboratoryResult = sequelize.define(
  'LaboratoryResult',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'LaboratoryOrder', key: 'id' },
      onDelete: 'CASCADE',
    },
    orderItemId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'LaboratoryOrderItem', key: 'id' },
      onDelete: 'CASCADE',
    },
    laboratoryTestId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'LaboratoryTest', key: 'id' },
      onDelete: 'RESTRICT',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    resultValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    numericValue: {
      type: DataTypes.DECIMAL(14, 4),
      allowNull: true,
      comment: 'Populated for quantitative results so ranges can be evaluated',
    },
    unit: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    referenceRange: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    flag: {
      type: DataTypes.ENUM('NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH'),
      allowNull: false,
      defaultValue: 'NORMAL',
    },
    technicianNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    performedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    performedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    publishedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'laboratory_results',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['orderItemId'] },
      { fields: ['orderId'] },
      { fields: ['patientId', 'isPublished'] },
    ],
  },
);

module.exports = LaboratoryResult;