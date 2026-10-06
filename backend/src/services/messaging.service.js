const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const { sequelize } = require('../config/database');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { roleNameOf } = require('../utils/accessControl');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const { sameId } = require('../utils/ids');
const {
  Conversation,
  ConversationParticipant,
  Message,
  User,
  Patient,
  Document,
  Appointment,
  Admission,
  MedicalRecord,
  Doctor,
  Role,
} = require('../models');

/**
 * Secure messaging between patients and hospital staff.
 *
 * Access rule: you can only open a conversation you participate in. Patients
 * are auto-subscribed to the thread, staff must be added by an administrator or
 * by the conversation creator. Every read/write updates the participant's
 * unread counter so the inbox badge stays correct.
 */

const PREVIEW_LENGTH = 120;

const CONVERSATION_INCLUDES = [
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
];

async function addParticipants({ conversationId, userIds, roleInConversation = 'MEMBER', transaction }) {
  const unique = Array.from(new Set((userIds || []).filter(Boolean)));

  for (const userId of unique) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await ConversationParticipant.findOne({ where: { conversationId, userId }, transaction });
    if (existing) {
      // eslint-disable-next-line no-await-in-loop
      await existing.update({ isMuted: false }, { transaction });
    } else {
      // eslint-disable-next-line no-await-in-loop
      await ConversationParticipant.create(
        { conversationId, userId, roleInConversation, unreadCount: 0, joinedAt: new Date() },
        { transaction },
      );
    }
  }

  return unique;
}

/** Opens (or reuses) a patient <-> staff thread. */
async function startConversation({ user, data }) {
  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw AppError.notFound('Patient not found');
  if (roleNameOf(user) === 'PATIENT' && !sameId(patient.id, user.patientId)) {
    throw AppError.forbidden('You cannot start a conversation for another patient');
  }

  // Reuse an existing open thread between the same patient and staff member.
  const existing = await Conversation.findOne({
    where: { patientId: patient.id, isArchived: false, type: data.type || 'CARE_TEAM' },
    order: [['lastMessageAt', 'DESC'], ['id', 'DESC']],
  });

  if (existing) {
    // eslint-disable-next-line no-await-in-loop
    await addParticipants({ conversationId: existing.id, userIds: [user.id, ...(data.participantIds || [])] });
    return getConversation({ user, id: existing.id });
  }

  const participants = Array.from(new Set([user.id, ...(data.participantIds || [])]));
  if (roleNameOf(user) === 'PATIENT') {
    // A patient cannot silently pull staff into a thread; staff are added by
    // care-team assignment. Only the patient themselves is added here.
    const staffIds = (data.participantIds || []).filter((id) => !sameId(id, user.id));
    if (staffIds.length) {
      const allowed = await participantIdsForPatient(patient.id);
      const unauthorised = staffIds.filter((id) => !allowed.includes(id));
      if (unauthorised.length) throw AppError.forbidden('You cannot add users to this conversation');
    }
  }

  const conversation = await sequelize.transaction(async (transaction) => {
    const created = await Conversation.create(
      {
        subject: data.subject || `${patient.getFullName()} - care team`,
        type: data.type || 'CARE_TEAM',
        patientId: patient.id,
        lastMessageAt: new Date(),
        lastMessagePreview: null,
        isArchived: false,
        createdBy: user.id,
      },
      { transaction },
    );

    await addParticipants({ conversationId: created.id, userIds: participants, transaction });

    if (data.message) {
      // eslint-disable-next-line no-await-in-loop
      await Message.create(
        {
          conversationId: created.id,
          senderId: user.id,
          body: data.message,
          patientId: patient.id,
          isSystem: false,
        },
        { transaction },
      );
      // eslint-disable-next-line no-await-in-loop
      await created.update({ lastMessagePreview: data.message.slice(0, PREVIEW_LENGTH) }, { transaction });
    }

    return created;
  });

  return getConversation({ user, id: conversation.id });
}

