import chalk from 'chalk';
import emoji from 'node-emoji';
import ora from 'ora';
import { logError } from '../logs/datalog.mjs';
import { saveDataset } from '../router/dataset.mjs';
import { limitScrollTo, coolDown } from './scraper.mjs';

let url = 'https://www.kaggle.com/datasets';
let page;
let spinner;

const filtersBySize = [
  { from: { value: 0, unit: 'KB' }, to: { value: 1, unit: 'KB' } },
  { from: { value: 1, unit: 'KB' }, to: { value: 5, unit: 'KB' } },
  { from: { value: 5, unit: 'KB' }, to: { value: 10, unit: 'KB' } },
  { from: { value: 10, unit: 'KB' }, to: { value: 20, unit: 'KB' } },
  { from: { value: 20, unit: 'KB' }, to: { value: 50, unit: 'KB' } },
  { from: { value: 50, unit: 'KB' }, to: { value: 100, unit: 'KB' } },
  { from: { value: 100, unit: 'KB' }, to: { value: 200, unit: 'KB' } },
  { from: { value: 200, unit: 'KB' }, to: { value: 500, unit: 'KB' } },
  { from: { value: 500, unit: 'KB' }, to: { value: 1, unit: 'MB' } },
  { from: { value: 1, unit: 'MB' }, to: { value: 2, unit: 'MB' } },
  { from: { value: 2, unit: 'MB' }, to: { value: 5, unit: 'MB' } },
  { from: { value: 5, unit: 'MB' }, to: { value: 10, unit: 'MB' } },
  { from: { value: 10, unit: 'MB' }, to: { value: 20, unit: 'MB' } },
  { from: { value: 20, unit: 'MB' }, to: { value: 50, unit: 'MB' } },
  { from: { value: 50, unit: 'MB' }, to: { value: 100, unit: 'MB' } },
  { from: { value: 100, unit: 'MB' }, to: { value: 200, unit: 'MB' } },
  { from: { value: 200, unit: 'MB' }, to: { value: 500, unit: 'MB' } },
  { from: { value: 500, unit: 'MB' }, to: { value: 1, unit: 'GB' } },
  { from: { value: 1, unit: 'GB' }, to: { value: 2, unit: 'GB' } },
  { from: { value: 2, unit: 'GB' }, to: { value: 5, unit: 'GB' } },
  { from: { value: 5, unit: 'GB' }, to: { value: 100, unit: 'GB' } },
];

export const collectDatasets = async (pageUrl, browserPage) => {
  //start
  url = pageUrl;
  page = browserPage;
  spinner = ora({ spinner: 'dots' });

  console.log(chalk.green.bold('\nDATASETS'));

  for await (const query of filtersBySize) {
    // navigate to URL based on filter by size and wait content to load
    const { from, to } = query;
    const params = `?sizeStart=${from.value}%2C${from.unit}&sizeEnd=${to.value}%2C${to.unit}`;

    console.log(
      chalk.green.bold(
        `\n${emoji.get('memo')} Collecting Datasets from query: ${from.value} ${from.unit} - ${to.value} ${to.unit}`
      )
    );

    spinner.start('Loading Page');
    await page.goto(`${url}${params}`);
    await page.waitForSelector('#site-content');
    await page.waitForTimeout(5000);
    spinner.succeed('Page Loaded');

    const list = await getList(query);

    spinner.start({
      prefixText: 'Collecting',
      text: 'Scrolling',
    });

    const total = list.length;
    let index = 1;

    for await (const item of list) {
      spinner.prefixText = `Collecting [${index}/${total}]`;
      const dataset = await getDetails(item);
      index++;

      if (!dataset) continue;
      await save(dataset);
    }

    spinner.prefixText = null;
    spinner.succeed('Data Collected');

    //cooldown before next iteration
    await coolDown(page, spinner);
  }
};

const getList = async (query) => {
  const list = await scroll();
  if (list.length === 0) {
    processError(`Datasets: List of items return 0 (query:${query})`);
    return [];
  }
  return list;
};

const scroll = async () => {
  spinner.start({
    prefixText: 'Loading Data',
    text: 'Scrolling',
  });

  //Find the list container
  const container = await page
    .$('#site-content > div:nth-child(2) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div > ul')
    .catch((error) => processError(error));

  //define the corrent size of the list container
  const boundingBox = await container.boundingBox();
  const height = boundingBox.height;

  //move mouse to the page to be able to scroll
  await page.mouse.move(boundingBox.x, boundingBox.y);

  let list = await container.$$('li');

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

    list = await container.$$('li');

    if (limitScrollTo > 0 && list.length > limitScrollTo) break;
  }

  await page.waitForTimeout(500);
  spinner.succeed(`Data Loaded ${chalk.grey(`[${list.length} datasets]`)}`);
  return list;
};

