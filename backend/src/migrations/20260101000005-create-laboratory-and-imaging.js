'use strict';

/**
 * Laboratory catalogue, orders, results and imaging
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('laboratory_tests', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        code: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        category: {
          type: Sequelize.STRING(60),
          allowNull: false,
          defaultValue: "GENERAL",
        },
        specimen: {
          type: Sequelize.STRING(60),
          allowNull: true,
          comment: "BLOOD, URINE, SPUTUM, ...",
        },
        method: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        unit: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        reference_range_min: {
          type: Sequelize.DECIMAL(12, 4),
          allowNull: true,
        },
        reference_range_max: {
          type: Sequelize.DECIMAL(12, 4),
          allowNull: true,
        },
        reference_range_text: {
          type: Sequelize.STRING(150),
          allowNull: true,
          comment: "Used for qualitative tests such as \"Negative\"",
        },
        critical_low: {
          type: Sequelize.DECIMAL(12, 4),
          allowNull: true,
        },
        critical_high: {
          type: Sequelize.DECIMAL(12, 4),
          allowNull: true,
        },
        price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        turnaround_hours: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        requires_fasting: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      await queryInterface.createTable('laboratory_orders', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        order_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        consultation_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        admission_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        ordered_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED", "CANCELLED"),
          allowNull: false,
          defaultValue: "ORDERED",
        },
        priority: {
          type: Sequelize.ENUM("ROUTINE", "URGENT", "STAT"),
          allowNull: false,
          defaultValue: "ROUTINE",
        },
        clinical_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        total_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        is_billed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ordered_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        sample_collected_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        sample_collected_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        cancelled_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        cancel_reason: {
          type: Sequelize.STRING(255),
          allowNull: true,
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
      await queryInterface.createTable('laboratory_order_items', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        order_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        laboratory_test_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        test_code: {
          type: Sequelize.STRING(30),
          allowNull: true,
          comment: "Denormalised for reports",
        },
        test_name: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        status: {
          type: Sequelize.ENUM("PENDING", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED", "CANCELLED"),
          allowNull: false,
          defaultValue: "PENDING",
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
      await queryInterface.createTable('laboratory_results', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        order_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        order_item_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        laboratory_test_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        result_value: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        numeric_value: {
          type: Sequelize.DECIMAL(14, 4),
          allowNull: true,
          comment: "Populated for quantitative results so ranges can be evaluated",
        },
        unit: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        reference_range: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        flag: {
          type: Sequelize.ENUM("NORMAL", "LOW", "HIGH", "CRITICAL_LOW", "CRITICAL_HIGH"),
          allowNull: false,
          defaultValue: "NORMAL",
        },
        technician_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        performed_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        performed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        is_published: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        published_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        published_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        verified_by: {
          type: Sequelize.UUID,
          allowNull: true,
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
      await queryInterface.createTable('imaging_orders', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        order_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        consultation_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        admission_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        ordered_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        imaging_type: {
          type: Sequelize.STRING(80),
          allowNull: false,
          comment: "X-RAY, CT, MRI, ULTRASOUND, ECG, ECHO",
        },
        body_part: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        priority: {
          type: Sequelize.ENUM("ROUTINE", "URGENT", "STAT"),
          allowNull: false,
          defaultValue: "ROUTINE",
        },
        status: {
          type: Sequelize.ENUM("ORDERED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"),
          allowNull: false,
          defaultValue: "ORDERED",
        },
        clinical_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        findings: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        report: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        is_billed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        performed_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        ordered_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        performed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        is_published: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        published_at: {
          type: Sequelize.DATE,
          allowNull: true,
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
      await queryInterface.addConstraint('laboratory_orders', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "laboratory_orders_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_orders', {
        fields: ['consultation_id'],
        type: 'foreign key',
        name: "laboratory_orders_consultation_id_fk",
        references: { table: 'consultations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_orders', {
        fields: ['ordered_by'],
        type: 'foreign key',
        name: "laboratory_orders_ordered_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_orders', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "laboratory_orders_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_orders', {
        fields: ['sample_collected_by'],
        type: 'foreign key',
        name: "laboratory_orders_sample_collected_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_order_items', {
        fields: ['order_id'],
        type: 'foreign key',
        name: "laboratory_order_items_order_id_fk",
        references: { table: 'laboratory_orders', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_order_items', {
        fields: ['laboratory_test_id'],
        type: 'foreign key',
        name: "laboratory_order_items_laboratory_test_id_fk",
        references: { table: 'laboratory_tests', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_results', {
        fields: ['order_id'],
        type: 'foreign key',
        name: "laboratory_results_order_id_fk",
        references: { table: 'laboratory_orders', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_results', {
        fields: ['order_item_id'],
        type: 'foreign key',
        name: "laboratory_results_order_item_id_fk",
        references: { table: 'laboratory_order_items', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_results', {
        fields: ['laboratory_test_id'],
        type: 'foreign key',
        name: "laboratory_results_laboratory_test_id_fk",
        references: { table: 'laboratory_tests', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_results', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "laboratory_results_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_results', {
        fields: ['performed_by'],
        type: 'foreign key',
        name: "laboratory_results_performed_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_results', {
        fields: ['published_by'],
        type: 'foreign key',
        name: "laboratory_results_published_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_results', {
        fields: ['verified_by'],
        type: 'foreign key',
        name: "laboratory_results_verified_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('imaging_orders', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "imaging_orders_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('imaging_orders', {
        fields: ['consultation_id'],
        type: 'foreign key',
        name: "imaging_orders_consultation_id_fk",
        references: { table: 'consultations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('imaging_orders', {
        fields: ['ordered_by'],
        type: 'foreign key',
        name: "imaging_orders_ordered_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('imaging_orders', {
        fields: ['performed_by'],
        type: 'foreign key',
        name: "imaging_orders_performed_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('laboratory_tests', {
        name: "laboratory_tests_code",
        fields: ["code"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('laboratory_tests', {
        name: "laboratory_tests_name",
        fields: ["name"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('laboratory_tests', {
        name: "laboratory_tests_category",
        fields: ["category"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('laboratory_orders', {
        name: "laboratory_orders_order_number",
        fields: ["order_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('laboratory_orders', {
        name: "laboratory_orders_patient_id_status",
        fields: ["patient_id", "status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('laboratory_orders', {
        name: "laboratory_orders_status_ordered_at",
        fields: ["status", "ordered_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('laboratory_order_items', {
        name: "laboratory_order_items_order_id",
        fields: ["order_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('laboratory_order_items', {
        name: "laboratory_order_items_laboratory_test_id",
        fields: ["laboratory_test_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('laboratory_results', {
        name: "laboratory_results_order_item_id",
        fields: ["order_item_id"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('laboratory_results', {
        name: "laboratory_results_order_id",
        fields: ["order_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('laboratory_results', {
        name: "laboratory_results_patient_id_is_published",
        fields: ["patient_id", "is_published"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('imaging_orders', {
        name: "imaging_orders_order_number",
        fields: ["order_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('imaging_orders', {
        name: "imaging_orders_patient_id_status",
        fields: ["patient_id", "status"],
        unique: false,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const tables = ["laboratory_results", "imaging_orders", "laboratory_order_items", "laboratory_orders", "laboratory_tests"];
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
