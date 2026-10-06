const {
  success,
  created,
  list,
  noContent,
  failure,
} = require('../src/utils/apiResponse');

/** Captures what a handler would send, without needing Express. */
function fakeRes() {
  return {
    statusCode: null,
    body: undefined,
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
  };
}

describe('utils/apiResponse', () => {
  describe('success', () => {
    it('uses the documented envelope', () => {
      const res = fakeRes();
      success(res, { message: 'Patient retrieved', data: { id: 1 } });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Patient retrieved', data: { id: 1 } });
    });

    it('defaults data to null so the shape never changes', () => {
      const res = fakeRes();
      success(res, {});
      expect(res.body.data).toBeNull();
      expect(res.body).not.toHaveProperty('pagination');
    });

    it('includes pagination and meta only when supplied', () => {
      const res = fakeRes();
      success(res, { data: [], pagination: { page: 1, total: 0 }, meta: { took: 5 } });

      expect(res.body.pagination).toEqual({ page: 1, total: 0 });
      expect(res.body.meta).toEqual({ took: 5 });
    });
  });

  describe('created', () => {
    it('responds 201 with the same envelope', () => {
      const res = fakeRes();
      created(res, { message: 'Patient created', data: { id: 7 } });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('list', () => {
    it('defaults to an empty array rather than null', () => {
      const res = fakeRes();
      list(res, {});

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('carries pagination through', () => {
      const res = fakeRes();
      list(res, { data: [{ id: 1 }], pagination: { page: 2, limit: 20, total: 21, totalPages: 2 } });

      expect(res.body.pagination.totalPages).toBe(2);
    });
  });

  describe('noContent', () => {
    it('responds 204 with no body', () => {
      const res = fakeRes();
      noContent(res);

      expect(res.statusCode).toBe(204);
      expect(res.body).toBeUndefined();
    });
  });

  describe('failure', () => {
    it('reports the message with an error list', () => {
      const res = fakeRes();
      failure(res, { message: 'Validation failed', statusCode: 422, errors: [{ field: 'email' }] });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toHaveLength(1);
    });

    it('defaults errors to an array so clients can always iterate', () => {
      const res = fakeRes();
      failure(res, { message: 'Nope', statusCode: 500 });
      expect(res.body.errors).toEqual([]);
    });
  });
});