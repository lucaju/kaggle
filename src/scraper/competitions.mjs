import chalk from 'chalk';
import { logError } from '../logs/datalog.mjs';

const url = 'https://www.kaggle.com/competitions';

export const collectCompetitions = async (page) => {
	const collection = [];

	console.log('\n');
	console.log(chalk.green.bold('Collecting Competitions'));

	try {
		await page.goto(url);
		await page.waitForSelector('#site-content');

		//get list of items
		const list = await page.$$(
			'#site-content > div:nth-child(2) > div > div:nth-child(3) > div:nth-child(3) > ul > li:nth-child(odd)'
		);

		if (list.length === 0) {
			const msg = {
				title: 'Scraping',
				message: 'Competition: List of items return 0',
			};
			console.log(msg);
			logError(msg);
			return [];
		}

		console.log(chalk.grey(`[${list.length}]`));

		//loop through items
		for await (const item of list) {
			const competition = await getDetails(item);
			if (competition) collection.push(competition);
		}

		return collection;
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

const getDetails = async (item) => {
	try {
		const title = await item.$eval(
			'a > span:nth-child(2) > div:first-child',
			(content) => content.innerText
		);
		console.log(`:: ${title}`);

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
			endpoint,
			shortDescription,
			category: metadata.category,
			relativeDeadline: metadata.relativeDeadline,
			subCategory: metadata.subCategory,
			teams: metadata.teams,
			prize,
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
