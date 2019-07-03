const chalk = require('chalk');
const {logError} = require('../logs/datalog');

const url ='https://www.kaggle.com/competitions';


const collectCompetitions = async (page) => {

	const collection = [];

	console.log('\n');
	console.log(chalk.green.bold('Collecting Competitions'));

	try {

		await page.goto(url);
		await page.waitFor('.smart-list__content');

		//get list of items
		const items = await page.$$('.smart-list__content > div > div');
		
		if (items.length == 0) {
			console.log(chalk.red('Scraping: Competition: List of items return 0'));
			logError('Scraping: Competition: List of items return 0');
			return null;
		}
		console.log(chalk.grey(`[${items.length}]`));

		//ranking
		let rank = 1;

		for (const item of items) {
			const isCompetion = await item.$('div > div:first-child > a');

			if (isCompetion) {
				const competition = await getDetails(item, rank);
				if (competition) {
					collection.push(competition);
					rank += 1; 	//update ranking
				}
			}

		}

		return collection;

	} catch(err) {
		console.log(`Scraping: Competition: Something is wrong with the scraping in Competions: ${err}`);
		logError(`Scraping: Competition: Something is wrong with the scraping in Competions: ${err}`);
		return null;
	}
};

const getDetails = async (item,rank) => {

	try {
		const title = await item.$eval('div > div:first-child > a', content => content.innerText);
		console.log(`:: ${title}`);

		const endpoint = await item.$eval('div > div:first-child > a', content => content.getAttribute('href'));
		const description = await item.$eval('div > div:first-child > p', content => content.innerText);
		const type = await item.$eval('div > div:first-child > div > span:first-child', content => content.innerText);
		const deadline = await item.$eval('div > div:first-child > div > span:last-child > span:nth-child(2)', content => content.getAttribute('title'));
		
		//some competions doens't have tags
		let tags = [];
		try {
			tags = await item.$eval('div > div:first-child > div > span:last-child > span:nth-child(3)', content => content.innerText);
			tags = tags.trim();
			tags = tags.split(', ');
		} catch (err) {
			tags = [];
		}

		const prize = await item.$eval('div > div:last-child > p', content => content.innerText);

		let teamsTotal = '';
		try {
			teamsTotal = await item.$eval('div > div .sc-cfHlVB > span', content => content.innerText);
			teamsTotal = teamsTotal.split(' ')[0];
			teamsTotal = teamsTotal.replace(/,/g, '');
		} catch (err) {
			teamsTotal = '';
		}

		//return object 
		return {
			title,
			endpoint,
			description,
			deadline,
			type,
			tags,
			prize,
			teamsTotal,
			rank: {
				date: new Date(),
				rank: rank
			}
		};

	} catch (err) {
		console.log(`Scraping: Competion: Something is wrong with one of the competitions: ${err}`);
		logError(`Scraping: Competion: Something is wrong with one of the competitions: ${err}`);
		return null;
	}
};

module.exports = {
	collectCompetitions,
};