const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Radiology / imaging request and report. */
const ImagingOrder = sequelize.define(
  'ImagingOrder',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
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
      onDelete: 'SET NULL',
    },
    orderedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    imagingType: {
      type: DataTypes.STRING(80),
      allowNull: false,
      comment: 'X-RAY, CT, MRI, ULTRASOUND, ECG, ECHO',
    },
    bodyPart: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('ROUTINE', 'URGENT', 'STAT'),
      allowNull: false,
      defaultValue: 'ROUTINE',
    },
    status: {
      type: DataTypes.ENUM('ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ORDERED',
    },
    clinicalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    findings: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    report: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    isBilled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    performedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    orderedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'imaging_orders',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['orderNumber'] },
      { fields: ['patientId', 'status'] },
    ],
  },
);

module.exports = ImagingOrder;