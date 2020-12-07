import chalk from 'chalk';
import fs from 'fs-extra';
import jsonfile from 'jsonfile';
import { Cluster } from 'puppeteer-cluster';
import mongoose from './db/mongoose.mjs';
import Competition from './models/competition.mjs';
import Dataset from './models/dataset.mjs';
import User from './models/user.mjs';
import { config } from './scraper/internal/config.mjs';
import { scraper } from './scraper/internal/scraper.mjs';

const target = config.targets[0];
const errorLog = [];

const cluterConfig = {
	concurrency: Cluster.CONCURRENCY_CONTEXT,
	maxConcurrency: 5,
	puppeteerOptions: {
		defaultViewport: {
			width: 1000,
			height: 800,
		},
	},
	retryLimit: 1,
	retryDelay: 30000,
	sameDomainDelay: 4000,
	timeout: 120000,
	monitor: true,
	workerCreationDelay: 40,
};

const run = async () => {
	const date = new Date();
	console.log(chalk.blue(`Scraping Kaggle: ${date}`));

	if (await mongoose.connect()) await scrape();

	//done
	mongoose.close();
	console.log(chalk.blue('\nDone'));
};

const scrape = async () => {
	//launch
	const cluster = await Cluster.launch(cluterConfig);

	// Event handler to be called in case of problems
	cluster.on('taskerror', (error, data) => {
		errorLog.push({ date: new Date(), error, data });
	});

	await cluster.task(async ({ page, data: item }) => {
		// await page.goto(item.uri);
		// const pageTitle = await page.evaluate(() => document.title);
		// console.log(pageTitle);

		// throw new Error('Fake error');

		await scraper({ item, target }, page);
	});

	//get collection and add titems to to the queue line
	const collection = await getCollection();
	collection.map((item) => {
		item.url = item.uri;
		cluster.queue(item);
	});

	//
	await cluster.idle();
	await cluster.close();

	//log error if any
	if (errorLog.length > 0) saveToJson('cluster_error', errorLog);
};

const getCollection = async () => {
	let collection;
	if (target.name === 'competition')
		collection = await Competition.find(config.filter).limit(config.limit);
	if (target.name === 'dataset')
		collection = await Dataset.find(config.filter).limit(config.limit);
	if (target.name === 'user') collection = await User.find(config.filter).limit(config.limit);
	return collection;
};

const saveToJson = async (name, data) => {
	const folder = './log';
	const fileName = `${name}.json`;
	const jsonOptions = { spaces: 4 };

	//Save Json file
	if (!fs.existsSync(folder)) fs.mkdirSync(folder);
	await jsonfile.writeFile(`${folder}/${fileName}`, data, jsonOptions);
};

run();
