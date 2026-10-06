'use strict';

/**
 * Consultations and the electronic medical record
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('consultations', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        consultation_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        doctor_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        appointment_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        queue_entry_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        admission_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("DRAFT", "IN_PROGRESS", "COMPLETED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        chief_complaint: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        symptoms: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        history: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: "History of present illness / past medical history",
        },
        physical_examination: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        assessment: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        diagnosis_summary: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        treatment_plan: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        doctor_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        vitals_snapshot: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        follow_up_date: {
          type: Sequelize.DATEONLY,
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
      await queryInterface.createTable('medical_records', {
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
        record_type: {
          type: Sequelize.ENUM("CONSULTATION", "DIAGNOSIS", "PRESCRIPTION", "LAB_RESULT", "IMAGING", "ADMISSION", "DISCHARGE", "VITAL_SIGNS", "NURSING_NOTE", "DOCUMENT", "PROCEDURE"),
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING(180),
          allowNull: false,
        },
        summary: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        reference_type: {
          type: Sequelize.STRING(40),
          allowNull: true,
        },
        reference_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        consultation_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        admission_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        is_private: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "Clinical-only notes hidden from the patient portal",
        },
        occurred_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        recorded_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
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
      await queryInterface.createTable('vital_signs', {
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
        consultation_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        admission_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        emergency_case_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        temperature: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        pulse: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        respiratory_rate: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        blood_pressure_systolic: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        blood_pressure_diastolic: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        spo2: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        blood_glucose: {
          type: Sequelize.DECIMAL(6, 2),
          allowNull: true,
        },
        weight: {
          type: Sequelize.DECIMAL(6, 2),
          allowNull: true,
        },
        height: {
          type: Sequelize.DECIMAL(6, 2),
          allowNull: true,
        },
        bmi: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        pain_score: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        notes: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        recorded_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        recorded_by: {
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
      await queryInterface.createTable('diagnoses', {
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
        consultation_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        code: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: "ICD-10 code",
        },
        description: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        type: {
          type: Sequelize.ENUM("PRIMARY", "SECONDARY", "PROVISIONAL", "FINAL", "Differential"),
          allowNull: false,
          defaultValue: "PRIMARY",
        },
        status: {
          type: Sequelize.ENUM("ACTIVE", "RESOLVED", "CHRONIC", "RULED_OUT"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        diagnosed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        diagnosed_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        resolved_at: {
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
      await queryInterface.createTable('medical_conditions', {
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
        condition_name: {
          type: Sequelize.STRING(180),
          allowNull: false,
        },
        icd_code: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("ACTIVE", "RESOLVED", "REMISSION", "CHRONIC", "DECEASED"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        severity: {
          type: Sequelize.ENUM("MILD", "MODERATE", "SEVERE"),
          allowNull: true,
        },
        diagnosed_at: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        resolved_at: {
          type: Sequelize.DATEONLY,
          allowNull: true,
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
      await queryInterface.createTable('allergies', {
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
        allergen: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        reaction: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        severity: {
          type: Sequelize.ENUM("MILD", "MODERATE", "SEVERE", "LIFE_THREATENING"),
          allowNull: false,
          defaultValue: "MILD",
        },
        type: {
          type: Sequelize.ENUM("DRUG", "FOOD", "ENVIRONMENT", "OTHER"),
          allowNull: false,
          defaultValue: "DRUG",
        },
        diagnosed_at: {
          type: Sequelize.DATEONLY,
          allowNull: true,
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
      await queryInterface.createTable('medical_history', {
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
        category: {
          type: Sequelize.ENUM("MEDICAL", "SURGICAL", "OBSTETRIC", "FAMILY", "SOCIAL", "SHORTNESS"),
          allowNull: false,
          defaultValue: "MEDICAL",
        },
        condition: {
          type: Sequelize.STRING(180),
          allowNull: false,
        },
        onset_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        resolution_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        is_ongoing: {
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
      await queryInterface.addConstraint('consultations', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "consultations_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('consultations', {
        fields: ['doctor_id'],
        type: 'foreign key',
        name: "consultations_doctor_id_fk",
        references: { table: 'doctors', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('consultations', {
        fields: ['appointment_id'],
        type: 'foreign key',
        name: "consultations_appointment_id_fk",
        references: { table: 'appointments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('consultations', {
        fields: ['queue_entry_id'],
        type: 'foreign key',
        name: "consultations_queue_entry_id_fk",
        references: { table: 'queue_entries', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('consultations', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "consultations_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('consultations', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "consultations_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('consultations', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "consultations_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medical_records', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "medical_records_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medical_records', {
        fields: ['consultation_id'],
        type: 'foreign key',
        name: "medical_records_consultation_id_fk",
        references: { table: 'consultations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medical_records', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "medical_records_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medical_records', {
        fields: ['recorded_by'],
        type: 'foreign key',
        name: "medical_records_recorded_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('vital_signs', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "vital_signs_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('vital_signs', {
        fields: ['consultation_id'],
        type: 'foreign key',
        name: "vital_signs_consultation_id_fk",
        references: { table: 'consultations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('vital_signs', {
        fields: ['recorded_by'],
        type: 'foreign key',
        name: "vital_signs_recorded_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('diagnoses', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "diagnoses_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('diagnoses', {
        fields: ['consultation_id'],
        type: 'foreign key',
        name: "diagnoses_consultation_id_fk",
        references: { table: 'consultations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('diagnoses', {
        fields: ['diagnosed_by'],
        type: 'foreign key',
        name: "diagnoses_diagnosed_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medical_conditions', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "medical_conditions_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('allergies', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "allergies_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medical_history', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "medical_history_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('consultations', {
        name: "consultations_consultation_number",
        fields: ["consultation_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('consultations', {
        name: "consultations_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('consultations', {
        name: "consultations_doctor_id_created_at",
        fields: ["doctor_id", "created_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('consultations', {
        name: "consultations_status",
        fields: ["status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medical_records', {
        name: "medical_records_patient_id_occurred_at",
        fields: ["patient_id", "occurred_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medical_records', {
        name: "medical_records_record_type",
        fields: ["record_type"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medical_records', {
        name: "medical_records_reference_type_reference_id",
        fields: ["reference_type", "reference_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('vital_signs', {
        name: "vital_signs_patient_id_recorded_at",
        fields: ["patient_id", "recorded_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('vital_signs', {
        name: "vital_signs_admission_id",
        fields: ["admission_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('diagnoses', {
        name: "diagnoses_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('diagnoses', {
        name: "diagnoses_consultation_id",
        fields: ["consultation_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('diagnoses', {
        name: "diagnoses_code",
        fields: ["code"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medical_conditions', {
        name: "medical_conditions_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medical_conditions', {
        name: "medical_conditions_condition_name",
        fields: ["condition_name"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('allergies', {
        name: "allergies_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('allergies', {
        name: "allergies_allergen",
        fields: ["allergen"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medical_history', {
        name: "medical_history_patient_id_category",
        fields: ["patient_id", "category"],
        unique: false,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const tables = ["medical_records", "vital_signs", "diagnoses", "medical_conditions", "allergies", "medical_history", "consultations"];
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
