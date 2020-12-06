// import util from 'util';
import chalk from 'chalk';
import emoji from 'node-emoji';
import ora from 'ora';
import { logError } from '../../logs/datalog.mjs';
import { saveCompetition } from '../../router/competition.mjs';
// import { coolDown } from './scraper.mjs';

let page;
let nav;
let spinner;
let tabs = [];

export const collectCompetition = async (item, target, browserPage) => {
	console.time('PAGE');

	//initial setup
	tabs = target.tabs;
	page = browserPage;
	spinner = ora({ spinner: 'dots' });
	const internalData = {};

	console.log(
		chalk.green.bold(`\n${emoji.get('lollipop')} COMPETITION: ${item[target.titleAttr]}`)
	);

	//LOAD PAGE
	spinner.start(chalk.cyan('loading page'));
	await page.goto(item.uri);
	await page.waitForSelector('#site-content');
	await page.waitForTimeout(1000);
	spinner.succeed('page loaded');

	//Header
	spinner.start(chalk.cyan('collecting header'));
	const header = await collectHeader();
	if (!header) spinner.fail('header failed');
	if (header) {
		internalData.header = header;
		spinner.succeed('header collected');
	}

	//tabs
	for await (const tab of tabs) {
		spinner.start({
			prefixText: chalk.cyan(tab),
			text: chalk.cyan('collecting'),
		});

		//Navigate
		if (tab !== 'overview') {
			nav = await getNav(); //SET tab navation;
			const newTab = await changeTab(tab);
			//tab fail
			if (!newTab) {
				spinner.prefixText = null;
				spinner.fail(`${tab} failed`);
				continue;
			}
		}

		//set function
		let data = null;
		if (tab === 'overview') data = await collectTabOverview();
		if (tab === 'data') data = await collectTabData();
		if (tab === 'leaderboard') data = await collectTabLeaderboard();

		//data fail
		if (!data) {
			spinner.prefixText = null;
			spinner.fail(`${tab} failed`);
			continue;
		}

		//push data
		if (data) internalData[tab] = data;

		spinner.prefixText = null;
		spinner.succeed(`${tab} collected`);
	}

	//save
	spinner.start(chalk.cyan('saving...'));
	item.details = internalData;
	await save(item);
	spinner.succeed('saved');

	// console.log(util.inspect(internalData, { showHidden: false, depth: null }));

	//cooldown before next iteration
	// await coolDown(page, spinner);

	console.timeEnd('PAGE');
};

// -------------- NAVIGATION --------------- //

const getNav = async () => {
	const navElement = await page
		.$$('.pageheader__nav-wrapper > a')
		.catch((error) => processError(error));

	if (!navElement) return null;

	const navOptions = [];
	for await (const element of navElement) {
		const name = await element.evaluate((content) => content.innerText);
		navOptions.push({ name, element });
	}

	return navOptions;
};

const changeTab = async (tabName) => {
	const tabToClick = nav.find((tab) => tab.name.toLowerCase() === tabName.toLowerCase());
	if (!tabToClick) return null;

	tabToClick.element.click();
	await page.waitForTimeout(200);

	return tabToClick;
};

// -------------- HEADER --------------- //

const collectHeader = async () => {
	const header = await page.$('.pageheader__top--safe');
	if (!header) return null;

	const headerData = {};

	const title = await header
		.$eval('.competition-header__title', (content) => content.innerText)
		.catch((error) => processError(error));
	if (title) headerData.title = title;

	const subTitle = await header
		.$eval('.competition-header__subtitle', (content) => content.innerText)
		.catch((error) => processError(error));
	if (subTitle) headerData.subTitle = subTitle;

	const organization = await header
		.$eval('.competition-header__organization-name', (content) => content.innerText)
		.catch((error) => processError(error));
	if (organization) headerData.organization = organization;

	return headerData;
};

// -------------- TAB OVERVIEW --------------- //

const collectTabOverview = async () => {
	const overViewData = {};

	//timeline
	const timeline = await collectOverviewTimeline();
	if (timeline) {
		overViewData.startDate = timeline.startDate;
		overViewData.endDate = timeline.endDate;
	}

	//stats
	const stats = await collectOverviewStats();
	if (stats) {
		overViewData.teams = stats.teams;
		overViewData.competitors = stats.competitors;
		overViewData.competitors = stats.entries;
	}

	//tags
	const tags = await collectOverviewTags();
	if (tags) overViewData.tags = tags;

	//
	return overViewData;
};

const collectOverviewTimeline = async () => {
	const timeline = await page.$('.horizontal-timeline').catch((error) => processError(error));
	if (!timeline) return null;

	const startDate = await timeline
		.$eval('.horizontal-timeline__point-label--start > span:nth-child(2)', (content) =>
			content.getAttribute('title')
		)
		.catch((error) => processError(error));

	const endDate = await timeline
		.$eval('.horizontal-timeline__point-label--end > span:nth-child(2)', (content) =>
			content.getAttribute('title')
		)
		.catch((error) => processError(error));

	return { startDate, endDate };
};

const collectOverviewStats = async () => {
	const stats = await page
		.$('.competition-overview__stats')
		.catch((error) => processError(error));
	if (!stats) return null;

	const teams = await stats
		.$eval('div:nth-child(1) > p:nth-child(1)', (content) => content.innerText)
		.catch((error) => processError(error));

	const competitors = await stats
		.$eval('div:nth-child(2) > p:nth-child(1)', (content) => content.innerText)
		.catch((error) => processError(error));

	const entries = await stats
		.$eval('div:nth-child(3) > p:nth-child(1)', (content) => content.innerText)
		.catch((error) => processError(error));

	return { teams, competitors, entries };
};

