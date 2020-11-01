import chalk from 'chalk';
import emoji from 'node-emoji';
import ora from 'ora';
import { logError } from '../logs/datalog.mjs';
import { saveUser } from '../router/user.mjs';
import { limitScrollTo, coolDown } from './scraper.mjs';

let url = 'https://www.kaggle.com/rankings';
let page;
let spinner;

const tabs = [
	'Competitions',
	'Datasets',
	'Notebooks',
	'Discussions'
];

export const collectUsers = async (pageUrl, browserPage) => {
	//start
	url = pageUrl;
	page = browserPage;
	spinner = ora({ spinner: 'dots' });

	console.log(chalk.green.bold('\nUSERS'));

	for await (const tab of tabs) {
		// navigate to URL (refresh each time to change tab) and wait content to load
		console.log(
			chalk.green.bold(`\n${emoji.get('monkey')} Collecting Users on the ${tab} Ranking`)
		);

		spinner.start('Loading Page');
		await page.goto(url);
		await page.waitForSelector('#site-content');
		await page.waitForSelector('.smart-list__content');
		await page.waitForTimeout(5000);
		spinner.succeed('Page Loaded');

		const list = await getList(tab);

		spinner.start({
			prefixText: 'Collecting',
			text: 'Data',
		});

		const total = list.length;
		let index = 1;

		for await (const item of list) {
			spinner.prefixText = `Collecting [${index}/${total}]`;
			const user = await getDetails(item, tab);
			index++;

			if (!user) continue;
			await save(user);
		}

		spinner.prefixText = null;
		spinner.succeed('Data Collected');

		//cooldown before next iteration
		await coolDown(page, spinner);
	}
};

const getList = async (tab) => {
	//Cange Tab
	if (tab !== 'Competitions') await changeTab(tab);
	const list = await scroll();
	if (list.length === 0) {
		processError(`${tab} Ranking: List of items return 0`);
		return [];
	}
	return list;
};

const changeTab = async (tab) => {
	spinner.start(`Changing Tab to ${tab}`);

	const nav = await page
		.$(
			'#site-content > div:nth-child(2) > div > div:nth-child(2) > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(1) > div > div:nth-child(1) > div > ul'
		)
		.catch((error) => processError(error));

	let tabChild = '';
	if (tab === 'Datasets') tabChild = '2';
	if (tab === 'Notebooks') tabChild = '3';
	if (tab === 'Discussions') tabChild = '4';

	if (tabChild === '') {
		spinner.succeed('Tab Change Failed');
		return;
	}

	const tabToClick = await nav.$(`li:nth-child(${tabChild})`);
	const boundingBox = await tabToClick.boundingBox();
	await page.mouse.click(
		boundingBox.x + boundingBox.width / 2,
		boundingBox.y + boundingBox.height / 2
	);
	await page.waitForTimeout(1 * 1000);

	spinner.succeed('Tab Changed');

	return nav;
};

const scroll = async () => {
	spinner.start({
		prefixText: 'Loading Data',
		text: 'Scrolling',
	});

	//Find the list container
	const container = await page
		.$(
			'#site-content > div:nth-child(2) > div > div:nth-child(2) > div > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div'
		)
		.catch((error) => processError(error));

	//define the corrent size of the list container
	const boundingBox = await container.boundingBox();
	const height = boundingBox.height;

	//move mouse to the page to be able to scroll
	await page.mouse.move(boundingBox.x, boundingBox.y);

	//select innner div based on class
	let list = await container.$$('div.block-link');

	let prevListLength = 0;
	let scrollN = 1;
	const indicator = '.';

	//
	let repeat = 0;

	// loop as many a necessary to load more data
	// `-1` to allow for repeatation in case that the scrolling doesn't load new data.
	while (list.length > prevListLength-1) {
		let itemLog = chalk.grey(`[${list.length}]`);
		let scrollLog = chalk.yellow(indicator.repeat(scrollN));
		spinner.text = `Loading data: ${itemLog} ${scrollLog}`;

		scrollN += 1;

		prevListLength = list.length;

		await page.mouse.wheel({ deltaY: height });
		await page.waitForTimeout(2000);

		list = await container.$$('div.block-link');

		//repeat ... in case
		repeat = (prevListLength === list.length) ? repeat+1 : 0;
		if (repeat > 2) break; //max: 2 repeatition

		//break if over the limit
		if (limitScrollTo > 0 && list.length > limitScrollTo) break;
	}

	await page.waitForTimeout(500);
	spinner.succeed(`Data Loaded ${chalk.grey(`[${list.length} users]`)}`);
	return list;
};

