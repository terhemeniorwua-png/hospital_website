'use strict';

/**
 * Access control, users and departments
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('roles', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        name: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        is_system: {
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
      await queryInterface.createTable('permissions', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        name: {
          type: Sequelize.STRING(80),
          allowNull: false,
        },
        resource: {
          type: Sequelize.STRING(40),
          allowNull: false,
        },
        action: {
          type: Sequelize.STRING(40),
          allowNull: false,
        },
        description: {
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
      await queryInterface.createTable('role_permissions', {
        role_id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
        },
        permission_id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
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
      await queryInterface.createTable('departments', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        name: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
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
        location: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        is_emergency: {
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
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        first_name: {
          type: Sequelize.STRING(80),
          allowNull: false,
        },
        last_name: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        email: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        phone: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        password_hash: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        role_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM("ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        employee_id: {
          type: Sequelize.STRING(40),
          allowNull: true,
        },
        gender: {
          type: Sequelize.ENUM("MALE", "FEMALE", "OTHER"),
          allowNull: true,
        },
        address: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        avatar_url: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        last_login_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        last_login_ip: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        failed_login_attempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        locked_until: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        password_changed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        must_change_password: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        email_verified_at: {
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
      await queryInterface.createTable('refresh_tokens', {
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
        token_hash: {
          type: Sequelize.STRING(64),
          allowNull: false,
        },
        jti: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        revoked_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        revoked_reason: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        replaced_by_token_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        user_agent: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        ip_address: {
          type: Sequelize.STRING(64),
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
      await queryInterface.createTable('password_resets', {
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
        token_hash: {
          type: Sequelize.STRING(64),
          allowNull: false,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        used_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        requested_ip: {
          type: Sequelize.STRING(64),
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
      await queryInterface.addConstraint('role_permissions', {
        fields: ['role_id'],
        type: 'foreign key',
        name: "role_permissions_role_id_fk",
        references: { table: 'roles', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('role_permissions', {
        fields: ['permission_id'],
        type: 'foreign key',
        name: "role_permissions_permission_id_fk",
        references: { table: 'permissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('users', {
        fields: ['role_id'],
        type: 'foreign key',
        name: "users_role_id_fk",
        references: { table: 'roles', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('users', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "users_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "NO ACTION",
        transaction,
      });
      await queryInterface.addConstraint('users', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "users_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "NO ACTION",
        transaction,
      });
      await queryInterface.addConstraint('refresh_tokens', {
        fields: ['user_id'],
        type: 'foreign key',
        name: "refresh_tokens_user_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('refresh_tokens', {
        fields: ['replaced_by_token_id'],
        type: 'foreign key',
        name: "refresh_tokens_replaced_by_token_id_fk",
        references: { table: 'refresh_tokens', field: 'id' },
        onDelete: "NO ACTION",
        transaction,
      });
      await queryInterface.addConstraint('password_resets', {
        fields: ['user_id'],
        type: 'foreign key',
        name: "password_resets_user_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('roles', {
        name: "roles_name",
        fields: ["name"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('permissions', {
        name: "permissions_name",
        fields: ["name"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('role_permissions', {
        name: "role_permissions_role_id_permission_id",
        fields: ["role_id", "permission_id"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('departments', {
        name: "departments_name",
        fields: ["name"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('departments', {
        name: "departments_code",
        fields: ["code"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('users', {
        name: "users_email",
        fields: ["email"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('users', {
        name: "users_employee_id",
        fields: ["employee_id"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('users', {
        name: "users_role_id",
        fields: ["role_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('users', {
        name: "users_status",
        fields: ["status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('users', {
        name: "users_patient_id_unique",
        fields: ["patient_id"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('refresh_tokens', {
        name: "refresh_tokens_token_hash",
        fields: ["token_hash"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('refresh_tokens', {
        name: "refresh_tokens_user_id",
        fields: ["user_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('refresh_tokens', {
        name: "refresh_tokens_expires_at",
        fields: ["expires_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('password_resets', {
        name: "password_resets_token_hash",
        fields: ["token_hash"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('password_resets', {
        name: "password_resets_user_id",
        fields: ["user_id"],
        unique: false,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const tables = ["role_permissions", "departments", "refresh_tokens", "password_resets", "permissions", "users", "roles"];
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
