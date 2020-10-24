import chalk from 'chalk';
import puppeteer from 'puppeteer';

import mongoose from './db/mongoose.mjs';
import { sendLogEmail } from './emails/sendEmail.mjs';
import { scraper } from './scraper/scraper.mjs';

let targets = [
	// 'competitions',
	// 'datasets',
	'users'
];

const run = async () => {
	const date = new Date();
	console.log(chalk.blue(`Scraping Kaggle: ${date}`));

	if (await mongoose.connect()) await scrape();

	// await sendEmail(); //send log email

	//done
	mongoose.close();
	console.log(chalk.blue('\nDone'));
};

const scrape = async () => {
	// lunch puppeteer
	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: {
			width: 1000,
			height: 800,
		},
	});

	console.log(chalk.gray('Puppeteer Launched'));

	// open new tab
	const page = await browser.newPage();

	//loop through the pages to scrape
	for await (const target of targets) {
		await scraper(target, page);
	}

	// close pupeteer and mongoose
	await page.waitForTimeout(3 * 1000);
	await browser.close();
};

const sendEmail = async () => {
	await sendLogEmail().catch((error) => {
		console.log(`Email not sent: ${error}`);
		return;
	});
};

run();
