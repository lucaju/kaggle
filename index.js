const chalk = require('chalk');
const {DateTime} = require('luxon');
const puppeteer = require('puppeteer');
// const util = require('util');
const {collectDatasets} = require('./scraper/datasets.js');
const {collectUsers} = require('./scraper/users.js');
const {collectCompetitions} = require('./scraper/competitions.js');


const targets = [
	{
		name: 'datasets',
		url: 'https://www.kaggle.com/datasets'
	},
	{
		name: 'competitions',
		url: 'https://www.kaggle.com/competitions'
	},
	{
		name: 'users',
		url: 'https://www.kaggle.com/rankings'
	}
];

let browser;


const run = async () => {

	const now = DateTime.local();
	console.log(chalk.yellow(`Scraping Kaggle: ${now.toFormat('yyyy LLL dd')}`));

	//lunch puppeteer
	browser = await puppeteer.launch({
		headless: true,
		defaultViewport: {
			width: 1200,
			height: 1000
		},
	});
	console.log(chalk.blue('Puppeteer Launched'));

	//open new tab
	const page = await browser.newPage();

	//loop through the pages to scrape
	for (const target of targets) {
		if (target.name == 'datasets') {
			await collectDatasets(page, target.url);
		} else if (target.name == 'competitions') {
			await collectCompetitions(page,target.url);
		} else if (target.name == 'users') {
			await collectUsers(page,target.url);
		}
	}


	//done
	console.log('\n');
	console.log(chalk.blue('Done'));
	await page.waitFor(0.5 * 1000);
	await browser.close();
	await page.waitFor(0.5 * 1000);
};




run();