'use strict';

/**
 * Medications, stock, prescriptions and dispensing
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('suppliers', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        contact_person: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        phone: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        email: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        address: {
          type: Sequelize.STRING(255),
          allowNull: true,
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
      await queryInterface.createTable('medications', {
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
        generic_name: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        brand_name: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        form: {
          type: Sequelize.STRING(40),
          allowNull: true,
          comment: "TABLET, CAPSULE, SYRUP, INJECTION, ...",
        },
        strength: {
          type: Sequelize.STRING(40),
          allowNull: true,
        },
        manufacturer: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        unit_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        requires_prescription: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        reorder_level: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 10,
        },
        unit_of_measure: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "unit",
        },
        storage_conditions: {
          type: Sequelize.STRING(120),
          allowNull: true,
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
      await queryInterface.createTable('pharmacy_inventory', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        medication_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        supplier_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        batch_number: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        expiry_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        unit_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        reorder_level: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 10,
        },
        shelf_location: {
          type: Sequelize.STRING(60),
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        last_restocked_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        updated_by: {
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
      await queryInterface.createTable('inventory_transactions', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        pharmacy_inventory_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        medication_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        transaction_type: {
          type: Sequelize.ENUM("PURCHASE", "DISPENSE", "RETURN", "ADJUSTMENT", "EXPIRED"),
          allowNull: false,
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: "Signed: +in / -out",
        },
        balance_after: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        unit_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        total_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        batch_number: {
          type: Sequelize.STRING(60),
          allowNull: true,
        },
        reference_type: {
          type: Sequelize.STRING(40),
          allowNull: true,
          comment: "PRESCRIPTION, PURCHASE, ADJUSTMENT",
        },
        reference_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        supplier_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        performed_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        notes: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        performed_at: {
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
      await queryInterface.createTable('prescriptions', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        prescription_number: {
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
        prescribed_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        prescribed_by_user: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("DRAFT", "PENDING_VERIFICATION", "VERIFIED", "PARTIALLY_DISPENSED", "DISPENSED", "CANCELLED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        pharmacy_notes: {
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
        verified_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        verified_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        dispensed_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        dispensed_at: {
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
      await queryInterface.createTable('prescription_items', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        prescription_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        medication_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        dosage: {
          type: Sequelize.STRING(80),
          allowNull: false,
          comment: "e.g. \"500mg\"",
        },
        frequency: {
          type: Sequelize.STRING(80),
          allowNull: false,
          comment: "e.g. \"Every 8 hours\"",
        },
        duration: {
          type: Sequelize.STRING(80),
          allowNull: true,
          comment: "e.g. \"5 days\"",
        },
        route: {
          type: Sequelize.STRING(40),
          allowNull: true,
          comment: "ORAL, IV, IM, TOPICAL",
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        dispensed_quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        instructions: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        unit_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        total_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        is_dispensed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
      await queryInterface.addConstraint('pharmacy_inventory', {
        fields: ['medication_id'],
        type: 'foreign key',
        name: "pharmacy_inventory_medication_id_fk",
        references: { table: 'medications', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('pharmacy_inventory', {
        fields: ['supplier_id'],
        type: 'foreign key',
        name: "pharmacy_inventory_supplier_id_fk",
        references: { table: 'suppliers', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('pharmacy_inventory', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "pharmacy_inventory_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('pharmacy_inventory', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "pharmacy_inventory_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('inventory_transactions', {
        fields: ['pharmacy_inventory_id'],
        type: 'foreign key',
        name: "inventory_transactions_pharmacy_inventory_id_fk",
        references: { table: 'pharmacy_inventory', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('inventory_transactions', {
        fields: ['medication_id'],
        type: 'foreign key',
        name: "inventory_transactions_medication_id_fk",
        references: { table: 'medications', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('inventory_transactions', {
        fields: ['supplier_id'],
        type: 'foreign key',
        name: "inventory_transactions_supplier_id_fk",
        references: { table: 'suppliers', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('inventory_transactions', {
        fields: ['performed_by'],
        type: 'foreign key',
        name: "inventory_transactions_performed_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('prescriptions', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "prescriptions_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('prescriptions', {
        fields: ['consultation_id'],
        type: 'foreign key',
        name: "prescriptions_consultation_id_fk",
        references: { table: 'consultations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('prescriptions', {
        fields: ['prescribed_by'],
        type: 'foreign key',
        name: "prescriptions_prescribed_by_fk",
        references: { table: 'doctors', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('prescriptions', {
        fields: ['prescribed_by_user'],
        type: 'foreign key',
        name: "prescriptions_prescribed_by_user_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('prescriptions', {
        fields: ['verified_by'],
        type: 'foreign key',
        name: "prescriptions_verified_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('prescriptions', {
        fields: ['dispensed_by'],
        type: 'foreign key',
        name: "prescriptions_dispensed_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('prescription_items', {
        fields: ['prescription_id'],
        type: 'foreign key',
        name: "prescription_items_prescription_id_fk",
        references: { table: 'prescriptions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('prescription_items', {
        fields: ['medication_id'],
        type: 'foreign key',
        name: "prescription_items_medication_id_fk",
        references: { table: 'medications', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('suppliers', {
        name: "suppliers_name",
        fields: ["name"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('medications', {
        name: "medications_code",
        fields: ["code"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('medications', {
        name: "medications_name",
        fields: ["name"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medications', {
        name: "medications_generic_name",
        fields: ["generic_name"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('pharmacy_inventory', {
        name: "pharmacy_inventory_medication_id_batch_number",
        fields: ["medication_id", "batch_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('pharmacy_inventory', {
        name: "pharmacy_inventory_expiry_date",
        fields: ["expiry_date"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('pharmacy_inventory', {
        name: "pharmacy_inventory_quantity",
        fields: ["quantity"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('inventory_transactions', {
        name: "inventory_transactions_pharmacy_inventory_id",
        fields: ["pharmacy_inventory_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('inventory_transactions', {
        name: "inventory_transactions_medication_id",
        fields: ["medication_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('inventory_transactions', {
        name: "inventory_transactions_transaction_type",
        fields: ["transaction_type"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('inventory_transactions', {
        name: "inventory_transactions_reference_type_reference_id",
        fields: ["reference_type", "reference_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('prescriptions', {
        name: "prescriptions_prescription_number",
        fields: ["prescription_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('prescriptions', {
        name: "prescriptions_patient_id_status",
        fields: ["patient_id", "status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('prescriptions', {
        name: "prescriptions_status",
        fields: ["status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('prescription_items', {
        name: "prescription_items_prescription_id",
        fields: ["prescription_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('prescription_items', {
        name: "prescription_items_medication_id",
        fields: ["medication_id"],
        unique: false,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const tables = ["inventory_transactions", "prescription_items", "pharmacy_inventory", "prescriptions", "medications", "suppliers"];
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
