/** Extracts the client IP address, honouring a trusted proxy header. */
const getIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
};

const getUserAgent = (req) => req.headers['user-agent'] || null;

module.exports = { getIp, getUserAgent };