const collectOverviewTags = async () => {
	const tagsParent = await page.$('.category__box');
	if (!tagsParent) return [];

	const tagsElements = await tagsParent.$$(
		'div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > span'
	);
	if (!tagsParent) return [];

	const tagsData = [];
	for (const tag of tagsElements) {
		const tagData = await tag.$eval('div', (content) => content.innerText);
		tagsData.push(tagData);
	}

	return tagsData;
};

// -------------- TAB DATA --------------- //

const collectTabData = async () => {
	//wait content
	await page.waitForSelector('.api-hint__content');
	const apiBox = await page.$('.api-hint__content');

	const apiCode = await apiBox
		.$eval(
			'div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(2) > div:nth-child(2)',
			(content) => content.innerText
		)
		.catch((error) => processError(error));

	let slug = apiCode.split('-c');
	slug = slug[1].trim();

	return { slug };
};

// -------------- TAB LEADERBOARD --------------- //

const collectTabLeaderboard = async () => {
	const leaderboard = [];

	// wait to load the initial list
	await page.waitForSelector('.competition-leaderboard__table');

	//get headers
	const tableFields = [];
	const tableHeaders = await page
		.$$('.competition-leaderboard__table > thead > tr > th')
		.catch((error) => processError(error));
	if (!tableHeaders) return null;
	for await (const element of tableHeaders) {
		const name = await element.evaluate((content) => content.getAttribute('title'));
		tableFields.push({ name });
	}

	// get leardboard list
	spinner.text = chalk.cyan('loading leaderboard');
	const collection = await getLeaderboardTable();
	if (!collection) return null;

	//loop through teams
	let i = 1;
	for await (const teamElement of collection) {
		spinner.prefixText = chalk.cyan(`leaderboard [${i}/${collection.length}]`);
		const team = await collectTeam(teamElement, tableFields);
		if (team) leaderboard.push(team);
		i++;
	}

	return leaderboard;
};

const getLeaderboardTable = async () => {
	//get collection
	let collection = await page
		.$$('.competition-leaderboard__table > tbody > tr')
		.catch((error) => processError(error));
	if (!collection) return null;

	//wait initial load.
	if (collection.length < 2) {
		await page
			.waitForSelector('.competition-leaderboard__table > tbody > tr:nth-child(2)')
			.catch((error) => processError(error));
		collection = await page.$$('.competition-leaderboard__table > tbody > tr');
	}

	//click to load more
	const hasMoreButton = await page
		.$('.competition-leaderboard__load-more-button')
		.catch((error) => processError(error));
	if (!hasMoreButton) return collection;
	hasMoreButton.click();

	//wait to load more
	await page
		.waitForSelector('.competition-leaderboard__table > tbody > tr:nth-child(52)')
		.catch((error) => processError(error));

	//update collection
	collection = await page
		.$$('.competition-leaderboard__table > tbody > tr')
		.catch((error) => processError(error));
	if (!collection) return null;
	collection.pop(); //remove more button

	return collection;
};

const collectTeam = async (teamData, tableFields) => {
	spinner.text = '';

	//name
	const nameFieldOrder = tableFields.findIndex((field) => field.name === 'Team Name');
	const name = await teamData
		.$eval(`td:nth-child(${nameFieldOrder + 1})`, (content) => content.innerText)
		.catch((error) => processError(error));

	spinner.text = `${name}`;

	//rank
	const rankFieldOrder = tableFields.findIndex((field) => field.name === 'Rank');
	const rank = await teamData
		.$eval(`td:nth-child(${rankFieldOrder + 1})`, (content) => content.innerText)
		.catch((error) => processError(error));

	//score
	const scoreFieldOrder = tableFields.findIndex((field) => field.name === 'Score');
	const score = await teamData
		.$eval(`td:nth-child(${scoreFieldOrder + 1})`, (content) => content.innerText)
		.catch((error) => processError(error));

	//entries
	const entriesFieldOrder = tableFields.findIndex((field) => field.name === 'Number of Entries');
	const entries = await teamData
		.$eval(`td:nth-child(${entriesFieldOrder + 1})`, (content) => content.innerText)
		.catch((error) => processError(error));

	//members

	const members = [];
	const membersFieldOrder = tableFields.findIndex((field) => field.name === 'Team Members');
	const membersElement = await teamData.$$(`td:nth-child(${membersFieldOrder + 1}) > span`);

	if (membersElement) {
		let i = 1;
		for await (const element of membersElement) {
			const member = await element
				.$eval('a', (content) => content.getAttribute('href'))
				.catch((error) => processError(error));

			spinner.text = `${chalk.cyan(name)} :: member [${i}/${
				membersElement.length
			}]: ${member}`;
			if (member) members.push(member.replace('/', ''));
			i++;
		}
	}

	//
	return {
		rank,
		name,
		score,
		entries,
		members,
	};
};

// -------------- SAVING --------------- //

const save = async (competition) => {
	let logMsg = '';
	const data = await saveCompetition(competition);

	if (data.error) {
		logMsg = data.error;
		return;
	}

	const updatedEmoji = data.status === 'updated' ? emoji.get('recycle') : '';
	logMsg = `${emoji.get('sunny')} ${updatedEmoji} :: ${competition.title}`;
	spinner.text = logMsg;

	return competition;
};

// -------------- PROCESS ERROR --------------- //

const processError = (error) => {
	const msg = {
		title: 'Scraping Competition',
		message: error,
	};
	// console.log(msg);
	logError(msg);
	return null;
};

export default {
	collectCompetition,
};
