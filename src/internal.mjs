import chalk from 'chalk';
import puppeteer from 'puppeteer';
import { config } from './scraper/internal/config.mjs';
import mongoose from './db/mongoose.mjs';
import { scraper } from './scraper/internal/scraper.mjs';
import Competition from './models/competition.mjs';
import Dataset from './models/dataset.mjs';
import User from './models/user.mjs';

const target = config.targets[0];

const run = async () => {
	const date = new Date();
	console.log(chalk.blue(`Scraping Kaggle: ${date}`));

	if (await mongoose.connect()) await scrape();

	//done
	mongoose.close();
	console.log(chalk.blue('\nDone'));
};

const scrape = async () => {
	// lunch puppeteer
	const browser = await puppeteer.launch({
		headless: config.puppeteer.headless || false,
		defaultViewport: {
			width: 1000,
			height: 800,
		},
	});

	console.log(chalk.gray('Puppeteer Launched'));

	// open new tab
	const page = await browser.newPage();

	//get collection
	// const collection = getCollection();

	const collection = [{
		_id: '5f9ed799ddf09403b7eb076a',
		title: 'Riiid! Answer Correctness Prediction',
		uri: 'https://www.kaggle.com/c/riiid-test-answer-prediction',
		// uri: 'https://www.kaggle.com/c/mastercard-data-cleansing-competition-finals',
		// uri: 'https://www.kaggle.com/c/cdp-unlocking-climate-solutions',
		// uri: 'https://www.kaggle.com/c/prediction-of-music-genres',
		shortDescription: 'Track knowledge states of 1M+ students in the wild',
		prize: '$100,000',
		active: true,
		inClass: false,
		category: 'Featured',
		relativeDeadline: '2 months to go',
		subCategory: 'Code Competition',
		teams: 1368,
	}];

	console.log(chalk.green.bold('\nCOMPETITIONS'));

	// loop through the pages to scrape
	for await (const item of collection) {
		await scraper({item, target}, page);
	}

	// close pupeteer and mongoose
	await page.waitForTimeout(1000);
	await browser.close();
};

const getCollection = async () => {
	let collection;
	console.log(config.target);
	if (target.name === 'competition')
		collection = await Competition.find(config.filter).limit(config.limit);
	if (target.name === 'dataset')
		collection = await Dataset.find(config.filter).limit(config.limit);
	if (target.name === 'user')
		collection = await User.find(config.filter).limit(config.limit);
	console.log(collection.length);
	return collection;
};

run();
