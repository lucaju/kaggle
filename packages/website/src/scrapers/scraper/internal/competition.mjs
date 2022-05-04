// import util from 'util';
import chalk from 'chalk';
import emoji from 'node-emoji';
import ora from 'ora';
import { logError } from '../../../logs/datalog.mjs';
import { saveCompetition } from '../../../router/competition.mjs';
import { config } from './config.mjs';

const useCluster = config.useCluster;

export const scraper = async ({ item, target, page }) => {
  if (!useCluster) console.time(item.uri);

  //initial setup
  const spinner = !useCluster ? ora({ spinner: 'dots' }) : null;
  const internalData = {};

  if (!useCluster) {
    console.log(chalk.green.bold(`\n${emoji.get('lollipop')} COMPETITION: ${item[target.titleAttr]}`));
  }

  //LOAD PAGE
  if (!useCluster) spinner.start(chalk.cyan('loading page'));
  const navToPage = await page.goto(item.uri).catch((error) => processError(error));
  if (!navToPage) throw new Error('page not loeaded');

  await page.waitForSelector('#site-content');
  await page.waitForTimeout(1000);
  if (!useCluster) spinner.succeed('page loaded');

  //Header
  if (!useCluster) spinner.start(chalk.cyan('collecting header'));
  const header = await collectHeader({ page });
  if (!header) if (!useCluster) spinner.fail('header failed');
  if (header) {
    internalData.header = header;
    if (!useCluster) spinner.succeed('header collected');
  }

  //tabs
  const tabsToSkip = new Set();
  for await (const tabName of target.tabs) {
    //skip tab
    if (tabsToSkip.has(tabName !== 'overview')) continue;

    if (!useCluster) {
      spinner.start({
        prefixText: chalk.cyan(tabName),
        text: chalk.cyan('collecting'),
      });
    }

    //Navigate
    if (tabName !== 'overview') {
      //Change tav
      const newTab = await changeTab({ page, tabName });
      if (!newTab) {
        if (!useCluster) spinner.prefixText = null;
        if (!useCluster) spinner.fail(`${tabName} failed`);
        continue;
      }
    }

    //set functions
    let data = null;
    if (tabName === 'overview') {
      const res = await collectTabOverview({ page });
      data = res.data;
      if (res.skipTab) tabsToSkip.add(res.skipTab);
    }
    if (tabName === 'data') data = await collectTabData({ page });
    if (tabName === 'leaderboard') data = await collectTabLeaderboard({ page, spinner });

    //data fail
    if (!data) {
      if (!useCluster) {
        spinner.prefixText = null;
        spinner.fail(`${tabName} failed`);
      }
      continue;
    }

    //push data
    if (data) internalData[tabName] = data;

    if (!useCluster) spinner.prefixText = null;
    if (!useCluster) spinner.succeed(`${tabName} collected`);
  }

  // console.log(internalData);

  //save
  if (!useCluster) spinner.start(chalk.cyan('saving...'));
  item.details = internalData;
  item.details.createdAt = new Date();
  await save({ item, spinner });
  if (!useCluster) spinner.succeed('saved');

  // console.log(util.inspect(item, { showHidden: false, depth: null }));

  if (!useCluster) console.timeEnd(item.uri);

  return internalData;
};

// -------------- NAVIGATION --------------- //

const changeTab = async ({ page, tabName }) => {
  const nav = await getNav({ page });
  if (!nav) return null;

  const tabToClick = nav.find((tab) => tab.name.toLowerCase() === tabName.toLowerCase());
  if (!tabToClick) return null;

  tabToClick.element.click();
  await page.waitForTimeout(200);

  return tabToClick;
};

const getNav = async ({ page }) => {
  const navElement = await page.$$('.pageheader__nav-wrapper > a').catch((error) => processError(error));

  if (!navElement) return null;

  const navOptions = [];
  for await (const element of navElement) {
    const name = await element.evaluate((content) => content.innerText).catch((error) => processError(error));
    if (!name) continue;
    navOptions.push({ name, element });
  }

  return navOptions;
};

