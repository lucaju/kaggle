require('dotenv').config();
const chalk = require('chalk');
const puppeteer = require('puppeteer');

const mongoose = require('./src/db/mongoose');

const {sendLogEmail} = require('./src/emails/sendEmail');

const {collectDatasets} = require('./src/scraper/datasets');
const {collectUsers} = require('./src/scraper/users');
const {collectCompetitions} = require('./src/scraper/competitions');

const {addRanking} = require('./src/router/ranking');



const targets = [
	'datasets',
	'competitions',
	'users'
];

const run = async () => {

	const date = new Date();
	console.log(chalk.blue(`Scraping Kaggle: ${date}`));

	if (await mongoose.connect()) await scrape();

	//send log email
	sendEmail();

	//done
	console.log(chalk.blue('\nDone'));
	
};

const scrape = async () => {

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
		const collection = await getCollection(target,page);
		if (collection) await addRanking(target,collection);
	}

	// close pupeteer and mongoose
	await page.waitFor(0.2 * 1000);
	await browser.close();
	mongoose.close();
};

const getCollection = async (target, page) => {

	let collection = [];

	if (target == 'datasets') {
		collection = await collectDatasets(page);
	} else if (target == 'competitions') {
		collection = await collectCompetitions(page);
	} else if (target == 'users') {
		collection = await collectUsers(page);		
	}

	return collection;
};


const sendEmail = async () => {
	try {
		await sendLogEmail();
		console.log('Log email sent.');
	} catch (err) {
		console.log(`Email not sent: ${err}`);
	}
};

run();