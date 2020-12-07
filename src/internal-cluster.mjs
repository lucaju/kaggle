import chalk from 'chalk';
import fs from 'fs-extra';
import jsonfile from 'jsonfile';
import { Cluster } from 'puppeteer-cluster';
import mongoose from './db/mongoose.mjs';
import Competition from './models/competition.mjs';
import Dataset from './models/dataset.mjs';
import User from './models/user.mjs';
import { config } from './scraper/internal/config.mjs';
import { scraper } from './scraper/internal/competition.mjs';
import Spinnies from 'spinnies';

const target = config.targets[0];
const errorLog = [];
// const spinnies = new Spinnies({
// 	color: 'cyan'
// });

const cluterConfig = {
	concurrency: Cluster.CONCURRENCY_BROWSER,
	maxConcurrency: 10,
	puppeteerOptions: {
		defaultViewport: {
			width: 1000,
			height: 800,
		},
	},
	retryLimit: 1,
	retryDelay: 10000,
	sameDomainDelay: 4000,
	timeout: 300000,
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
	cluster.on('taskerror', (error, data, willRetry) => {
		if (willRetry) {
			console.warn(
				`Encountered an error while crawling ${data.uri}. ${error.message}\nThis job will be retried`
			);
		} else {
			errorLog.push({
				date: new Date(),
				error,
				title: data.title,
				uri: data.uri
			});
		}
	});

	await cluster.task(async ({ page, data: item }) => {
		// spinnies.add(item.uri, { text: `Collecting: ${item.title}` });
		await scraper({item, target , page});
		// spinnies.succeed(item.uri, { text: `Colleted: ${item.title}` });
	});

	//get collection and add titems to to the queue line
	const collection = await getCollection();
	// console.log(collection);
	
	collection.map((entry) => {
		entry.url = entry.uri;
		cluster.queue(entry);
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