// -------------- HEADER --------------- //

const collectHeader = async ({ page }) => {
  const header = await page.$('.pageheader__top--safe').catch((error) => processError(error));
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

const collectTabOverview = async ({ page }) => {
  const overViewData = {};

  //timeline
  const timeline = await collectOverviewTimeline({ page });
  if (timeline) {
    overViewData.startDate = timeline.startDate;
    overViewData.endDate = timeline.endDate;
  }

  //stats
  const stats = await collectOverviewStats({ page });
  if (stats) {
    overViewData.teams = stats.teams;
    overViewData.competitors = stats.competitors;
    overViewData.competitors = stats.entries;
  }

  //tags
  const tags = await collectOverviewTags({ page });
  if (tags) overViewData.tags = tags;

  //limited?
  const limitedCompetition = await page
    .$eval('.pageheader__pagemessage', (content) => content.innerText)
    .catch((error) => processError(error));

  let skipTab = '';
  if (limitedCompetition === 'This is a limited-participation competition. Only invited users may participate.') {
    skipTab = 'data';
  }

  //
  return {
    data: overViewData,
    skipTab,
  };
};

const collectOverviewTimeline = async ({ page }) => {
  const result = {};

  const timeline = await page.$('.horizontal-timeline').catch((error) => processError(error));
  if (!timeline) return null;

  const startDate = await timeline
    .$eval('.horizontal-timeline__point-label--start > span:nth-child(2)', (content) => content.getAttribute('title'))
    .catch((error) => processError(error));
  if (startDate) result.startDate = startDate;

  const endDate = await timeline
    .$eval('.horizontal-timeline__point-label--end > span:nth-child(2)', (content) => content.getAttribute('title'))
    .catch((error) => processError(error));
  if (endDate) result.endDate = endDate;

  return result;
};

const collectOverviewStats = async ({ page }) => {
  const result = {};

  const stats = await page.$('.competition-overview__stats').catch((error) => processError(error));
  if (!stats) return null;

  const teams = await stats
    .$eval('div:nth-child(1) > p:nth-child(1)', (content) => content.innerText)
    .catch((error) => processError(error));
  if (teams) result.teams = teams;

  const competitors = await stats
    .$eval('div:nth-child(2) > p:nth-child(1)', (content) => content.innerText)
    .catch((error) => processError(error));
  if (competitors) result.competitors = competitors;

  const entries = await stats
    .$eval('div:nth-child(3) > p:nth-child(1)', (content) => content.innerText)
    .catch((error) => processError(error));
  if (entries) result.entries = entries;

  return result;
};

const collectOverviewTags = async ({ page }) => {
  const tagsParent = await page.$('.category__box').catch((error) => processError(error));
  if (!tagsParent) return [];

  const tagsElements = await tagsParent
    .$$('div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > span')
    .catch((error) => processError(error));
  if (!tagsElements) return [];

  const tags = [];
  for (const tagElement of tagsElements) {
    const tag = await tagElement.$eval('div', (content) => content.innerText).catch((error) => processError(error));
    if (tag) tags.push(tag);
  }

  return tags;
};

// -------------- TAB DATA --------------- //

const collectTabData = async ({ page }) => {
  await page.waitForSelector('.api-hint__content').catch((error) => processError(error));
  const apiBox = await page.$('.api-hint__content').catch((error) => processError(error));
  if (!apiBox) return null;

  const apiCode = await apiBox
    .$eval(
      'div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(2) > div:nth-child(2)',
      (content) => content.innerText
    )
    .catch((error) => processError(error));
  if (!apiCode) return null;

  let slug = apiCode.split('-c');
  slug = slug[1].trim();

  return { slug };
};

// -------------- TAB LEADERBOARD --------------- //

const collectTabLeaderboard = async ({ page, spinner }) => {
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
    const name = await element
      .evaluate((content) => content.getAttribute('title'))
      .catch((error) => processError(error));
    if (name) tableFields.push({ name });
  }

  // get leardboard list
  if (!useCluster) spinner.text = chalk.cyan('loading leaderboard');
  const collection = await getLeaderboardTable({ page });
  if (!collection) return null;

  //loop through teams
  let i = 1;
  for await (const teamElement of collection) {
    if (!useCluster) spinner.prefixText = chalk.cyan(`leaderboard [${i}/${collection.length}]`);
    const team = await collectTeam({ teamElement, tableFields, spinner });
    if (team) leaderboard.push(team);
    i++;
  }

  return leaderboard;
};

