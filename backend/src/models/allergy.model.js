const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Patient allergy record - surfaced prominently on the clinical banner. */
const Allergy = sequelize.define(
  'Allergy',
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
    allergen: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    reaction: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    severity: {
      type: DataTypes.ENUM('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'),
      allowNull: false,
      defaultValue: 'MILD',
    },
    type: {
      type: DataTypes.ENUM('DRUG', 'FOOD', 'ENVIRONMENT', 'OTHER'),
      allowNull: false,
      defaultValue: 'DRUG',
    },
    diagnosedAt: {
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
    tableName: 'allergies',
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ['patientId'] }, { fields: ['allergen'] }],
  },
);

module.exports = Allergy;