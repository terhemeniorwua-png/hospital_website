'use strict';

/**
 * Invoices, payments and insurance
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('invoices', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        invoice_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        admission_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        appointment_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("DRAFT", "PENDING", "PARTIALLY_PAID", "PAID", "CANCELLED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        currency: {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: "NGN",
        },
        subtotal: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        tax_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        discount_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        insurance_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        total_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        amount_paid: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        balance: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        issued_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        due_date: {
          type: Sequelize.DATEONLY,
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
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        updated_by: {
          type: Sequelize.INTEGER,
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
      await queryInterface.createTable('invoice_items', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        invoice_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        item_type: {
          type: Sequelize.ENUM("CONSULTATION", "LABORATORY", "IMAGING", "MEDICATION", "ADMISSION", "NURSING", "PROCEDURE", "OTHER"),
          allowNull: false,
          defaultValue: "OTHER",
        },
        description: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        reference_type: {
          type: Sequelize.STRING(40),
          allowNull: true,
        },
        reference_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        unit_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        discount_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        tax_rate: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
        },
        tax_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        subtotal: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        total: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        is_billed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        metadata: {
          type: Sequelize.JSONB,
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
      await queryInterface.createTable('payments', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        payment_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        invoice_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
        },
        method: {
          type: Sequelize.ENUM("CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "INSURANCE", "WAIVER"),
          allowNull: false,
          defaultValue: "CASH",
        },
        status: {
          type: Sequelize.ENUM("PENDING", "SUCCESSFUL", "FAILED", "REFUNDED"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        reference: {
          type: Sequelize.STRING(120),
          allowNull: true,
          comment: "Receipt / teller reference",
        },
        received_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        notes: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        paid_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        refunded_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        refund_reason: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        updated_by: {
          type: Sequelize.INTEGER,
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
      await queryInterface.createTable('insurance_providers', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(30),
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
      await queryInterface.createTable('insurance_policies', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        provider_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        policy_number: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        plan_name: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        coverage_amount: {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0,
        },
        coverage_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
        },
        premium_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        start_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        end_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("ACTIVE", "EXPIRED", "SUSPENDED", "CANCELLED"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        is_primary: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        notes: {
          type: Sequelize.TEXT,
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
      await queryInterface.createTable('insurance_claims', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        claim_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        invoice_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        policy_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        claim_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        approved_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        rejected_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        patient_contribution: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "PAID", "CANCELLED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        diagnosis_summary: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        supporting_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        rejection_reason: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        submitted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        reviewed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        reviewed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        paid_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        updated_by: {
          type: Sequelize.INTEGER,
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
      await queryInterface.addConstraint('invoices', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "invoices_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('invoices', {
        fields: ['admission_id'],
        type: 'foreign key',
        name: "invoices_admission_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('invoices', {
        fields: ['appointment_id'],
        type: 'foreign key',
        name: "invoices_appointment_id_fk",
        references: { table: 'appointments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('invoices', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "invoices_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('invoices', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "invoices_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('invoice_items', {
        fields: ['invoice_id'],
        type: 'foreign key',
        name: "invoice_items_invoice_id_fk",
        references: { table: 'invoices', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('payments', {
        fields: ['invoice_id'],
        type: 'foreign key',
        name: "payments_invoice_id_fk",
        references: { table: 'invoices', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('payments', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "payments_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('payments', {
        fields: ['received_by'],
        type: 'foreign key',
        name: "payments_received_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('payments', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "payments_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('payments', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "payments_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('insurance_policies', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "insurance_policies_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('insurance_policies', {
        fields: ['provider_id'],
        type: 'foreign key',
        name: "insurance_policies_provider_id_fk",
        references: { table: 'insurance_providers', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('insurance_claims', {
        fields: ['invoice_id'],
        type: 'foreign key',
        name: "insurance_claims_invoice_id_fk",
        references: { table: 'invoices', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('insurance_claims', {
        fields: ['policy_id'],
        type: 'foreign key',
        name: "insurance_claims_policy_id_fk",
        references: { table: 'insurance_policies', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('insurance_claims', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "insurance_claims_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('insurance_claims', {
        fields: ['reviewed_by'],
        type: 'foreign key',
        name: "insurance_claims_reviewed_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('insurance_claims', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "insurance_claims_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('insurance_claims', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "insurance_claims_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('invoices', {
        name: "invoices_invoice_number",
        fields: ["invoice_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('invoices', {
        name: "invoices_patient_id_status",
        fields: ["patient_id", "status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('invoices', {
        name: "invoices_status_created_at",
        fields: ["status", "created_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('invoice_items', {
        name: "invoice_items_invoice_id",
        fields: ["invoice_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('invoice_items', {
        name: "invoice_items_reference_type_reference_id",
        fields: ["reference_type", "reference_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('invoice_items', {
        name: "invoice_items_item_type",
        fields: ["item_type"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('payments', {
        name: "payments_payment_number",
        fields: ["payment_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('payments', {
        name: "payments_invoice_id",
        fields: ["invoice_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('payments', {
        name: "payments_patient_id_status",
        fields: ["patient_id", "status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('insurance_providers', {
        name: "insurance_providers_name",
        fields: ["name"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('insurance_providers', {
        name: "insurance_providers_code",
        fields: ["code"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('insurance_policies', {
        name: "insurance_policies_policy_number",
        fields: ["policy_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('insurance_policies', {
        name: "insurance_policies_patient_id_status",
        fields: ["patient_id", "status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('insurance_claims', {
        name: "insurance_claims_claim_number",
        fields: ["claim_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('insurance_claims', {
        name: "insurance_claims_invoice_id",
        fields: ["invoice_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('insurance_claims', {
        name: "insurance_claims_status",
        fields: ["status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('insurance_claims', {
        name: "insurance_claims_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "invoice_items_unique_reference"
       ON "invoice_items" ("reference_type", "reference_id")
     WHERE "reference_type" IS NOT NULL AND "reference_id" IS NOT NULL AND NOT is_billed`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "payments_unique_invoice_reference"
       ON "payments" ("reference")
     WHERE "reference" IS NOT NULL`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const tables = ["invoice_items", "payments", "insurance_claims", "invoices", "insurance_policies", "insurance_providers"];
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
