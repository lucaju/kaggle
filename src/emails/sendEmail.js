const sgMail = require('@sendgrid/mail');
const {messagesLog,errorsLog} = require('../logs/datalog');
const { DateTime } = require('luxon');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendLogEmail = () => {

	let date = DateTime.local().toLocaleString(DateTime.DATE_MED);

	const msg = composeEmail(date);

	sgMail.send({
		to: process.env.EMAIL_TO,
		from: process.env.EMAIL_FROM,
		subject: `{App: Kaggle Scraper - ${date}}`,
		html: msg
	});
};

const composeEmail = date => {

	const msgs = composeMessages(messagesLog);
	const error = composeMessages(errorsLog);

	let html = `
	<html>
	<body>
		<h1>Scraping Kaggle</h1>
		<h3>${date}</h3>
		<hr/>
	`;

	if (msgs) {
		html += `
		<h2>Messages</h2>
		<div>
			${msgs}
		</div>
		`;
	}

	if (error) {
		html += `
		<hr/>
		<h2>Errors</h2>
		<div>
			${error}
		</div>
		`;
	}

	html += `
	<hr/>
	</body>
	</html>
	`;

	return html;
};

const composeMessages = msgs => {

	if (msgs.length <= 0) return null;

	let html = '';

	for (const {title,message} of msgs) {
		html += `<p><strong>${title}</strong>: ${message}</p>\n`;
	}
	
	return html;

};


module.exports = {
	sendLogEmail
};