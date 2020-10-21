const chalk = require('chalk');
const {logError} = require('../logs/datalog');

const url ='https://www.kaggle.com/datasets';

const collectDatasets = async page => {

	const collection = [];

	console.log('\r');
	console.log(chalk.green.bold('Collecting Datasets'));

	try {

		//load page
		await page.goto(url);
		await page.waitFor('.DatasetList_Wrapper-sc-c3jla7');

		//get list of items
		const items = await page.$$('.DatasetList_Wrapper-sc-c3jla7 div ul li');
		console.log(chalk.grey(`[${items.length}]`));
		
		let rank = 1; //ranking

		for (const item of items) {
			const dataset = await getDetails(item, rank, page);
			if (dataset) collection.push(dataset);

			//scroll page
			await page.waitFor(.5 * 1000);
			page.evaluate( () => {
				window.scrollBy(0, 88);
			});
			await page.waitFor(.5 * 1000);

			rank += 1; //upadate ranking
		}

		return collection;

	} catch(err) {
		console.log(`Scraping: Datasets: Something is wrong with the scraping in Datasets: ${err}`);
		logError('Scraping',`Datasets: Something is wrong with the scraping in Datasets: ${err}`);
		return null;
	}
};

const getDetails = async (item, rank, page) => {

	try {

		//------ 1. Main info
		const title = await item.$eval('div:nth-child(1) div:nth-child(1) div:nth-child(1)', content => content.innerText);
		console.log(`:: ${title}`);

		const owner = await item.$eval('div:nth-child(1) div:nth-child(1) span:nth-child(1) ', content => content.innerText);
		

		const endpoint = await item.$eval('a', content => content.getAttribute('href'));
		const ownerEndpoint = await item.$eval('div:nth-child(1) div:nth-child(1) span:nth-child(2) a', content => content.getAttribute('href'));
		

		let filesize = await item.$eval('div:nth-child(1) div:nth-child(1) span:nth-child(3) span:nth-child(2)', content => content.innerText);
		filesize = filesize.split(' ');
		
		const sizeUnit = filesize[1];
		let size = parseFloat(filesize[0]);
		
		//convert file size
		if (sizeUnit.toLowerCase() == 'mb') {
			size = size * 1024;
		} else if (sizeUnit.toLowerCase() == 'gb') {
			size = size * 1024 * 1024;
		} else if (sizeUnit.toLowerCase() == 'tb') {
			size = size * 1024 * 1024 * 1024;
		}

		let usability = await item.$eval('div:nth-child(1) div:nth-child(1) span:nth-child(3) div', content => content.innerText);
		usability = parseFloat(usability.replace(/,/g, ''));

		let files = await item.$eval('div:nth-child(1) div:nth-child(1) span:nth-child(3) span:nth-child(4)', content => content.innerText);
		let numFiles = files.match(/\d+/g);
		numFiles = numFiles[0];
		numFiles = parseFloat(numFiles);

		let fileTypes = files.match(/\(.*?\)/g);
		fileTypes = fileTypes[0].match(/[a-zA-Z]+/g);

		files = {
			numFiles,
			fileTypes
		};


		let upvotes = await item.$eval('div:nth-child(1) div:nth-child(1) span:nth-child(3) span:nth-child(5)', content => content.innerText);
		upvotes = upvotes.split(' ');
		upvotes = upvotes[0];
		upvotes = parseFloat(upvotes); // int????


		//------2. details

		// Mouse over to show "quick Look" button > click button to open modal
		const itemBox = await item.boundingBox();
		await page.mouse.move(itemBox.x + (itemBox.width/2), itemBox.y + (itemBox.height/2));
		await page.waitFor(.5 * 1000);

		//button
		// await page.click('button[data-testid]');
		let button = await item.$eval('div.sc-eweMDZ button.MuiButton-contained', content => content.innerHTML);
		await page.click('div.sc-eweMDZ button.MuiButton-contained');
		await page.waitFor(.55 * 1000);
		await page.waitFor('div .mdc-dialog__surface');

		//modal
		// const modal = await page.$('div .mdc-dialog__surface');

		// const description = await modal.$('div:nth-of-type(1) > div:nth-of-type(3)', content => content.innerHTML);
		// console.log(description);
		
		// await page.waitFor('.sc-lnmtFM');
		// const descriptionText = await description.$eval('p', content => content.innerHTML);
		// console.log(descriptionText);

		const modalMeta = await page.$('div .mdc-dialog__surface > div:first-child > div:first-child > div:nth-of-type(2) > div:first-child');
		
		let uploadedAt = await modalMeta.$eval('span:nth-of-type(1)', content => content.innerText);
		uploadedAt = uploadedAt.split('\n')[1];

		const license = await modalMeta.$eval('span:nth-of-type(3) > span:nth-of-type(2)', content => content.innerText);
		const tags = await modalMeta.$$eval('span:nth-of-type(4) div div', content => content.map(n => n.innerText));

		//close modal
		await page.keyboard.press('Escape');
		// ------

		//return object 
		return {
			title,
			endpoint,
			// description,
			uploadedAt,
			owner,
			ownerEndpoint,
			license,
			usability,
			size,
			files,
			tags,
			upvotes,
			rank
		};

	} catch (err) {
		console.log(`Scraping: Dataset: Something is wrong with one of the datasets: ${err}`);
		logError('Scraping',`Dataset: Something is wrong with one of the datasets: ${err}`);
		return null;
	}

};


module.exports = {
	collectDatasets,
};