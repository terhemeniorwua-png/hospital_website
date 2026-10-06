'use strict';

/**
 * Seeds the role catalogue, the permission catalogue and the role -> permission
 * matrix that `authorize` middleware relies on.
 */
const { ROLES } = require('../config/constants');
const { ROLE_PERMISSIONS, PERMISSION_DESCRIPTIONS } = require('../config/permissions');

const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: 'Unrestricted access to every module',
  [ROLES.HOSPITAL_ADMIN]: 'Day to day hospital administration',
  [ROLES.DOCTOR]: 'Clinical care, consultations and prescriptions',
  [ROLES.NURSE]: 'Ward nursing, vitals and medication administration',
  [ROLES.PHARMACIST]: 'Dispensing and pharmacy inventory',
  [ROLES.LAB_TECHNICIAN]: 'Laboratory processing and result entry',
  [ROLES.RADIOLOGIST]: 'Imaging studies and reports',
  [ROLES.RECEPTIONIST]: 'Front desk: registration, bookings and check-in',
  [ROLES.ACCOUNTANT]: 'Billing, payments and insurance claims',
  [ROLES.PATIENT]: 'Self service access to own records',
};

/** `resource:action` -> the resource part, used for the `resource` column. */
const resourceOf = (permission) => permission.split(':')[0];
const actionOf = (permission) => permission.split(':')[1];

module.exports = {
  async up() {
    const { Role, Permission, RolePermission } = require('../models');

    const permissionNames = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];

    const permissions = await Promise.all(
      permissionNames.map((name) =>
        Permission.findOrCreate({
          where: { name },
          defaults: {
            name,
            resource: resourceOf(name),
            action: actionOf(name),
            description: PERMISSION_DESCRIPTIONS[name] || `${resourceOf(name)} - ${actionOf(name)}`,
          },
        }),
      ),
    );

    const permissionIds = new Map(permissions.map(([row]) => [row.name, row.id]));

    const roles = await Promise.all(
      Object.values(ROLES).map((name) =>
        Role.findOrCreate({
          where: { name },
          defaults: { name, description: ROLE_DESCRIPTIONS[name], isSystem: true, isActive: true },
        }),
      ),
    );

    const roleIds = new Map(roles.map(([row]) => [row.name, row.id]));

    const links = [];
    for (const [roleName, permissionList] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permissionName of permissionList) {
        links.push({
          roleId: roleIds.get(roleName),
          permissionId: permissionIds.get(permissionName),
        });
      }
    }

    await RolePermission.bulkCreate(links, { ignoreDuplicates: true });

    console.log(`  roles: ${roleIds.size}, permissions: ${permissionIds.size}, links: ${links.length}`);
  },

  async down() {
    const { Role, Permission, RolePermission } = require('../models');
    await RolePermission.destroy({ where: {}, truncate: false });
    await Role.destroy({ where: {}, truncate: false });
    await Permission.destroy({ where: {}, truncate: false });
  },
};
