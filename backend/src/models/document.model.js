const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Metadata for a privately stored upload (lab report, scan, discharge summary).
 * Files live outside the web root; download requires an authorised controller
 * action - there is deliberately no public static mount.
 */
const Document = sequelize.define(
  'Document',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    category: {
      type: DataTypes.ENUM(
        'LAB_REPORT',
        'IMAGING_REPORT',
        'MEDICAL_DOCUMENT',
        'DISCHARGE_SUMMARY',
        'PATIENT_DOCUMENT',
        'INSURANCE',
        'OTHER',
      ),
      allowNull: false,
      defaultValue: 'OTHER',
    },
    title: {
      type: DataTypes.STRING(180),
      allowNull: true,
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    storedName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    storagePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    checksum: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    /** Polymorphic link to the record this document belongs to. */
    referenceType: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'documents',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['patientId'] },
      { fields: ['category'] },
      { fields: ['referenceType', 'referenceId'] },
    ],
  },
);

module.exports = Document;