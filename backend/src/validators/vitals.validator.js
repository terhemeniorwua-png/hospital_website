const { z, dateTime, optionalText } = require('./common');

/**
 * Vital-sign reading block.
 *
 * Shared by consultations, nursing observations and the emergency department so
 * the same measurements can never drift between modules. All values are
 * clinically bounded at the edge.
 */

const vitalReadings = {
  temperature: z.coerce.number().min(25).max(45).optional().nullable(),
  pulse: z.coerce.number().int().min(20).max(300).optional().nullable(),
  respiratoryRate: z.coerce.number().int().min(4).max(80).optional().nullable(),
  bloodPressureSystolic: z.coerce.number().int().min(50).max(300).optional().nullable(),
  bloodPressureDiastolic: z.coerce.number().int().min(20).max(200).optional().nullable(),
  spo2: z.coerce.number().min(50).max(100).optional().nullable(),
  bloodGlucose: z.coerce.number().min(0).max(1000).optional().nullable(),
  weight: z.coerce.number().min(0.2).max(500).optional().nullable(),
  height: z.coerce.number().min(20).max(260).optional().nullable(),
  painScore: z.coerce.number().int().min(0).max(10).optional().nullable(),
  notes: optionalText(500),
  recordedAt: dateTime,
};

const vitalSigns = z.object(vitalReadings).refine(
  (data) => Object.values(data).some((value) => value !== undefined && value !== null && value !== ''),
  { message: 'At least one vital sign reading is required' },
);

module.exports = { vitalReadings, vitalSigns };