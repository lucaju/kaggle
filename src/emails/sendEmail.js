const sgMail = require('@sendgrid/mail');
const {messagesLog,errorsLog} = require('../logs/datalog');

// sgMail.setApiKey(process.env.SENDGRID_API_KEY)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendLogEmail = () => {

	let date = new Date();
	date = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;

	const msg = composeMessage(date);

	sgMail.send({
		to: 'luciano@fluxo.art.br',
		from: 'lucaju@gmail.com',
		subject: `{App: Kaggle Scraper - ${date}}`,
		html: msg
	});
};

const composeMessage = (date) => {

	const title = `Scraping Kaggle: ${date}`;

	const msgs = getMessages('Logs', messagesLog);
	const error = getMessages('Erros', errorsLog);

	return `
	<body>
		<h2>${title}</h2>
		<div>${msgs}</div>
		<div>${error}</div>
	</body>
	`;

};

const getMessages = (type,messages) => {

	let html = '';

	if (messages.length > 0) {
		html = `<h4>${type}</h4>`;
		for (const msg of messages) {
			html += `<p>${msg}</p>`;
		}
	}

	return html;
};


module.exports = {
	sendLogEmail
};