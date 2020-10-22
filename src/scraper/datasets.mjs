import chalk from 'chalk';
import emoji from 'node-emoji';
import { logError } from '../logs/datalog.mjs';
import { saveDataset } from '../router/dataset.mjs';
import { clearStdout } from './scraper.mjs';

const url = 'https://www.kaggle.com/datasets';
let page;

export const collectDatasets = async (browserPage) => {
	//start
	page = browserPage;

	console.log(chalk.green.bold('\nDATASETS'));

	const filtersBySize = [
		{
			from: { value: 50, unit: 'GB' },
			to: { value: 100, unit: 'GB' },
		},
	];

	for await (const query of filtersBySize) {
		// navigate to URL based on filter by size and wait content to load
		const { from, to } = query;
		const params = `?sizeStart=${from.value}%2C${from.unit}&sizeEnd=${to.value}%2C${to.unit}`;
		await page.goto(`${url}${params}`);

		console.log(
			chalk.green.bold(
				`\n${emoji.get('lollipop')} Collecting Datasets from query: ${from.value} ${
					from.unit
				} - ${to.value} ${to.unit}`
			)
		);

		await page.waitForSelector('#site-content');

		const list = await getList(query);

		for await (const item of list) {
			const dataset = await getDetails(item);
			if (!dataset) continue;
			await save(dataset);
		}
	}
};

const getList = async (query) => {
	try {
		//SCROLL TO LOAD DATA
		const container = await page.$(
			'#site-content > div:nth-child(2) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div > ul'
		);
		const list = scroll(container);

		if (list.length === 0) {
			processError(`Datasets: List of items return 0 (query:${query})`);
			return [];
		}

		return list;
	} catch (error) {
		processError(error);
		return null;
	}
};

const scroll = async (container) => {
	console.log(chalk.yellow('- Scrolling to Load...'));

	const boundingBox = await container.boundingBox();
	const height = boundingBox.height;

	let list = await container.$$('li:nth-child(odd)');

	let prevListLength = 0;
	const dot = '.';
	let scrollN = 1;

	// console.log(boundingBox);

	while (list.length > prevListLength) {
		// console.log(list.length, prevListLength);
		console.log(chalk.yellow(dot.repeat(scrollN)));
		scrollN += 1;

		prevListLength = list.length;

		await page.mouse.wheel({ deltaY: height });
		await page.waitForTimeout(2000);

		list = await container.$$('li:nth-child(odd)');
	}

	console.log(chalk.grey(`[${list.length}]`));

	await page.waitForTimeout(500);
	return list;
};

const getDetails = async (item) => {
	// try {
	const title = await item
		.$eval(
			'div:nth-child(2) > div:nth-child(2) > div:first-child',
			(content) => content.innerText
		)
		.catch((error) => processError(error));

	const endpoint = await item
		.$eval('a', (content) => content.getAttribute('href'))
		.catch((error) => processError(error));

	let medal = await item
		.$eval('div:nth-child(2) > div:nth-child(2) > div:first-child > img', (content) => {
			const src = content.getAttribute('src');
			if (!src) return null;
			let medalString = src.split('/')[5];
			medalString = medalString.split('l@')[0];
			return medalString;
		})
		.catch(() => null);

	const owner = await item
		.$eval(
			'div:nth-child(2) > div:nth-child(2) > span:nth-child(2)',
			(content) => content.innerText
		)
		.catch((error) => processError(error));

	const ownerEndpoint = await item
		.$eval('div:nth-child(2) > div:nth-child(2) > span:nth-child(2) > a', (content) =>
			content.getAttribute('href')
		)
		.catch((error) => processError(error));

	const details = await item
		.$('div:nth-child(2) > div:nth-child(2) > span:nth-child(3)')
		.catch((error) => processError(error));

	const uploadedAtRelative = await details
		.$eval('span:nth-child(1)', (content) => content.childNodes[1].nodeValue)
		.catch((error) => processError(error));

	const size = await details
		.$eval('span:nth-child(2)', (content) => content.childNodes[1].nodeValue)
		.catch((error) => processError(error));

	const usabilityScore = await details
		.$eval('div:nth-child(3) > span:nth-child(1)', (content) =>
			parseFloat(content.childNodes[1].nodeValue)
		)
		.catch((error) => processError(error));

	const files = await details
		.$eval('span:nth-child(4)', (content) => {
			const data = content.childNodes[1].nodeValue;
			const quantity = Number(data.split(' ')[0]);
			let types = data.match(/\b[^\d\W]+\b/g);
			return {
				numFiles: quantity,
				fileTypes: types,
			};
		})
		.catch((error) => processError(error));

	const tasks = await details
		.$eval('span:nth-child(5)', (content) => {
			const text = content.childNodes[1].nodeValue;
			const tasksNumber = Number(text.split('')[0]);
			return tasksNumber;
		})
		.catch(() => null);

	const upvotes = await item
		.$eval(
			'div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > button:nth-child(2)',
			(content) => Number(content.innerText)
		)
		.catch((error) => processError(error));

	const datatset = {
		title,
		uri: `https://www.kaggle.com${endpoint}`,
		owner,
		ownerUri: `https://www.kaggle.com${ownerEndpoint}`,
		uploadedAtRelative,
		size,
		usabilityScore,
		files,
		upvotes,
	};

	if (tasks) datatset.tasks = tasks;
	if (medal) datatset.medal = medal;

	return datatset;
};

const save = async (dataset) => {
	let logMsg = '';
	const data = await saveDataset(dataset);

	if (data.error) {
		logMsg = data.error;
		return;
	}

	const updatedEmoji = data.status === 'updated' ? emoji.get('recycle') : '';
	logMsg = `${emoji.get('sunny')} ${updatedEmoji} :: ${dataset.title}\r\n`;

	clearStdout();
	process.stdout.write(logMsg);

	return dataset;
};

const processError = (error) => {
	const msg = {
		title: 'Scraping Datasets',
		message: error,
	};
	console.log(msg);
	logError(msg);
};

export default {
	collectDatasets,
};
