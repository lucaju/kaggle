import chalk from 'chalk';
import puppeteer from 'puppeteer';
import { config } from './scraper/internal/config.mjs';
import mongoose from './db/mongoose.mjs';
import { scraper } from './scraper/internal/competition.mjs';
import Competition from './models/competition.mjs';
import Dataset from './models/dataset.mjs';
import User from './models/user.mjs';

const target = config.targets[0];

const run = async () => {
  const date = new Date();
  console.log(chalk.blue(`Scraping Kaggle: ${date}`));

  if (await mongoose.connect()) await scrape();

  //done
  mongoose.close();
  console.log(chalk.blue('\nDone'));
};

const scrape = async () => {
  // lunch puppeteer
  const browser = await puppeteer.launch({
    headless: config.puppeteer.headless || false,
    defaultViewport: {
      width: 1000,
      height: 800,
    },
  });

  console.log(chalk.gray('Puppeteer Launched'));

  // open new tab
  const page = await browser.newPage();

  //get collection
  const collection = await getCollection();

  console.log(chalk.green.bold('\nCOMPETITIONS'));

  // loop through the pages to scrape
  for await (const item of collection) {
    await scraper({ item, target, page });
  }

  // close pupeteer and mongoose
  await page.waitForTimeout(1000);
  await browser.close();
};

const getCollection = async () => {
  let collection;
  if (target.name === 'competition') collection = await Competition.find(config.filter).limit(config.limit);
  if (target.name === 'dataset') collection = await Dataset.find(config.filter).limit(config.limit);
  if (target.name === 'user') collection = await User.find(config.filter).limit(config.limit);
  return collection;
};

run();
