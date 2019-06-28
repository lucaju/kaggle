const chalk = require('chalk');

const collectDatasets = async (page, url) => {

	const collection = [];

	console.log('\r');
	console.log(chalk.green('Collecting Datasets'));

	await page.goto(url);
	// await page.waitFor(1 * 1000);
	await page.waitFor('.datasets__list-wrapper');

	//get list of items
	const items = await page.$$('.datasets__list-wrapper ul li');

	for (const item of items) {

		//Scrape the main info
		const title = await item.$eval('div > div > h3', content => content.innerHTML);
		console.log(`:: ${title}`);

		const owner = await item.$eval('div > div > div > a > span ', content => content.innerText);
		const endpoint = await item.$eval('a', content => content.getAttribute('href'));
		const userEndpoint = await item.$eval('div > div > div > a', content => content.getAttribute('href'));

		let size = await item.$eval('div > div > div:last-child > span:nth-child(2)', content => content.innerText);
		size = size.split(' ');
		
		const sizeUnit = size[1];
		let fileSize = parseFloat(size[0]);

		//convert file size
		if (sizeUnit.toLowerCase() == 'mb') {
			fileSize = fileSize * 1024;
		} else if (sizeUnit.toLowerCase() == 'gb') {
			fileSize = fileSize * 1024 * 1024;
		} else if (sizeUnit.toLowerCase() == 'tb') {
			fileSize = fileSize * 1024 * 1024 * 1024;
		}

		let usability = await item.$eval('div > div > div:last-child > div > span', content => content.innerText);
		usability = parseFloat(usability.replace(/,/g, ''));

		let files = await item.$eval('div > div > div:last-child > span:nth-child(4)', content => content.innerText);
		let numFiles = files.match(/\d+/g);
		numFiles = numFiles[0];
		numFiles = parseFloat(numFiles);

		let fileTypes = files.match(/\(.*?\)/g);
		fileTypes = fileTypes[0].match(/[a-zA-Z]+/g);

		files = {
			numFiles,
			fileTypes
		};

		let upvotes = await item.$eval('div > div > div:last-child > span:nth-child(5)', content => content.innerText);
		upvotes = upvotes.split(' ');
		upvotes = upvotes[0];
		upvotes = parseFloat(upvotes);

		//------details
		// Mouse over to show "quick Look" button > click button to open modal
		const itemBox = await item.boundingBox();
		await page.mouse.move(itemBox.x + (itemBox.width/2), itemBox.y + (itemBox.height/2));
		await page.waitFor(0.5 * 1000);

		//button
		await page.click('button[data-testid]');
		// await page.waitFor(0.5 * 1000);
		await page.waitFor('div .mdc-dialog__surface');

		//modal
		const description = await page.$eval('div .mdc-dialog__surface > div .sc-fQkuQJ', content => content.innerText);

		const modalMeta = await page.$('div .mdc-dialog__surface > div .sc-cCVOAp');
		
		let createdAt = await modalMeta.$eval('span:nth-of-type(1)', content => content.innerText);
		createdAt = createdAt.split('\n')[1];

		let modifieddAt = await modalMeta.$eval('span:nth-of-type(2)', content => content.innerText);
		modifieddAt = modifieddAt.split('\n')[1];

		const license = await modalMeta.$eval('span:nth-of-type(3) > span:nth-of-type(2)', content => content.innerText);
		const tags = await modalMeta.$$eval('span:nth-of-type(4) div div', content => content.map(n => n.innerText));

		//close modal
		await page.keyboard.press('Escape');
		// ------

		//put into an object 
		const dataset = {
			title,
			description,
			owner,
			endpoint,
			userEndpoint,
			fileSize,
			usability,
			files,
			upvotes,
			createdAt,
			modifieddAt,
			license,
			tags,
		};

		//add to array
		collection.push(dataset);

		await page.waitFor(0.5 * 1000);
		page.evaluate( () => {
			window.scrollBy(0, 89);
		});

	}

	//log collection
	// console.log(collection);

	return collection;
};


module.exports = {
	collectDatasets,
};