const chalk = require('chalk');
const {logError} = require('../logs/datalog');

const url ='https://www.kaggle.com/rankings';

const collectUsers = async page => {

	const collection = [];

	console.log('\n');
	console.log(chalk.green.bold('Collecting Users'));

	try {

		//load page
		await page.goto(url);
		await page.waitFor('.leaderboards__item-wrapper');

		//get list of items
		const items = await page.$$('.leaderboards__item-wrapper');
		console.log(chalk.grey(`[${items.length}]`));
	
		items.shift(); //remove header

		for (const item of items) {
			const user = await getDetails(item);
			if (user) collection.push(user);
		}

		return collection;

	} catch(err) {
		console.log(`Scraping: Users: Something is wrong with the scraping in Users: ${err}`);
		logError('Scraping',`Users: Something is wrong with the scraping in Users: ${err}`);
		return null;
	}
};

const getDetails = async item => {

	try {

		let rank = await item.$eval('.leaderboards__rank', content => content.innerHTML);
		rank = parseFloat(rank);

		const tier = await item.$eval('.leaderboards__tier > img', content => content.getAttribute('title'));
		const name = await item.$eval('.leaderboards__name > p > a', content => content.innerHTML);
		console.log(`:: ${name}`);
		const endpoint = await item.$eval('.leaderboards__name > p > a', content => content.getAttribute('href'));
		const joinedDate = await item.$eval('.leaderboards__name-joined > span', content => content.getAttribute('title'));

		let points = await item.$eval('.leaderboards__points', content => content.innerHTML);
		points = parseFloat(points.replace(/,/g, ''));

		let gold = await item.$eval('.leaderboards__medal--gold', content => content.lastChild.innerText);
		gold = parseFloat(gold);

		let silver = await item.$eval('.leaderboards__medal--silver', content => content.lastChild.innerText);
		silver = parseFloat(silver);

		let bronze = await item.$eval('.leaderboards__medal--bronze', content => content.lastChild.innerText);
		bronze = parseFloat(bronze);

		//return object 
		return {
			name,
			endpoint,
			joinedDate,
			tier,
			points,
			medals: {
				gold,
				silver,
				bronze
			},
			rank
			// rank: {
			// 	date: new Date(),
			// 	rank,
			// }
			
		};

	} catch (err) {
		console.log(`Scraping: User: Something is wrong with one of the users: ${err}`);
		logError('Scraping',`User: Something is wrong with one of the users: ${err}`);
		return null;
	}
};

module.exports = {
	collectUsers,
};