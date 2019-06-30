const chalk = require('chalk');
const puppeteer = require('puppeteer');

const mongoose = require('./src/db/mongoose');

const {sendLogEmail} = require('./src/emails/sendEmail');

const {collectDatasets} = require('./src/scraper/datasets');
const {collectUsers} = require('./src/scraper/users');
const {collectCompetitions} = require('./src/scraper/competitions');

const {addUsers} = require('./src/router/user');
const {addDatasets} = require('./src/router/dataset');
const {addCompetitions} = require('./src/router/competition');

const targets = [
	'datasets',
	'competitions',
	'users'
];

const sendEmail = true;

const run = async () => {

	const date = new Date();
	console.log(chalk.blue(`Scraping Kaggle: ${date}`));
	

	//lunch puppeteer
	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: {
			width: 1200,
			height: 1000
		},
	});

	console.log(chalk.gray('Puppeteer Launched'));

	//open new tab
	const page = await browser.newPage();

	//loop through the pages to scrape
	for (const target of targets) {
		if (target == 'datasets') {
			const collection = await collectDatasets(page);
			if (collection) await addDatasets(collection);
		} else if (target == 'competitions') {
			const collection = await collectCompetitions(page);
			if (collection) await addCompetitions(collection);
		} else if (target == 'users') {
			const collection = await collectUsers(page);
			if (collection) await addUsers(collection);
		}
	}


	// close pupeteer and mongoose
	await page.waitFor(0.2 * 1000);
	await browser.close();
	mongoose.close();

	//send log email
	if (sendEmail) {
		try {
			await sendLogEmail();
			console.log('Log email sent.');
		} catch (err) {
			console.log(`Email not sent: ${err}`);
		}
	}

	//done
	console.log('\n');
	console.log(chalk.blue('Done'));
	
};


run();