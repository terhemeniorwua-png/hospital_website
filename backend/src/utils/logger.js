/** Lightweight structured logger (stdout). Morgan uses the same format. */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;

const emit = (level, message, meta) => {
  if (LEVELS[level] > currentLevel) return;
  const line = { level, time: new Date().toISOString(), message, ...(meta ? { meta } : {}) };
  const output = JSON.stringify(line);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
};

module.exports = {
  error: (message, meta) => emit('error', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  info: (message, meta) => emit('info', message, meta),
  debug: (message, meta) => emit('debug', message, meta),
};