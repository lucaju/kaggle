const chalk = require('chalk');

const collectCompetitions = async (page, url) => {

	const collection = [];

	console.log('\n');
	console.log(chalk.green('Collecting competitions'));

	await page.goto(url);
	// await page.waitFor(1 * 1000);
	await page.waitFor('.smart-list__content');

	//get list of items
	const items = await page.$$('.smart-list__content .sc-istKyD');
	console.log(items.length);

	for (const item of items) {
		
		const title = await item.$eval('div > div:first-child > a', content => content.innerText);
		console.log(`:: ${title}`);

		const endpoint = await item.$eval('div > div:first-child > a', content => content.getAttribute('href'));
		const description = await item.$eval('div > div:first-child > p', content => content.innerText);
		const type = await item.$eval('div > div:first-child > div > span:first-child', content => content.innerText);
		const date = await item.$eval('div > div:first-child > div > span:last-child > span:nth-child(2)', content => content.getAttribute('title'));
		
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
			teamsTotal = await item.$eval('div > div .sc-iHBgdc > span', content => content.innerText);
			teamsTotal = teamsTotal.split(' ')[0];
			
			teamsTotal = parseFloat(teamsTotal.replace(/,/g, ''));
		} catch (err) {
			teamsTotal = '';
		}

		//put into an object 
		const competition = {
			title,
			endpoint,
			description,
			type,
			date,
			tags,
			prize,
			teamsTotal
		};

		//add to array
		collection.push(competition);
	}

	// console.log(collection);

	return collection;
};


module.exports = {
	collectCompetitions,
};