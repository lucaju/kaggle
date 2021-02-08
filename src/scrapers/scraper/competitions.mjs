import chalk from 'chalk';
import emoji from 'node-emoji';
import ora from 'ora';
import { logError } from '../../logs/datalog.mjs';
import { saveCompetition } from '../../router/competition.mjs';
import { coolDown, limitScrollTo } from './scraper.mjs';

let url = 'https://www.kaggle.com/competitions';
let page;
let spinner;

const tabs = ['active', 'completed', 'in-class'];

export const collectCompetitions = async (pageUrl, browserPage) => {
  //start
  url = pageUrl;
  page = browserPage;
  spinner = ora({ spinner: 'dots' });

  console.log(chalk.green.bold('\nCOMPETITIONS'));

  for await (const tab of tabs) {
    // navigate to URL (refresh each time to change tab) and wait content to load
    console.log(chalk.green.bold(`\n${emoji.get('lollipop')} Collecting ${tab} Competitions`));

    spinner.start('Loading Page');
    await page.goto(url);
    await page.waitForSelector('#site-content');
    await page.waitForTimeout(5000);
    spinner.succeed('Page Loaded');

    const list = await getList(tab);

    spinner.start({
      prefixText: 'Collecting',
      text: 'Scrolling',
    });

    const total = list.length;
    let index = 1;

    for await (const item of list) {
      spinner.prefixText = `Collecting [${index}/${total}]`;
      const competition = await getDetails(item, tab);
      index++;

      if (!competition) continue;
      await save(competition);
    }

    spinner.prefixText = null;
    spinner.succeed('Data Collected');

    //cooldown before next iteration
    await coolDown(page, spinner);
  }
};

const getList = async (tab) => {
  //Cange Tab
  if (tab !== 'active') await changeTab(tab);
  const list = await scroll();
  if (list.length === 0) {
    processError(`${tab} Competition: List of items return 0`);
    return [];
  }
  return list;
};

const changeTab = async (tab) => {
  spinner.start(`Changing Tab to ${tab}`);

  const nav = await page
    .$('#site-content > div:nth-child(2) > div > div:nth-child(3) > nav')
    .catch((error) => processError(error));

  let tabChild = '';
  if (tab === 'completed') tabChild = '2';
  if (tab === 'in-class') tabChild = '3';

  if (tabChild === '') {
    spinner.succeed('Tab Change Failed');
    return;
  }

  const tabToClick = await nav.$(`div:first-child > button:nth-child(${tabChild})`);
  const boundingBox = await tabToClick.boundingBox();
  await page.mouse.click(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
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
    .$('#site-content > div:nth-child(2) > div > div:nth-child(3) > div:nth-child(3) > ul')
    .catch((error) => processError(error));

  //define the corrent size of the list container
  const boundingBox = await container.boundingBox();
  const height = boundingBox.height;

  //This list includes separators beetween each item
  let list = await container.$$('li:nth-child(odd)');

  let prevListLength = 0;
  let scrollN = 1;
  const indicator = '.';

  // loop as many a necessary to load more data
  while (list.length > prevListLength) {
    let itemLog = chalk.grey(`[${list.length}]`);
    let scrollLog = chalk.yellow(indicator.repeat(scrollN));
    spinner.text = `Loading data: ${itemLog} ${scrollLog}`;

    scrollN += 1;

    prevListLength = list.length;

    await page.mouse.wheel({ deltaY: height });
    await page.waitForTimeout(2000);

    list = await container.$$('li:nth-child(odd)');

    if (limitScrollTo > 0 && list.length > limitScrollTo) break;
  }

  await page.waitForTimeout(500);
  spinner.succeed(`Data Loaded ${chalk.grey(`[${list.length} competitions]`)}`);
  return list;
};

const getDetails = async (item, tab) => {
  const competition = {};

  competition.title = await getTitle(item);
  spinner.text = `:: ${competition.title}`;

  competition.uri = await getUri(item);
  competition.shortDescription = await getShortDescription(item);
  competition.prize = await getPrize(item);
  competition.active = tab === 'active' ? true : false;
  competition.inClass = tab === 'in-class' ? true : false;

  const extraMetada = await getExtraMetadata(item);
  if (!extraMetada) return competition;

  if (extraMetada.category) competition.category = extraMetada.category;
  if (extraMetada.relativeDeadline) competition.relativeDeadline = extraMetada.relativeDeadline;
  if (extraMetada.subCategory) competition.subCategory = extraMetada.subCategory;
  if (extraMetada.teams) competition.teams = extraMetada.teams;

  return competition;
};

const getTitle = async (item) => {
  const title = await item
    .$eval('a > span:nth-child(2) > div:first-child', (content) => content.innerText)
    .catch((error) => processError(error));
  return title;
};

const getUri = async (item) => {
  const endpoint = await item
    .$eval('a', (content) => content.getAttribute('href'))
    .catch((error) => processError(error));
  if (!endpoint) return null;
  return `https://www.kaggle.com${endpoint}`;
};

const getShortDescription = async (item) => {
  const shortDescription = await item
    .$eval('a > span:nth-child(2) > span', (content) => content.innerText)
    .catch((error) => processError(error));
  return shortDescription;
};

const getPrize = async (item) => {
  const prize = await item
    .$eval('div:nth-child(2)', (content) => content.innerText)
    .catch((error) => processError(error));
  return prize;
};

const getExtraMetadata = async (item) => {
  const metadata = {};

  const meta = await item
    .$eval('a > span:nth-child(2) > span:nth-child(3)', (content) => content.innerText)
    .catch((error) => processError(error));

  if (!meta) return null;

  let data = meta.trim();
  data = meta.split('•');

  metadata.category = data[0].trim();
  metadata.relativeDeadline = data[1].trim();

  //Competions can 2, 3, or 4 metadata, and the order can change.
  if (data.length > 2) {
    let subCatPos = 2;
    let teamPos = 3;

    if (data.length === 3) teamPos = 2;
    if (data.length === 4) metadata.subCategory = data[subCatPos].trim();

    metadata.teams = data[teamPos].trim().split(' ')[0].trim();
  }

  return metadata;
};

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

const processError = (error) => {
  const msg = {
    title: 'Scraping Competition',
    message: error,
  };
  console.log(msg);
  logError(msg);
  return null;
};

export default {
  collectCompetitions,
};