const getDetails = async (item) => {
  //stop if finds end mark
  const hasEndMark = await item.evaluate((content) => {
    const attr = content.getAttribute('data-test');
    if (attr && attr === 'list-end-item') return true;
    return false;
  });
  if (hasEndMark) return;

  const dataset = {};

  dataset.title = await getTitle(item);
  spinner.text = `:: ${dataset.title}`;

  dataset.uri = await getUri(item);
  dataset.owner = await getOwner(item);

  const medal = await getMedal(item);
  if (medal) dataset.medal = medal;

  const upvotes = await getUpvotes(item);
  if (upvotes) dataset.upvotes = upvotes;

  const extraMetadataContainer = await item
    .$('div:nth-child(2) > div:nth-child(2) > span:nth-child(3)')
    .catch((error) => processError(error));

  // Return here if doesn't find Extra Metadata container.
  if (!extraMetadataContainer) return dataset;

  //metadata has 5 slots
  const slot1 = await getMetadaSlot1(extraMetadataContainer);
  if (slot1.label === 'calendar_today') dataset.uploadedAtRelative = slot1.value;

  const slot2 = await getMetadaSlot2(extraMetadataContainer);
  if (slot2.label === 'database') dataset.size = slot2.value;
  if (slot2.label === 'business_center') dataset.usabilityScore = parseFloat(slot2.value);

  const slot3 = await getMetadaSlot3(extraMetadataContainer);
  if (slot3.label === 'business_center') dataset.usabilityScore = parseFloat(slot3.value);
  if (slot3.label === 'zoom_in') dataset.files = { fileTypes: slot3.value };
  if (slot3.label === 'insert_drive_file') dataset.files = parseFileTypes(slot3.value);

  const slot4 = await getMetadaSlot4(extraMetadataContainer);
  if (slot4 && dataset.files === undefined) dataset.files = slot4;

  const slot5 = await getMetadaSlot5(extraMetadataContainer);
  if (slot5) dataset.tasks = slot5;

  return dataset;
};

const getTitle = async (item) => {
  const title = await item
    .$eval('div:nth-child(2) > div:nth-child(2) > div:first-child', (content) => content.innerText)
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

const getMedal = async (item) => {
  const medal = await item
    .$eval('div:nth-child(2) > div:nth-child(2) > div:first-child > img', (content) => {
      const src = content.getAttribute('src');
      if (!src) return null;
      let medalString = src.split('/')[5];
      medalString = medalString.split('l@')[0];
      return medalString;
    })
    .catch(() => null);

  return medal;
};

const getOwner = async (item) => {
  const owner = await item
    .$eval('div:nth-child(2) > div:nth-child(2) > span:nth-child(2) > a', (content) => ({
      name: content.childNodes[0].childNodes[1].nodeValue,
      // name_: content.childNodes[1].nodeValue,
      uri: `https://www.kaggle.com${content.getAttribute('href')}`,
    }))
    .catch((error) => processError(error));

  return owner;
};

const getMetadaSlot1 = async (container) => {
  const slot = await container
    .$eval('*:nth-child(1)', (content) => {
      const label = content.childNodes[0].innerHTML;
      const value = content.childNodes[1].nodeValue;
      return { label, value };
    })
    .catch((error) => processError(error));

  return slot;
};

const getMetadaSlot2 = async (container) => {
  const slot = await container
    .$eval('*:nth-child(2)', (content) => {
      const child = content.childNodes[0];
      const nodeName = child.nodeName;
      const label = nodeName === 'SPAN' ? child.childNodes[0].innerText : child.innerText;
      const value = nodeName === 'SPAN' ? child.childNodes[1].nodeValue : content.childNodes[1].nodeValue;
      return { label, value };
    })
    .catch((error) => processError(error));

  return slot;
};

const getMetadaSlot3 = async (container) => {
  const slot = await container
    .$eval('*:nth-child(3)', (content) => {
      const child = content.childNodes[0];
      const nodeName = child.nodeName;
      const label = nodeName === 'SPAN' ? child.childNodes[0].innerText : child.innerText;
      const value = nodeName === 'SPAN' ? child.childNodes[1].nodeValue : content.childNodes[1].nodeValue;
      return { label, value };
    })
    .catch((error) => processError(error));

  return slot;
};

const getMetadaSlot4 = async (container) => {
  const slot = await container
    .$eval('span:nth-child(4)', (content) => {
      const data = content.childNodes[1].nodeValue;
      const quantity = Number(data.split(' ')[0]);
      const types = data.match(/\b[^\d\W]+\b/g); //regex: words non-dogit
      return {
        numFiles: quantity,
        fileTypes: types,
      };
    })
    .catch(() => null);

  return slot;
};

const getMetadaSlot5 = async (container) => {
  const slot = await container
    .$eval('span:nth-child(5)', (content) => {
      const text = content.childNodes[1].nodeValue;
      const tasksNumber = text.split('');
      return Number(tasksNumber[0]);
    })
    .catch(() => null);

  return slot;
};

const getUpvotes = async (item) => {
  const upvotes = await item
    .$eval('div:nth-child(3) > div:nth-child(1) > div:nth-child(1) > button:nth-child(2)', (content) =>
      Number(content.innerText)
    )
    .catch(() => null);

  return upvotes;
};

const save = async (dataset) => {
  let logMsg = '';
  const data = await saveDataset(dataset);

  if (data.error) {
    logMsg = data.error;
    return;
  }

  const updatedEmoji = data.status === 'updated' ? emoji.get('recycle') : '';
  logMsg = `${emoji.get('sunny')} ${updatedEmoji} :: ${dataset.title}`;
  spinner.text = logMsg;

  return dataset;
};

const parseFileTypes = (value) => {
  const quantity = Number(value.split(' ')[0]);
  const types = value.match(/\b[^\d\W]+\b/g); //regex: words non-dogit
  return {
    numFiles: quantity,
    fileTypes: types,
  };
};

const processError = (error) => {
  const msg = {
    title: 'Scraping Datasets',
    message: error,
  };
  console.log(msg);
  logError(msg);
  return null;
};

export default {
  collectDatasets,
};
