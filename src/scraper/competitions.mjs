import chalk from 'chalk';
import emoji from 'node-emoji';
import { logError } from '../logs/datalog.mjs';
import { saveCompetition } from '../router/competition.mjs';
import { clearStdout } from './scraper.mjs';

const url = 'https://www.kaggle.com/competitions';
let page;

export const collectCompetitions = async (browserPage) => {
	//start
	page = browserPage;

	let collection = [];

	console.log(chalk.green.bold('\nCompetitions'));

	const tabs = ['active', 'completed', 'in-class'];

	for await (const tab of tabs) {
		// navigate to URL (refresh each time) and wait content to load
		await page.goto(url);
		await page.waitForSelector('#site-content');

		const list = await getList(tab);

		for await (const item of list) {
			const competition = await getDetails(item, tab);
			if (!competition) continue;
			await save(competition);
			collection = [...collection, competition];
		}
	}

	return collection;
};

const getList = async (tab) => {
	console.log(chalk.green.bold(`\n${emoji.get('trophy')} Collecting ${tab} Competitions`));

	try {
		//Cange Tab
		if (tab !== 'active') {
			const nav = await page.$(
				'#site-content > div:nth-child(2) > div > div:nth-child(3) > nav'
			);
			await changeTab(nav, tab);
		}

		//SCROLL TO LOAD DATA
		const container = await page.$(
			'#site-content > div:nth-child(2) > div > div:nth-child(3) > div:nth-child(3) > ul'
		);
		const list = scroll(container);

		if (list.length === 0) {
			processError('Completed Competition: List of items return 0');
			return [];
		}

		return list;
	} catch (error) {
		processError(error);
		return null;
	}
};

const changeTab = async (nav, tab) => {
	// Click on "completed" Button to show list of completed competitions
	console.log(chalk.yellow(`- Click to switch to "${tab}" competitions`));

	let tabChild = '';
	if (tab === 'completed') tabChild = '2';
	if (tab === 'in-class') tabChild = '3';

	if (tabChild === '') return;

	const tabToClick = await nav.$(`div:first-child > button:nth-child(${tabChild})`);
	const boundingBox = await tabToClick.boundingBox();
	await page.mouse.click(
		boundingBox.x + boundingBox.width / 2,
		boundingBox.y + boundingBox.height / 2
	);
	await page.waitForTimeout(1 * 1000);

	return nav;
};

const scroll = async (container) => {
	console.log(chalk.yellow('- Scrolling to Load...'));

	const boundingBox = await container.boundingBox();
	const height = boundingBox.height;

	let list = await container.$$('li:nth-child(odd)');

	let prevListLengh = 0;
	const dot = '.';
	let scrollN = 1;

	while (list.length > prevListLengh) {
		console.log(chalk.yellow(dot.repeat(scrollN)));
		scrollN += 1;

		prevListLengh = list.length;

		await page.mouse.wheel({ deltaY: height });
		await page.waitForTimeout(2000);

		list = await container.$$('li:nth-child(odd)');
	}

	console.log(chalk.grey(`[${list.length}]`));

	await page.waitForTimeout(500);
	return list;
};

const getDetails = async (item, tab) => {
	try {
		const title = await item.$eval(
			'a > span:nth-child(2) > div:first-child',
			(content) => content.innerText
		);

		const endpoint = await item.$eval('a', (content) => content.getAttribute('href'));
		const shortDescription = await item.$eval(
			'a > span:nth-child(2) > span',
			(content) => content.innerText
		);

		const metadata = {};
		let meta = await item.$eval(
			'a > span:nth-child(2) > span:nth-child(3)',
			(content) => content.innerText
		);

		if (meta) {
			meta = meta.trim();
			meta = meta.split('•');

			metadata.category = meta[0].trim();
			metadata.relativeDeadline = meta[1].trim();

			if (meta.length > 2) {
				let subCatPos = 2;
				let teamPos = 3;

				if (meta.length === 3) teamPos = 2;
				if (meta.length === 4) metadata.subCategory = meta[subCatPos].trim();

				metadata.teams = meta[teamPos].trim().split(' ')[0].trim();
			}
		}

		const prize = await item.$eval('div:nth-child(2)', (content) => content.innerText);

		const competition = {
			title,
			uri: `https://www.kaggle.com${endpoint}`,
			shortDescription,
			category: metadata.category,
			relativeDeadline: metadata.relativeDeadline,
			subCategory: metadata.subCategory,
			teams: metadata.teams,
			prize,
		};

		competition.active = tab === 'active' ? true : false;
		competition.inClass = tab === 'in-class' ? true : false;

		return competition;
	} catch (error) {
		processError(error);
		return null;
	}
};

const save = async (competition) => {
	let logMsg = '';
	const data = await saveCompetition(competition);

	if (data.error) {
		logMsg = data.error;
		return;
	}

	const updatedEmoji = data.status === 'updated' ? emoji.get('recycle') : '';
	logMsg = `${emoji.get('sunny')} ${updatedEmoji} :: ${competition.title}\r\n`;

	clearStdout();
	process.stdout.write(logMsg);

	return competition;
};

const processError = (error) => {
	const msg = {
		title: 'Scraping Competion',
		message: error,
	};
	console.log(msg);
	logError(msg);
};

export default {
	collectCompetitions,
};
