const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const VALIDATOR_DIR = path.join(__dirname, '..', 'src', 'validators');

/** `{ name, schemas }` for every validator module. */
const modules = fs
  .readdirSync(VALIDATOR_DIR)
  .filter((file) => file.endsWith('.validator.js'))
  .map((file) => ({
    name: file.replace('.validator.js', ''),
    schemas: require(path.join(VALIDATOR_DIR, file)),
  }));

/** Every `{ params?, query?, body? }` contract, flattened for table-driven tests. */
const contracts = modules.flatMap(({ name: module, schemas }) =>
  Object.entries(schemas).flatMap(([contract, parts]) =>
    ['query', 'params', 'body']
      .filter((part) => parts[part])
      .map((part) => ({
        id: `${module}.${contract}.${part}`,
        module,
        contract,
        part,
        schema: parts[part],
      })),
  ),
);

const queries = contracts.filter(({ part }) => part === 'query');

/**
 * Query contracts that legitimately demand at least one filter. Anything else
 * must accept a bare `?page=1&limit=10`, which is exactly the regression that
 * broke every list endpoint when filters were declared as required.
 */
const REQUIRED_FILTERS = {
  'appointment.availability.query': ['doctorId'],
  'queue.board.query': ['departmentId'],
  'queue.estimate.query': ['departmentId', 'ticketNumber'],
};

/** Keys the schema reports as missing when parsed from an empty object. */
const requiredKeysOf = (schema) => {
  const result = schema.safeParse({});
  if (result.success) return [];
  return [...new Set(result.error.issues.filter((i) => i.code === 'invalid_type').map((i) => i.path[0]))];
};

describe('validators: query filters are never required', () => {
  it('covers every exported query contract', () => {
    expect(queries.length).toBeGreaterThan(50);
  });

  describe.each(queries.map((q) => [q.id, q]))('%s', (id, { schema }) => {
    it('requires only the filters this endpoint documents', () => {
      expect(requiredKeysOf(schema).sort()).toEqual([...(REQUIRED_FILTERS[id] ?? [])].sort());
    });

    it('accepts a bare paging query when no filter is required', () => {
      if (REQUIRED_FILTERS[id]) return;

      const payload = { page: '1', limit: '10' };
      const result = schema.safeParse(payload);
      if (!result.success) {
        throw new Error(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
      }
      expect(result.data).not.toHaveProperty('undefined');
    });
  });
});

describe('validators: supplied filters are still type-checked', () => {
  /** Probe values that must never be accepted for the matching key. */
  const PROBES = [
    [/(^|)Id$/, 'abc', 'a non-numeric id'],
    [/^(isActive|isEmergency|active|availableOnly|unpaid|overdue|published|unpublished|unverified|activeOnly|lowStock|expired|expiring|archived|unread|private|includeClinical|unread)$/, 'maybe', 'a non-boolean flag'],
    [/^(date|from|to|createdFrom|createdTo|startDate|endDate)$/, 'yesterday', 'a non-ISO date'],
    [/^(status|type|role|priority|flag|recordType|transactionType|method)$/, '__NOT_A_VALUE__', 'an unknown enum member'],
  ];

  const keyOf = (schema) => Object.keys(schema.shape ?? {});

  describe.each(
    queries
      .map((q) => [q.id, q])
      .filter(([, q]) => keyOf(q.schema).length),
  )('%s', (id, { schema }) => {
    const probes = keyOf(schema).flatMap((key) =>
      PROBES.filter(([pattern]) => pattern.test(key)).map(([, value, label]) => [key, value, label]),
    );

    if (probes.length) {
      it.each(probes)('rejects %s given %s', (key, value) => {
        const result = schema.safeParse({ [key]: value });
        expect(result.success).toBe(false);
        expect(result.error.issues.some((i) => i.path[0] === key)).toBe(true);
      });
    }
  });

  it('parses id filters as uuids and keeps numeric filters numeric', () => {
    const consultationList = require('../src/validators/consultation.validator').list.query;
    const patientId = '31745de3-eca2-4ffb-84f9-f84b29c34f67';
    expect(consultationList.parse({ patientId, limit: '5' })).toMatchObject({ patientId, limit: 5 });
    expect(consultationList.safeParse({ patientId: '42', limit: '5' }).success).toBe(false);
  });
});

describe('validators: shared helpers', () => {
  const common = require('../src/validators/common');

  it('accepts uuid query ids and rejects unusable values', () => {
    const uuid = '31745de3-eca2-4ffb-84f9-f84b29c34f67';
    expect(common.optionalId.safeParse(uuid).data).toBe(uuid);
    expect(common.optionalId.safeParse(undefined).success).toBe(true);
    expect(common.optionalId.safeParse('abc').success).toBe(false);
    expect(common.optionalId.safeParse('42').success).toBe(false);
    expect(common.optionalId.safeParse('not-a-uuid').success).toBe(false);
  });

  it('parses booleanish flags in every query representation', () => {
    for (const truthy of [true, 'true', '1']) expect(common.optionalBooleanish.safeParse(truthy).data).toBe(true);
    for (const falsy of [false, 'false', '0']) expect(common.optionalBooleanish.safeParse(falsy).data).toBe(false);
    expect(common.optionalBooleanish.safeParse(undefined).success).toBe(true);
    expect(common.optionalBooleanish.safeParse('maybe').success).toBe(false);
  });

  it('turns an absent optional string into undefined rather than ""', () => {
    expect(common.optionalString(10).parse(undefined)).toBeUndefined();
    expect(common.optionalString(10).parse('   ')).toBeUndefined();
    expect(common.optionalString(10).parse('  hi  ')).toBe('hi');
  });

  it('parses YYYY-MM-DD only and rejects impossible dates', () => {
    expect(common.dateOnly.parse('2026-02-28')).toBe('2026-02-28');
    expect(common.dateOnly.safeParse('2026-2-28').success).toBe(false);
    expect(common.dateOnly.safeParse('28-02-2026').success).toBe(false);
    expect(common.dateOnly.safeParse(undefined).success).toBe(true);
  });

  it('splits comma-separated enum filters and drops an absent one', () => {
    expect(common.optionalEnumList(['A', 'B']).parse('a,b')).toEqual(['A', 'B']);
    expect(common.optionalEnumList(['A', 'B']).parse(undefined)).toBeUndefined();
    expect(common.optionalEnumList(['A', 'B']).safeParse('a,z').success).toBe(false);
  });

  it('applies pagination defaults and rejects an oversized page', () => {
    const schema = z.object({ ...common.paginationQuery });
    expect(schema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(schema.parse({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10 });
    expect(schema.safeParse({ limit: '9999' }).success).toBe(false);
  });

  it('requires a route id', () => {
    expect(common.idRoute.params.safeParse({ id: '31745de3-eca2-4ffb-84f9-f84b29c34f67' }).success).toBe(true);
    expect(common.idRoute.params.safeParse({ id: '7' }).success).toBe(false);
    expect(common.idRoute.params.safeParse({}).success).toBe(false);
  });
});