const getDetails = async (item, tab) => {
	const user = {};

	user.name = await getName(item);
	spinner.text = `:: ${user.name}`;

	user.uri = await getUri(item);
	user.joinedAt = await getJoinedAt(item);

	user[`rank${tab}`] = {};
	user[`rank${tab}`].position = await getPosition(item);
	user[`rank${tab}`].tier = await getTier(item);
	user[`rank${tab}`].goldMedals = await getGoldMedal(item);
	user[`rank${tab}`].silverMedals = await getSilverMedal(item);
	user[`rank${tab}`].bronzeMedals = await getBronzeMedal(item);
	user[`rank${tab}`].points = await getPoints(item);

	return user;
};

const getName = async (item) => {
	const name = await item
		.$eval(
			'div:nth-child(2) > div:nth-child(4) > p:nth-child(1)',
			(content) => content.innerText
		)
		.catch((error) => processError(error));
	return name;
};

const getUri = async (item) => {
	const endpoint = await item
		.$eval('a', (content) => content.getAttribute('href'))
		.catch((error) => processError(error));
	if (!endpoint) return null;
	return `https://www.kaggle.com${endpoint}`;
};

const getJoinedAt = async (item) => {
	const joinedAt = await item
		.$eval('div:nth-child(2) > div:nth-child(4) > p:nth-child(2) > span', (content) =>
			content.getAttribute('title')
		)
		.catch((error) => processError(error));

	//get only date
	const dateSplit = joinedAt.split(' ');
	//weekday month day year
	const dateOnly = `${dateSplit[1]} ${dateSplit[2]} ${dateSplit[3]}`;
	const date = new Date(dateOnly);

	return date;
};

const getPosition = async (item) => {
	const position = await item
		.$eval('div:nth-child(2) > div:nth-child(1)', (content) => Number(content.innerText))
		.catch((error) => processError(error));
	return position;
};

const getTier = async (item) => {
	const tier = await item
		.$eval('div:nth-child(2) > div:nth-child(2) > img', (content) =>
			content.getAttribute('title')
		)
		.catch((error) => processError(error));
	return tier;
};

const getGoldMedal = async (item) => {
	const medal = await item
		.$eval(
			'div:nth-child(2) > div:nth-child(5) > div:nth-child(1) > div:nth-child(2)',
			(content) => Number(content.innerText)
		)
		.catch((error) => processError(error));
	return medal;
};

const getSilverMedal = async (item) => {
	const medal = await item
		.$eval(
			'div:nth-child(2) > div:nth-child(5) > div:nth-child(2) > div:nth-child(2)',
			(content) => Number(content.innerText)
		)
		.catch((error) => processError(error));
	return medal;
};

const getBronzeMedal = async (item) => {
	const medal = await item
		.$eval(
			'div:nth-child(2) > div:nth-child(5) > div:nth-child(3) > div:nth-child(2)',
			(content) => Number(content.innerText)
		)
		.catch((error) => processError(error));
	return medal;
};

const getPoints = async (item) => {
	const points = await item
		.$eval('div:nth-child(2) > div:nth-child(6)', (content) =>
			Number(content.innerText.replace(/,/g, ''))
		)
		.catch((error) => processError(error));
	return points;
};

const save = async (user) => {
	let logMsg = '';
	const data = await saveUser(user);

	if (data.error) {
		logMsg = data.error;
		return;
	}

	const updatedEmoji = data.status === 'updated' ? emoji.get('recycle') : '';
	logMsg = `${emoji.get('sunny')} ${updatedEmoji} :: ${user.name}`;
	spinner.text = logMsg;

	return user;
};

const processError = (error) => {
	const msg = {
		title: 'Scraping Rankings',
		message: error,
	};
	console.log(msg);
	logError(msg);
	return null;
};

export default {
	collectUsers,
};