/** Staff already involved with this patient (doctors, nurses, admins). */
async function participantIdsForPatient(patientId) {
  const [appointments, admissions, records] = await Promise.all([
    Appointment.findAll({ where: { patientId }, attributes: ['doctorId'], raw: true }),
    Admission.findAll({ where: { patientId }, attributes: ['attendingDoctorId'], raw: true }),
    MedicalRecord.findAll({ where: { patientId }, attributes: ['recordedBy'], limit: 50, raw: true }),
  ]);

  const doctorIds = [
    ...appointments.map((a) => a.doctorId),
    ...admissions.map((a) => a.attendingDoctorId),
  ].filter(Boolean);

  const doctors = doctorIds.length ? await Doctor.findAll({ where: { id: { [Op.in]: doctorIds } }, attributes: ['userId'], raw: true }) : [];
  const recorderIds = records.map((r) => r.recordedBy).filter(Boolean);

  return Array.from(
    new Set([...doctors.map((d) => d.userId), ...recorderIds.map(String), ...(await adminUserIds())]),
  );
}

async function adminUserIds() {
  const roles = await Role.findAll({ where: { name: { [Op.in]: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'] } }, attributes: ['id'], raw: true });
  if (!roles.length) return [];
  const users = await User.findAll({ where: { roleId: { [Op.in]: roles.map((r) => r.id) } }, attributes: ['id'], raw: true });
  return users.map((u) => u.id);
}

/** The caller's inbox. */
async function listConversations({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  // Only conversations the caller actually participates in.
  const memberships = await ConversationParticipant.findAll({
    where: { userId: user.id },
    attributes: ['conversationId'],
    raw: true,
  });
  const conversationIds = memberships.map((m) => m.conversationId);

  const rows = conversationIds.length
    ? await Conversation.findAll({
        where: combineWhere(
          { id: { [Op.in]: conversationIds } },
          query.archived === true ? { isArchived: true } : { isArchived: false },
          roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
          searchWhere(query.search, [['subject', 'string']]),
        ),
        include: [
          ...CONVERSATION_INCLUDES,
          { model: ConversationParticipant, as: 'participants', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }] },
        ],
        order: [['lastMessageAt', 'DESC']],
        limit,
        offset,
        distinct: true,
      })
    : [];

  const total = rows.length;

  const conversations = await Promise.all(
    rows.map(async (conversation) => {
      const plain = conversation.get({ plain: true });
      const mine = (plain.participants || []).find((p) => sameId(p.userId, user.id));
      const others = (plain.participants || [])
        .filter((p) => !sameId(p.userId, user.id))
        .map((p) => ({
          userId: p.userId,
          name: p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Unknown',
        }));

      return {
        ...plain,
        participants: undefined,
        participantCount: (plain.participants || []).length,
        otherParticipants: others,
        unreadCount: mine?.unreadCount ?? 0,
        lastMessageAt: plain.lastMessageAt,
      };
    }),
  );

  return { conversations, pagination: buildPaginationMeta({ page, limit, total: Math.max(total, 0) }) };
}

async function assertParticipant({ user, conversationId }) {
  const participant = await ConversationParticipant.findOne({ where: { conversationId, userId: user.id } });
  if (!participant) throw AppError.forbidden('You are not a participant in this conversation');
  return participant;
}

async function getConversation({ user, id }) {
  const conversation = await Conversation.findByPk(id, {
    include: [
      ...CONVERSATION_INCLUDES,
      { model: ConversationParticipant, as: 'participants', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
    ],
  });
  if (!conversation) throw AppError.notFound('Conversation not found');

  await assertParticipant({ user, conversationId: id });

  const plain = conversation.get({ plain: true });
  return {
    ...plain,
    participants: (plain.participants || []).map((participant) => ({
      userId: participant.userId,
      roleInConversation: participant.roleInConversation,
      unreadCount: participant.unreadCount,
      user: participant.user,
    })),
  };
}

async function listMessages({ user, id, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  await assertParticipant({ user, conversationId: id });

  const where = combineWhere(
    { conversationId: id },
    query.since ? { createdAt: { [Op.gte]: new Date(query.since) } } : undefined,
    query.unread === true ? { senderId: { [Op.ne]: user.id } } : undefined,
  );

  const { rows, count } = await Message.findAndCountAll({
    where,
    include: [
      { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'role'] },
      { model: Document, as: 'document', attributes: ['id', 'title', 'originalName', 'mimeType', 'size'] },
    ],
    order: [['createdAt', query.order === 'ASC' ? 'ASC' : 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    messages: rows.map((row) => row.get({ plain: true })),
    pagination: buildPaginationMeta({ page, limit, total: count }),
  };
}

/** Posts a message and pushes it to every participant's socket. */
async function sendMessage({ user, id, data }) {
  const conversation = await Conversation.findByPk(id);
  if (!conversation) throw AppError.notFound('Conversation not found');
  if (conversation.isArchived) throw AppError.conflict('This conversation is archived');

  const participant = await assertParticipant({ user, conversationId: id });

  const message = await sequelize.transaction(async (transaction) => {
    const created = await Message.create(
      {
        conversationId: id,
        senderId: user.id,
        body: data.body,
        attachmentUrl: data.attachmentUrl ?? null,
        attachmentName: data.attachmentName ?? null,
        documentId: data.documentId ?? null,
        patientId: conversation.patientId,
        isSystem: false,
        readBy: [user.id],
      },
      { transaction },
    );

    await conversation.update(
      { lastMessageAt: created.createdAt, lastMessagePreview: created.body.slice(0, PREVIEW_LENGTH) },
      { transaction },
    );

    await participant.update({ lastReadAt: created.createdAt, unreadCount: 0 }, { transaction });

    // Everyone else gets an unread bump.
    const others = await ConversationParticipant.findAll({
      where: { conversationId: id, userId: { [Op.ne]: user.id } },
      transaction,
    });
    for (const other of others) {
      // eslint-disable-next-line no-await-in-loop
      await other.increment('unreadCount', { by: 1, transaction });
    }

    return created;
  });

  const recipients = await ConversationParticipant.findAll({ where: { conversationId: id, userId: { [Op.ne]: user.id } } });

  realtime.emitToConversation(id, EVENTS.MESSAGE_RECEIVED, {
    conversationId: id,
    messageId: message.id,
    senderId: user.id,
    body: message.body,
    createdAt: message.createdAt,
  });

  recipients.forEach((recipient) => {
    realtime.emitToUser(recipient.userId, EVENTS.MESSAGE_RECEIVED, {
      conversationId: id,
      messageId: message.id,
      senderId: user.id,
      unreadCount: participant.unreadCount + 1,
    });
  });

  if (conversation.patientId) {
    realtime.emitToPatient(conversation.patientId, EVENTS.MESSAGE_RECEIVED, {
      conversationId: id,
      messageId: message.id,
      senderId: user.id,
    });
  }

  return message.get({ plain: true });
}

/** Marks a conversation read for the caller. */
async function markRead({ user, id, messageId }) {
  const participant = await assertParticipant({ user, conversationId: id });

  const where = combineWhere(
    { conversationId: id, senderId: { [Op.ne]: user.id } },
    messageId ? { id: { [Op.lt]: messageId } } : undefined,
  );

  const messages = await Message.findAll({ where, attributes: ['id', 'readBy'] });
  for (const message of messages) {
    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
    if (readBy.map(String).includes(user.id)) continue;
    // eslint-disable-next-line no-await-in-loop
    await message.update({ readBy: [...readBy, user.id] });
  }

  await participant.update({ unreadCount: 0, lastReadAt: new Date() });

  realtime.emitToConversation(id, EVENTS.MESSAGE_READ, { conversationId: id, userId: user.id, readAt: participant.lastReadAt });

  return { conversationId: id, unreadCount: 0, markedRead: messages.length };
}

async function addParticipantsToConversation({ user, id, data }) {
  const conversation = await Conversation.findByPk(id);
  if (!conversation) throw AppError.notFound('Conversation not found');
  await assertParticipant({ user, conversationId: id });

  const created = await addParticipants({
    conversationId: id,
    userIds: data.userIds,
    roleInConversation: data.roleInConversation || 'MEMBER',
  });

  return getConversation({ user, id });
}

async function archive({ user, id, archived = true }) {
  const conversation = await Conversation.findByPk(id);
  if (!conversation) throw AppError.notFound('Conversation not found');
  await assertParticipant({ user, conversationId: id });

  await conversation.update({ isArchived: Boolean(archived) });
  return conversation.get({ plain: true });
}

/** Unread totals for the header badge. */
async function unreadCount({ user }) {
  const participants = await ConversationParticipant.findAll({
    where: { userId: user.id, unreadCount: { [Op.gt]: 0 } },
    attributes: ['unreadCount'],
    raw: true,
  });
  return { unreadTotal: participants.reduce((acc, row) => acc + Number(row.unreadCount), 0), conversations: participants.length };
}

module.exports = {
  startConversation,
  listConversations,
  getConversation,
  listMessages,
  sendMessage,
  markRead,
  addParticipantsToConversation,
  archive,
  unreadCount,
  participantIdsForPatient,
  addParticipants,
  assertParticipant,
};
