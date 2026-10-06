'use strict';

/**
 * Audit trail
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('audit_logs', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        user_email: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        user_role: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        action: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        resource: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        resource_id: {
          type: Sequelize.STRING(60),
          allowNull: true,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        method: {
          type: Sequelize.STRING(10),
          allowNull: true,
        },
        path: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        ip_address: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        user_agent: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        status_code: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        duration_ms: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
      }, { transaction });
      await queryInterface.addConstraint('audit_logs', {
        fields: ['user_id'],
        type: 'foreign key',
        name: "audit_logs_user_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('audit_logs', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "audit_logs_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('audit_logs', {
        name: "audit_logs_user_id",
        fields: ["user_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('audit_logs', {
        name: "audit_logs_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('audit_logs', {
        name: "audit_logs_action",
        fields: ["action"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('audit_logs', {
        name: "audit_logs_resource_resource_id",
        fields: ["resource", "resource_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('audit_logs', {
        name: "audit_logs_created_at",
        fields: ["created_at"],
        unique: false,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const tables = ["audit_logs"];
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of tables) {
        await queryInterface.dropTable(table, { transaction });
      }
      // Postgres keeps enum types after a table is dropped; removing the
      // leftovers keeps `migrate` / `migrate:undo` repeatable.
      await dropEnumTypesFor(queryInterface, tables, transaction);
    });
  },
};

const { dropEnumTypesFor } = require('../utils/migrationHelpers');
