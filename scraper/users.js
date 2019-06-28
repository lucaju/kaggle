const chalk = require('chalk');
const {DateTime} = require('luxon');

const collectUsers = async (page, url) => {

	const collection = [];

	console.log('\n');
	console.log(chalk.green('Collecting Users'));

	await page.goto(url);
	// await page.waitFor(1 * 1000);
	await page.waitFor('.leaderboards__item-wrapper');

	//get list of items
	const items = await page.$$('.leaderboards__item-wrapper');

	//remove header
	items.shift();


	for (const item of items) {
		let rank = await item.$eval('.leaderboards__rank', content => content.innerHTML);
		rank = parseFloat(rank);

		const tier = await item.$eval('.leaderboards__tier > img', content => content.getAttribute('title'));
		const name = await item.$eval('.leaderboards__name > p > a', content => content.innerHTML);
		console.log(`:: ${name}`);
		const endpoint = await item.$eval('.leaderboards__name > p > a', content => content.getAttribute('href'));
		const joined = await item.$eval('.leaderboards__name-joined > span', content => content.getAttribute('title'));

		let points = await item.$eval('.leaderboards__points', content => content.innerHTML);
		points = parseFloat(points.replace(/,/g, ''));


		let gold = await item.$eval('.leaderboards__medal--gold', content => content.lastChild.innerText);
		gold = parseFloat(gold);

		let silver = await item.$eval('.leaderboards__medal--silver', content => content.lastChild.innerText);
		silver = parseFloat(silver);

		let bronze = await item.$eval('.leaderboards__medal--bronze', content => content.lastChild.innerText);
		bronze = parseFloat(bronze);

		//parse date
		const joinedArray = joined.split(' ');
		const joinedLuxon = DateTime.fromFormat(`${joinedArray[1]} ${joinedArray[2]} ${joinedArray[3]}`, 'LLL dd yyyy');
		const joinedDate = joinedLuxon.toFormat('yyyy LLL dd');


		const user = {
			rank,
			tier,
			name,
			endpoint,
			joinedLuxon,
			joinedDate,
			points,
			medals: {
				gold,
				silver,
				bronze
			}
		};

		collection.push(user);

	}

	// console.log(collection);

	return collection;
};

module.exports = {
	collectUsers,
};