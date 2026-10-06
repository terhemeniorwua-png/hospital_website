const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** One requested test inside a laboratory order. Price is snapshotted. */
const LaboratoryOrderItem = sequelize.define(
  'LaboratoryOrderItem',
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
    laboratoryTestId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'LaboratoryTest', key: 'id' },
      onDelete: 'RESTRICT',
    },
    testCode: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'Denormalised for reports',
    },
    testName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'laboratory_order_items',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['laboratoryTestId'] },
    ],
  },
);

module.exports = LaboratoryOrderItem;