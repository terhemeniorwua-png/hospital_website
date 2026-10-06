const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const appointmentService = require('../services/appointment.service');

const list = asyncHandler(async (req, res) => {
  const result = await appointmentService.list({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Appointments retrieved' });
});

const getById = asyncHandler(async (req, res) => {
  const data = await appointmentService.getById({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Appointment retrieved', data });
});

const book = asyncHandler(async (req, res) => {
  const data = await appointmentService.book({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Appointment booked', data });
});

/**
 * The service exposes a single guarded state machine (`transition`) rather than
 * one function per status, so the thin per-status actions below are wrappers
 * that pin the target status.
 */
const transitionTo = (status, message) =>
  asyncHandler(async (req, res) => {
    const data = await appointmentService.transition({
      user: req.user,
      id: paramsOf(req).id,
      status,
      reason: bodyOf(req).reason,
    });
    return success(res, { message, data });
  });

const confirm = transitionTo('CONFIRMED', 'Appointment confirmed');
const checkIn = transitionTo('CHECKED_IN', 'Patient checked in');
const start = transitionTo('IN_CONSULTATION', 'Consultation started');
const complete = transitionTo('COMPLETED', 'Appointment completed');
const cancel = transitionTo('CANCELLED', 'Appointment cancelled');
const markNoShow = transitionTo('NO_SHOW', 'Appointment marked as a no-show');

const markNoShows = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await appointmentService.markNoShows({
    user: req.user,
    date: body.date,
    departmentId: body.departmentId,
  });
  return success(res, { message: 'No-shows recorded', data });
});

const reschedule = asyncHandler(async (req, res) => {
  const data = await appointmentService.reschedule({
    user: req.user,
    id: paramsOf(req).id,
    data: bodyOf(req),
  });
  return success(res, { message: 'Appointment rescheduled', data });
});

const availability = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await appointmentService.availability({ doctorId: query.doctorId, date: query.date });
  return success(res, { message: 'Availability retrieved', data });
});

const availableDoctors = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const result = await appointmentService.availableDoctors({
    departmentId: query.departmentId,
    date: query.date,
    query,
  });
  return sendList(res, result, { message: 'Available doctors retrieved' });
});

const blockSlot = asyncHandler(async (req, res) => {
  const params = paramsOf(req);
  const body = bodyOf(req);
  const data = await appointmentService.blockSlot({
    doctorId: params.doctorId,
    slotId: params.slotId,
    isBlocked: body.isBlocked,
    notes: body.notes,
    actor: req.user,
  });
  return success(res, { message: body.isBlocked ? 'Slot blocked' : 'Slot unblocked', data });
});

const patientHistory = asyncHandler(async (req, res) => {
  const result = await appointmentService.patientHistory({
    user: req.user,
    patientId: paramsOf(req).patientId,
    query: queryOf(req),
  });
  return sendList(res, result, { message: 'Appointment history retrieved' });
});

const followUps = asyncHandler(async (req, res) => {
  const result = await appointmentService.followUps({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Follow-ups retrieved' });
});

const statistics = asyncHandler(async (req, res) => {
  const data = await appointmentService.statistics({ query: queryOf(req) });
  return success(res, { message: 'Appointment statistics', data });
});

const statuses = asyncHandler(async (req, res) =>
  success(res, { message: 'Appointment status transitions', data: appointmentService.TRANSITIONS }),
);

module.exports = {
  list,
  getById,
  book,
  confirm,
  checkIn,
  start,
  complete,
  cancel,
  markNoShow,
  markNoShows,
  reschedule,
  availability,
  availableDoctors,
  blockSlot,
  patientHistory,
  followUps,
  statistics,
  statuses,
};