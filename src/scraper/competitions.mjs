import chalk from 'chalk';
import emoji from 'node-emoji';
import { logError } from '../logs/datalog.mjs';
import { saveCompetition } from '../router/competition.mjs';


const url = 'https://www.kaggle.com/competitions';

export const collectCompetitions = async (page) => {

	//start
	let collection = [];

	console.log('\n');
	console.log(chalk.green.bold('Competitions'));

	// navigate to URL and waait content to load
	await page.goto(url);
	await page.waitForSelector('#site-content');

	// Colletct active competitions
	const listActiveCompetitions = await getListActiveCommpetitions(page);
	const activeCompetitions = await getCompetitions(listActiveCompetitions);
	collection = [ ...collection, activeCompetitions];

	// Colletct completed competitions
	const listCompletedCompetitions = await getListCompletedCommpetitions(page);
	const completedCompetitions = await getCompetitions(listCompletedCompetitions);
	collection = [ ...collection, completedCompetitions];

	return collection;

};

const getListActiveCommpetitions = async (page) => {
	console.log('\n');
	console.log(chalk.green.bold(`Collecting Active Competitions ${emoji.get('trophy')}`));

	try {

		//get Active Competitions of items
		const list = await page.$$(
			'#site-content > div:nth-child(2) > div > div:nth-child(3) > div:nth-child(3) > ul > li:nth-child(odd)'
		);

		if (list.length === 0) {
			const msg = {
				title: 'Scraping',
				message: 'Active Competition: List of items return 0',
			};
			console.log(msg);
			logError(msg);
			return [];
		}

		console.log(chalk.grey(`[${list.length}]`));

		return list;

	} catch (error) {
		const msg = {
			title: 'Scraping',
			message: `Something is wrong with the scraping in Competions: ${error}`,
		};
		console.log(msg);
		logError(msg);
		return null;
	}
};

const getListCompletedCommpetitions = async (page) => {
	// let collection s= [];

	console.log('\n');
	console.log(chalk.green.bold('Collecting Completed Competitions'));


	try {

		// Click on "completed" Button to show list of completed competitions
		console.log(chalk.yellow('Click to switch to "completed competitions"'));
		const completedTabButton = await page.$('#site-content > div:nth-child(2) > div > div:nth-child(3) > nav > div:first-child > button:nth-child(2)');
		const buttonBoundingBox = await completedTabButton.boundingBox();	
		await page.mouse.click(
			buttonBoundingBox.x + buttonBoundingBox.width / 2,
			buttonBoundingBox.y + buttonBoundingBox.height / 2
		);
		await page.waitForTimeout(1 * 1000);


		//SCROLL TO LOAD DATA
		console.log(chalk.yellow('Scrolling to Load...'));

		const container = await page.$(
			'#site-content > div:nth-child(2) > div > div:nth-child(3) > div:nth-child(3) > ul'
		);
		const containerBoundingBox = await container.boundingBox();	
		const height = containerBoundingBox.height;

		let list = await container.$$(
			'li:nth-child(odd)'
		);

		let prevListLengh = 0;

		let i = 1;
		const dot = '.';

		console.log(chalk.yellow('.'));

		// console.log(list.length);
		// console.log(containerBoundingBox);

		while (list.length > prevListLengh) {
			i += 1;
			console.log(chalk.yellow(dot.repeat(i)));

			prevListLengh = list.length;

			await page.mouse.wheel({ deltaY: height });
			await page.waitForTimeout(2000);

			list = await container.$$(
				'li:nth-child(odd)'
			);

			// console.log(list.length,prevListLengh);
			// await page.waitForTimeout(1000);

		}


		await page.waitForTimeout(1000);


		if (list.length === 0) {
			const msg = {
				title: 'Scraping',
				message: 'Completed Competition: List of items return 0',
			};
			console.log(msg);
			logError(msg);
			return [];
		}

		console.log(chalk.grey(`[${list.length}]`));

		//loop through items
		// for await (const item of list) {
		// 	const competition = await getDetails(item, false);
		// 	if (competition) collection.push(competition);
		// }

		return list;

	} catch (error) {
		const msg = {
			title: 'Scraping',
			message: `Something is wrong with the scraping in Competions: ${error}`,
		};
		console.log(msg);
		logError(msg);
		return null;
	}
};

const getCompetitions = async (list) => {
	//loop through items
	for await (const item of list) {
		const competition = await getDetails(item, false);
		let logMsg = '';

		if (competition) {

			const data = await saveCompetition(competition);
			
			if (data.error) {
				logMsg = data.error;
				return;
			}

			const updatedEmoji = (data.status === 'updated') ? emoji.get('recycle') : '';
			logMsg = `${emoji.get('sunny')} ${updatedEmoji} :: ${competition.title}\r`;

		} else {
			logMsg = `${emoji.get('kull_and_crossbones')} :: ${competition.title}\r`;
		}

		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(logMsg);
		process.stdout.write('\n');
	}
};

const getDetails = async (item, active) => {
	try {
		const title = await item.$eval(
			'a > span:nth-child(2) > div:first-child',
			(content) => content.innerText
		);

		process.stdout.write(`:: ${title}`);

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

		return {
			title,
			uri: `https://www.kaggle.com${endpoint}`,
			shortDescription,
			category: metadata.category,
			relativeDeadline: metadata.relativeDeadline,
			subCategory: metadata.subCategory,
			teams: metadata.teams,
			prize,
			active
		};
	} catch (error) {
		const msg = {
			title: 'Scraping',
			message: `Competion: Something is wrong with one of the competitions: ${error}`,
		};
		console.log(msg);
		logError(msg);
		return null;
	}
};

export default {
	collectCompetitions,
};
