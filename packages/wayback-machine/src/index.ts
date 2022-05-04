import fs from 'fs-extra';
import { blue, magenta, white } from 'kleur';
import emoji from 'node-emoji';
import ora from 'ora';
import { parse, ParseError } from 'papaparse';
import puppeteer, { Browser } from 'puppeteer';
import { argv } from './argv';

const folderResult = 'result';
const spinner = ora({ spinner: 'dots', color: 'blue', stream: process.stdout });

let browser: Browser;

let pathCSV: string | null = null;
let imageType: 'png' | 'jpg' = 'png';
let prefixFilename: string | null = null;
let retyAttempts = 3;
let snapshotTimeout = 30_000;

//Initial Setup
(async () => {
  //@ts-ignore
  if (!argv.csvFile) {
    console.error('You must provide a path to the CSV file');
    return;
  }

  //@ts-ignore
  pathCSV = argv.csvFile;
  //@ts-ignore
  if (argv.imageType) imageType = argv.imageType;
  //@ts-ignore
  if (argv.prefixFilename) prefixFilename = argv.prefixFilename;
  //@ts-ignore
  if (argv.retyAttempts) retyAttempts = argv.retyAttempts;
  //@ts-ignore
  if (argv.snapshotTimeout) snapshotTimeout = argv.snapshotTimeout;

  run();
})();

async function run() {
  if (!pathCSV) {
    console.error('You must provide a path to the CSV file');
    return;
  }

  const now = new Date();
  console.log(magenta(`Scraping Youtube Recommendations: ${now}\n`));

  //* Load File
  const file = await fs.readFile(pathCSV, 'utf8').catch((error) => console.error(error));
  if (!file) return;

  const { data, errors }: { data: any; errors: ParseError[] } = parse(file, { header: true });

  if (errors.length > 0) {
    errors.forEach((error) => {
      console.warn(error);
    });
    return;
  }

  if (!fs.existsSync(folderResult)) fs.mkdirSync(folderResult);

  // * Initialize Browser
  browser = await puppeteer.launch({
    defaultViewport: { width: 1400, height: 1200 },
    headless: true,
    timeout: snapshotTimeout,
  });

  // * Start loop
  console.log(white(`Visiting ${blue(`${data.length}`)} sites`));
  let retries = await loop(data);

  // * Loop Retry fail attempts
  let retryAttempt = 1;
  while (retryAttempt <= retyAttempts && retries.length > 0) {
    console.log(`\nRetry attempt ${retryAttempt} / ${retyAttempts}`);
    console.log(white(`Visiting ${blue(`${retries.length}`)} sites`));
    retries = await loop(retries);
    retryAttempt = retryAttempt + 1;
  }

  //done
  await browser.close();
  console.log(magenta('\nDone'));
}

async function loop(data: any[]) {
  const fail: any[] = [];

  let index = 1;

  for await (const item of data) {
    //clean url
    const url: string = item.page.trim();

    //check if url is valid
    if (!url.startsWith('http://')) {
      console.warn(`${emoji.get('x')} ${url}`);
      continue;
    }

    //define filename
    const encodedURL = encodeURIComponent(url);
    let filename = item.date ? `${item.date}_${encodedURL}` : encodedURL;
    filename = prefixFilename ? `${prefixFilename}_${filename}` : filename;
    filename = filename.length > 128 ? filename.slice(0, 128) : filename;

    const result = await captureScreenshot(url, filename, index);

    index = index + 1;
    if (!result) fail.push(item);
  }

  return fail;
}

async function captureScreenshot(url: string, filename: string, index: number) {
  spinner.start(`Capturing ${blue(`${url}`)}`);

  try {
    const path = `${folderResult}/${filename}.${imageType}`;

    const page = await browser.newPage();
    await page.goto(url);
    await page.screenshot({ fullPage: true, path });

    spinner.stop();
    console.log(`${index} ${emoji.get('point_right')} ${path}`);
    return true;
  } catch (error) {
    spinner.stop();
    console.warn(`${index} ${emoji.get('x')} ${url}`);
    return false;
  }
}
