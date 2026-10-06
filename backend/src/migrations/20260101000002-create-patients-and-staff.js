'use strict';

/**
 * Patients and clinical staff profiles
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('patients', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        hospital_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        first_name: {
          type: Sequelize.STRING(80),
          allowNull: false,
        },
        last_name: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        middle_name: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        date_of_birth: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        gender: {
          type: Sequelize.ENUM("MALE", "FEMALE", "OTHER"),
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
        city: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        state: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        emergency_contact_name: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        emergency_contact_phone: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        emergency_contact_relationship: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        blood_group: {
          type: Sequelize.ENUM("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),
          allowNull: true,
        },
        genotype: {
          type: Sequelize.STRING(10),
          allowNull: true,
        },
        marital_status: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        occupation: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        allergy_summary: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("ACTIVE", "INACTIVE", "DECEASED"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        registered_by: {
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
      await queryInterface.createTable('doctors', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        specialization: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        sub_specialization: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        license_number: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        qualification: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        years_of_experience: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        bio: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        consultation_fee: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        availability: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {  },
        },
        slot_duration_minutes: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 30,
        },
        is_accepting_appointments: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        is_on_duty: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      await queryInterface.createTable('nurses', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        qualification: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        registration_number: {
          type: Sequelize.STRING(60),
          allowNull: true,
        },
        specialization: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        shift: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        is_on_duty: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      await queryInterface.createTable('staff', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        staff_type: {
          type: Sequelize.ENUM("ACCOUNTANT", "RECEPTIONIST", "PHARMACIST", "LAB_TECHNICIAN", "RADIOLOGIST", "ADMINISTRATIVE"),
          allowNull: false,
        },
        job_title: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        employee_number: {
          type: Sequelize.STRING(40),
          allowNull: true,
        },
        date_employed: {
          type: Sequelize.DATEONLY,
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
      await queryInterface.createTable('department_staff', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        role_in_department: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        is_primary: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        assigned_by: {
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
      await queryInterface.addConstraint('patients', {
        fields: ['registered_by'],
        type: 'foreign key',
        name: "patients_registered_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('patients', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "patients_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('doctors', {
        fields: ['user_id'],
        type: 'foreign key',
        name: "doctors_user_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('doctors', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "doctors_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('doctors', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "doctors_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('doctors', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "doctors_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('nurses', {
        fields: ['user_id'],
        type: 'foreign key',
        name: "nurses_user_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('nurses', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "nurses_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('nurses', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "nurses_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('nurses', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "nurses_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('staff', {
        fields: ['user_id'],
        type: 'foreign key',
        name: "staff_user_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('staff', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "staff_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('staff', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "staff_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('staff', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "staff_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('department_staff', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "department_staff_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('department_staff', {
        fields: ['user_id'],
        type: 'foreign key',
        name: "department_staff_user_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('department_staff', {
        fields: ['assigned_by'],
        type: 'foreign key',
        name: "department_staff_assigned_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('patients', {
        name: "patients_hospital_number",
        fields: ["hospital_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('patients', {
        name: "patients_last_name_first_name",
        fields: ["last_name", "first_name"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('patients', {
        name: "patients_phone",
        fields: ["phone"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('patients', {
        name: "patients_email",
        fields: ["email"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('patients', {
        name: "patients_status",
        fields: ["status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('doctors', {
        name: "doctors_user_id",
        fields: ["user_id"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('doctors', {
        name: "doctors_license_number",
        fields: ["license_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('doctors', {
        name: "doctors_department_id",
        fields: ["department_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('doctors', {
        name: "doctors_specialization",
        fields: ["specialization"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('nurses', {
        name: "nurses_user_id",
        fields: ["user_id"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('nurses', {
        name: "nurses_department_id",
        fields: ["department_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('nurses', {
        name: "nurses_registration_number_unique",
        fields: ["registration_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('staff', {
        name: "staff_user_id",
        fields: ["user_id"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('staff', {
        name: "staff_department_id",
        fields: ["department_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('staff', {
        name: "staff_staff_type",
        fields: ["staff_type"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('staff', {
        name: "staff_employee_number_unique",
        fields: ["employee_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('department_staff', {
        name: "department_staff_department_id_user_id",
        fields: ["department_id", "user_id"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('department_staff', {
        name: "department_staff_user_id",
        fields: ["user_id"],
        unique: false,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const tables = ["patients", "doctors", "nurses", "staff", "department_staff"];
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
