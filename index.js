const chalk = require('chalk');
const {DateTime} = require('luxon');
const puppeteer = require('puppeteer');
// const util = require('util');
const mongoose = require('./src/db/mongoose');

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
let browser;

const run = async () => {

	const now = DateTime.local();
	console.log(chalk.blue(`Scraping Kaggle: ${now.toFormat('yyyy LLL dd')}`));

	//lunch puppeteer
	browser = await puppeteer.launch({
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
			await addDatasets(collection);
		} else if (target == 'competitions') {
			const collection = await collectCompetitions(page);
			await addCompetitions(collection);
		} else if (target == 'users') {
			const collection = await collectUsers(page);
			await addUsers(collection);
		}
	}


	//done
	console.log('\n');
	console.log(chalk.blue('Done'));
	await page.waitFor(0.5 * 1000);
	await browser.close();

	mongoose.close();
};




run();