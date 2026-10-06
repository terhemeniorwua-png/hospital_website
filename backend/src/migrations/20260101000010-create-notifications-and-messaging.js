'use strict';

/**
 * Notifications, messaging and documents
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('notifications', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        type: {
          type: Sequelize.ENUM("APPOINTMENT", "LABORATORY", "PRESCRIPTION", "BILLING", "ADMISSION", "DISCHARGE", "SYSTEM", "MESSAGE"),
          allowNull: false,
          defaultValue: "SYSTEM",
        },
        title: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        data: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        priority: {
          type: Sequelize.ENUM("LOW", "NORMAL", "HIGH", "URGENT"),
          allowNull: false,
          defaultValue: "NORMAL",
        },
        is_read: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        read_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        action_url: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        created_by: {
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
      await queryInterface.createTable('conversations', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        subject: {
          type: Sequelize.STRING(180),
          allowNull: false,
        },
        type: {
          type: Sequelize.ENUM("DIRECT", "GROUP", "CASE"),
          allowNull: false,
          defaultValue: "DIRECT",
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Optional clinical context",
        },
        last_message_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        last_message_preview: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        is_archived: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
      await queryInterface.createTable('conversation_participants', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        conversation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        role_in_conversation: {
          type: Sequelize.ENUM("MEMBER", "OWNER", "OBSERVER"),
          allowNull: false,
          defaultValue: "MEMBER",
        },
        unread_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        last_read_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        is_muted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        joined_at: {
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
      await queryInterface.createTable('messages', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        conversation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        sender_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        body: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        attachment_url: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        attachment_name: {
          type: Sequelize.STRING(180),
          allowNull: true,
        },
        document_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        is_system: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Set when a patient is discussed in the thread",
        },
        read_by: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: "Array of user ids who have read the message",
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
      await queryInterface.createTable('documents', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        uploaded_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        category: {
          type: Sequelize.ENUM("LAB_REPORT", "IMAGING_REPORT", "MEDICAL_DOCUMENT", "DISCHARGE_SUMMARY", "PATIENT_DOCUMENT", "INSURANCE", "OTHER"),
          allowNull: false,
          defaultValue: "OTHER",
        },
        title: {
          type: Sequelize.STRING(180),
          allowNull: true,
        },
        original_name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        stored_name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        storage_path: {
          type: Sequelize.STRING(500),
          allowNull: false,
        },
        mime_type: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        size: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        checksum: {
          type: Sequelize.STRING(64),
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
        is_private: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        notes: {
          type: Sequelize.STRING(500),
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
      await queryInterface.addConstraint('notifications', {
        fields: ['user_id'],
        type: 'foreign key',
        name: "notifications_user_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('notifications', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "notifications_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('notifications', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "notifications_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('conversations', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "conversations_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('conversations', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "conversations_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('conversations', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "conversations_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('conversation_participants', {
        fields: ['conversation_id'],
        type: 'foreign key',
        name: "conversation_participants_conversation_id_fk",
        references: { table: 'conversations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('conversation_participants', {
        fields: ['user_id'],
        type: 'foreign key',
        name: "conversation_participants_user_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('messages', {
        fields: ['conversation_id'],
        type: 'foreign key',
        name: "messages_conversation_id_fk",
        references: { table: 'conversations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('messages', {
        fields: ['sender_id'],
        type: 'foreign key',
        name: "messages_sender_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('messages', {
        fields: ['document_id'],
        type: 'foreign key',
        name: "messages_document_id_fk",
        references: { table: 'documents', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('messages', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "messages_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('documents', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "documents_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('documents', {
        fields: ['uploaded_by'],
        type: 'foreign key',
        name: "documents_uploaded_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('notifications', {
        name: "notifications_user_id_is_read",
        fields: ["user_id", "is_read"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('notifications', {
        name: "notifications_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('notifications', {
        name: "notifications_created_at",
        fields: ["created_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('conversations', {
        name: "conversations_last_message_at",
        fields: ["last_message_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('conversations', {
        name: "conversations_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('conversation_participants', {
        name: "conversation_participants_conversation_id_user_id",
        fields: ["conversation_id", "user_id"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('conversation_participants', {
        name: "conversation_participants_user_id",
        fields: ["user_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('messages', {
        name: "messages_conversation_id_created_at",
        fields: ["conversation_id", "created_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('messages', {
        name: "messages_sender_id",
        fields: ["sender_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('documents', {
        name: "documents_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('documents', {
        name: "documents_category",
        fields: ["category"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('documents', {
        name: "documents_reference_type_reference_id",
        fields: ["reference_type", "reference_id"],
        unique: false,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const tables = ["notifications", "conversation_participants", "messages", "conversations", "documents"];
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
