export const messagesLog = [];
export const errorsLog = [];

export const logMessage = ({ title, message }) => {
  messagesLog.push({ title, message });
};

export const logError = (title, message) => {
  errorsLog.push({ title, message });
};

export default {
  messagesLog,
  errorsLog,
  logError,
  logMessage,
};
