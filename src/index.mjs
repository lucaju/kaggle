import chalk from 'chalk';
import puppeteer from 'puppeteer';
import { config } from './config.mjs';
import mongoose from './db/mongoose.mjs';
// import { sendLogEmail } from './emails/sendEmail.mjs';
import { scraper } from './scraper/scraper.mjs';

let targets = [
  {
    title: 'competitions',
    url: 'https://www.kaggle.com/competitions',
  },
  {
    title: 'datasets',
    url: 'https://www.kaggle.com/datasets',
  },
  {
    title: 'users',
    url: 'https://www.kaggle.com/rankings',
  },
];

const run = async () => {
  targets = config.targets || targets;

  const date = new Date();
  console.log(chalk.blue(`Scraping Kaggle: ${date}`));

  if (await mongoose.connect()) await scrape();

  // await sendEmail(); //send log email

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

  //loop through the pages to scrape
  for await (const target of targets) {
    await scraper(target, page);
  }

  // close pupeteer and mongoose
  await page.waitForTimeout(1000);
  await browser.close();
};

// const sendEmail = async () => {
// 	await sendLogEmail().catch((error) => {
// 		console.log(`Email not sent: ${error}`);
// 		return;
// 	});
// };

run();
