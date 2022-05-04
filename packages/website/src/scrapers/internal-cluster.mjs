import chalk from 'chalk';
import fs from 'fs-extra';
import jsonfile from 'jsonfile';
import { Cluster } from 'puppeteer-cluster';
import mongoose from '../db/mongoose.mjs';
import clusterError from '../log/cluster_error.json';
import Competition from '../models/competition.mjs';
import { scraper } from '../scraper/internal/competition.mjs';
import { config } from './scraper/internal/config.mjs';

//
const target = config.targets[0];
const errorLog = [];

const clusterConfig = config.clusterConfig;
clusterConfig.concurrency = Cluster.CONCURRENCY_BROWSER;

const run = async () => {
  //connect to mongoose
  if (await mongoose.connect()) await scrape();

  //done
  mongoose.close();
  console.log(chalk.blue('\nDone'));
};

const scrape = async () => {
  //launch
  const cluster = await Cluster.launch(clusterConfig);

  // Event handler to be called in case of problems
  cluster.on('taskerror', (error, data, willRetry) => {
    if (willRetry) {
      console.warn(`Encountered an error while crawling ${data.uri}. ${error.message}\nThis job will be retried`);
    } else {
      errorLog.push({ date: new Date(), error, title: data.title, uri: data.uri });
    }
  });

  await cluster.task(async ({ page, data: item }) => {
    await scraper({ item, target, page });
  });

  //get collection and add titems to to the queue line
  let collection = await getCollection();
  if (!collection) return;

  collection = collection.filter((item) => {
    let match = false;
    for (const error of clusterError) {
      if (item.uri === error.uri) {
        match = true;
        break;
      }
    }
    if (!match) return item;
  });

  // queue
  collection.map((entry) => {
    entry.url = entry.uri;
    cluster.queue(entry);
  });

  //end
  await cluster.idle();
  await cluster.close();

  //log error if any
  if (errorLog.length > 0) saveToJson('cluster_error', errorLog);
};

const getCollection = async () => {
  const limit = clusterError ? config.limit + clusterError.length : config.limit;
  let collection;
  if (target.name === 'competition') {
    collection = await Competition.find(config.filter).limit(limit);
  }
  return collection;
};

const saveToJson = async (name, data) => {
  const folder = './log';
  const fileName = `${name}.json`;
  const jsonOptions = { spaces: 4 };

  //Save Json file
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
  await jsonfile.writeFile(`${folder}/${fileName}`, data, jsonOptions);
};

run();