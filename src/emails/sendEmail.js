const sgMail = require('@sendgrid/mail');
const {messagesLog, errorsLog} = require('../logs/datalog');
const {DateTime} = require('luxon');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendLogEmail = () => {

	const date = DateTime.local().toLocaleString(DateTime.DATE_MED);

	let dynamic_template_data = getData();
	dynamic_template_data.date = date;
	
	sgMail.send({
		to: process.env.EMAIL_TO,
		from: process.env.EMAIL_FROM,
		subject: `{App: Kaggle Scraper - ${date}}`,
		templateId: 'd-e5e6be567871413796f160e0b1fc3523',
		dynamic_template_data,
	});
};

const getData = () => {

	const datasets = messagesLog.find( msg => msg.title == 'datasets');
	const datasetsAdded = datasets.message.filter( item => item.status == 'added');
	const datasetsUpdated = datasets.message.filter( item => item.status == 'updated');

	const competitions = messagesLog.find( msg => msg.title == 'competitions');
	const competitionsAdded = competitions.message.filter( item => item.status == 'added');
	const competitionsUpdated = competitions.message.filter( item => item.status == 'updated');

	const users = messagesLog.find( msg => msg.title == 'users');
	const usersAdded = users.message.filter( item => item.status == 'added');
	const usersUpdated = users.message.filter( item => item.status == 'updated');

	const db = {
		up: datasetsUpdated.length,
		add: datasetsAdded.length,
		showAdded: (datasetsAdded.length > 0) ? 'block' : 'none'
	};

	const cmp = {
		up: competitionsUpdated.length,
		add: competitionsAdded.length,
		showAdded: (competitionsAdded.length > 0) ? 'block' : 'none'
	};

	const usr = {
		up: usersUpdated.length,
		add: usersAdded.length,
		showAdded: (usersAdded.length > 0) ? 'block' : 'none'
	};

	const err = {
		erros: JSON.stringify(errorsLog),
		showErrors: (errorsLog.length > 0) ? 'block' : 'none'
	};

	return {
		db,
		cmp,
		usr,
		err,
	} ;

};


module.exports = {
	sendLogEmail
};