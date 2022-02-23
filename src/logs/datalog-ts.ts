interface log {
  title: string;
  message: string;
}

export const messagesLog:log[] = [];
export const errorsLog:log[] = [];

export const logMessage = ({ title, message }:log):void => {
  messagesLog.push({ title, message });
};

export const logError = ({title, message}:log):void => {
  errorsLog.push({ title, message });
};

export default {
  messagesLog,
  errorsLog,
  logError,
  logMessage,
};
