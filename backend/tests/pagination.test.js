const { getPagination, getSort, buildPaginationMeta, withSortable } = require('../src/utils/pagination');
const { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } = require('../src/config/env');

describe('utils/pagination', () => {
  describe('getPagination', () => {
    it('computes the offset from page and limit', () => {
      expect(getPagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, offset: 20 });
    });

    it('falls back to defaults for missing values', () => {
      expect(getPagination({})).toEqual({
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        offset: 0,
      });
    });

    it('caps the page size so a client cannot request the whole table', () => {
      expect(getPagination({ limit: '100000' }).limit).toBe(MAX_PAGE_SIZE);
    });

    it('rejects zero and negative paging values', () => {
      expect(getPagination({ page: '0', limit: '0' }).page).toBe(1);
      expect(getPagination({ page: '-4' }).page).toBe(1);
      expect(getPagination({ limit: '-10' }).limit).toBe(DEFAULT_PAGE_SIZE);
    });

    it('accepts pageSize as an alias for limit', () => {
      expect(getPagination({ pageSize: '25' }).limit).toBe(25);
    });
  });

  describe('getSort', () => {
    it('keeps only whitelisted columns', () => {
      expect(getSort({ sort: 'lastName' }, ['lastName', 'id'])).toEqual([['lastName', 'DESC']]);
    });

    it('ignores injected SQL in the sort parameter', () => {
      const order = getSort({ sort: 'lastName; DROP TABLE users' }, ['lastName', 'id']);
      expect(order).toEqual([['createdAt', 'DESC']]);
    });

    it('supports comma-separated columns and honours the direction', () => {
      expect(getSort({ sort: 'lastName,firstName', order: 'asc' }, ['lastName', 'firstName'])).toEqual([
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ]);
    });

    it('falls back when nothing is whitelisted', () => {
      expect(getSort({ sort: 'nope' }, ['lastName'])).toEqual([['createdAt', 'DESC']]);
      expect(getSort({}, ['lastName'])).toEqual([['createdAt', 'DESC']]);
    });

    it('accepts sortBy and direction aliases', () => {
      expect(getSort({ sortBy: 'id', direction: 'asc' }, ['id'])).toEqual([['id', 'ASC']]);
    });
  });

  describe('buildPaginationMeta', () => {
    it('rounds total pages up', () => {
      expect(buildPaginationMeta({ page: 1, limit: 10, total: 25 })).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('is zero-safe when there are no rows', () => {
      expect(buildPaginationMeta({ page: 1, limit: 10, total: 0 }).totalPages).toBe(0);
      expect(buildPaginationMeta({ page: 1, limit: 0, total: 5 }).totalPages).toBe(0);
    });

    it('coerces a missing total to 0', () => {
      expect(buildPaginationMeta({ page: 1, limit: 10 }).total).toBe(0);
    });
  });

  describe('withSortable', () => {
    it('merges columns without duplicates', () => {
      expect(withSortable(['id', 'createdAt'], ['name'], ['id', 'name'])).toEqual([
        'id',
        'createdAt',
        'name',
      ]);
    });
  });
});