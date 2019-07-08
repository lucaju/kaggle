const messagesLog = [];
const errorsLog = [];

const logMessage = (title,message) => {
	messagesLog.push({
		title,
		message
	});
};

const logError = (title,message) => {
	errorsLog.push({
		title,
		message
	});
};

module.exports = {
	messagesLog,
	errorsLog,
	logError,
	logMessage
};