'use strict';

/** Seeds wards with their rooms and beds so admissions can be demonstrated. */
const WARDS = [
  {
    name: 'Male Medical Ward',
    code: 'MW-MED',
    floor: 'First floor',
    wardType: 'GENERAL',
    description: 'General medical inpatient ward',
    dailyRate: 25000,
    rooms: [
      { roomNumber: 'M101', roomType: 'GENERAL', capacity: 4, beds: ['M101-B1', 'M101-B2', 'M101-B3', 'M101-B4'] },
      { roomNumber: 'M102', roomType: 'GENERAL', capacity: 4, beds: ['M102-B1', 'M102-B2', 'M102-B3', 'M102-B4'] },
    ],
  },
  {
    name: 'Surgical Ward',
    code: 'MW-SURG',
    floor: 'Second floor',
    wardType: 'SURGICAL',
    description: 'Post operative surgical inpatient ward',
    dailyRate: 35000,
    rooms: [
      { roomNumber: 'S201', roomType: 'GENERAL', capacity: 3, beds: ['S201-B1', 'S201-B2', 'S201-B3'] },
      { roomNumber: 'S202', roomType: 'PRIVATE', capacity: 1, beds: ['S202-B1'] },
    ],
  },
  {
    name: 'Private Suites',
    code: 'MW-PRIV',
    floor: 'Third floor',
    wardType: 'PRIVATE',
    description: 'Single occupancy private suites',
    dailyRate: 75000,
    rooms: [{ roomNumber: 'P301', roomType: 'PRIVATE', capacity: 1, beds: ['P301-B1'] }],
  },
];

module.exports = {
  async up() {
    const { Ward, Room, Bed, Department } = require('../models');
    const { BED_STATUS } = require('../config/constants');

    const inpatient = await Department.findOne({ where: { code: 'WARD' } });

    for (const ward of WARDS) {
      // eslint-disable-next-line no-await-in-loop
      const [wardRow] = await Ward.findOrCreate({
        where: { code: ward.code },
        defaults: {
          name: ward.name,
          code: ward.code,
          departmentId: inpatient ? inpatient.id : null,
          floor: ward.floor,
          wardType: ward.wardType,
          totalBeds: ward.rooms.reduce((sum, room) => sum + room.beds.length, 0),
          description: ward.description,
          isActive: true,
        },
      });

      for (const room of ward.rooms) {
        // eslint-disable-next-line no-await-in-loop
        const [roomRow] = await Room.findOrCreate({
          where: { wardId: wardRow.id, roomNumber: room.roomNumber },
          defaults: {
            wardId: wardRow.id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: room.capacity,
            dailyRate: ward.dailyRate,
            isActive: true,
          },
        });

        for (const bedNumber of room.beds) {
          // eslint-disable-next-line no-await-in-loop
          await Bed.findOrCreate({
            where: { roomId: roomRow.id, bedNumber },
            defaults: {
              roomId: roomRow.id,
              wardId: wardRow.id,
              bedNumber,
              status: BED_STATUS.AVAILABLE,
              dailyRate: ward.dailyRate,
              isActive: true,
            },
          });
        }
      }
    }

    const beds = WARDS.reduce((sum, ward) => sum + ward.rooms.reduce((r, room) => r + room.beds.length, 0), 0);
    console.log(`  wards: ${WARDS.length}, beds: ${beds}`);
  },

  async down() {
    const { Bed, Room, Ward } = require('../models');
    await Bed.destroy({ where: {}, truncate: false });
    await Room.destroy({ where: {}, truncate: false });
    await Ward.destroy({ where: {}, truncate: false });
  },
};

module.exports.WARDS = WARDS;