const getLeaderboardTable = async ({ page }) => {
  //get collection
  let collection = await page.$$('.competition-leaderboard__table > tbody > tr').catch((error) => processError(error));
  if (!collection) return null;

  //wait initial load.
  if (collection.length < 2) {
    await page
      .waitForSelector('.competition-leaderboard__table > tbody > tr:nth-child(2)')
      .catch((error) => processError(error));

    collection = await page.$$('.competition-leaderboard__table > tbody > tr').catch((error) => processError(error));
    if (!collection) return null;
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
  collection = await page.$$('.competition-leaderboard__table > tbody > tr').catch((error) => processError(error));
  if (!collection) return null;
  collection.pop(); //remove more button

  return collection;
};

const collectTeam = async ({ teamElement, tableFields, spinner }) => {
  const result = {};

  if (!useCluster) spinner.text = '';

  //name
  const nameFieldOrder = tableFields.findIndex((field) => field.name === 'Team Name');
  const name = await teamElement
    .$eval(`td:nth-child(${nameFieldOrder + 1})`, (content) => content.innerText)
    .catch((error) => processError(error));

  if (name) result.name = name;
  if (!useCluster) spinner.text = `${name}`;

  //rank
  const rankFieldOrder = tableFields.findIndex((field) => field.name === 'Rank');
  const rank = await teamElement
    .$eval(`td:nth-child(${rankFieldOrder + 1})`, (content) => content.innerText)
    .catch((error) => processError(error));
  if (rank) result.rank = rank;

  //score
  const scoreFieldOrder = tableFields.findIndex((field) => field.name === 'Score');
  const score = await teamElement
    .$eval(`td:nth-child(${scoreFieldOrder + 1})`, (content) => content.innerText)
    .catch((error) => processError(error));
  if (score) result.score = score;

  //entries
  const entriesFieldOrder = tableFields.findIndex((field) => field.name === 'Number of Entries');
  const entries = await teamElement
    .$eval(`td:nth-child(${entriesFieldOrder + 1})`, (content) => content.innerText)
    .catch((error) => processError(error));
  if (entries) result.entries = entries;

  //members
  const members = [];
  const membersFieldOrder = tableFields.findIndex((field) => field.name === 'Team Members');
  const membersElement = await teamElement
    .$$(`td:nth-child(${membersFieldOrder + 1}) > span`)
    .catch((error) => processError(error));

  if (membersElement) {
    let i = 1;
    for await (const element of membersElement) {
      const member = await element
        .$eval('a', (content) => content.getAttribute('href'))
        .catch((error) => processError(error));

      if (!useCluster) {
        spinner.text = `${chalk.cyan(name)} :: member [${i}/${membersElement.length}]: ${member}`;
      }

      if (member) members.push(member.replace('/', ''));
      i++;
    }
  }
  result.members = members;

  return result;
};

// -------------- SAVING --------------- //

const save = async ({ item, spinner }) => {
  let logMsg = '';
  const data = await saveCompetition(item);

  if (data.error) {
    logMsg = data.error;
    return;
  }

  const updatedEmoji = data.status === 'updated' ? emoji.get('recycle') : '';
  logMsg = `${emoji.get('sunny')} ${updatedEmoji} :: ${item.title}`;
  if (!useCluster) spinner.text = logMsg;

  return item;
};

// -------------- PROCESS ERROR --------------- //

const processError = (error) => {
  const msg = {
    title: 'Scraping Competition',
    message: error,
  };
  logError(msg);
  return null;
};

export default {
  scraper,
};
