import chalk from 'chalk';
import mongoose from '../db/mongoose.mjs';
import Competition from '../models/competition.mjs';
import Dataset from '../models/Dataset.mjs';
import User from '../models/User.mjs';
import ora from 'ora';

let spinner;

const network = {
  nodes: [],
  edges: [],
};

const start = async () => {
  spinner = ora({ spinner: 'dots' });
  console.log(chalk.blue('Parsing'));

  if (await mongoose.connect()) await parse();

  mongoose.close();
  console.log(chalk.blue('\nDone'));
};

const parse = async () => {
  const collection = await getCollection('competition');
  spinner.start('Parsing');
  let i = 1;
  for await (const item of collection) {
    // spinner.text = `Parsing ${item.title} [${i}/${collection.length}]`;
    console.log(`Parsing ${item.title} [${i}/${collection.length}]`);
    if (item.details) await parseItem(item);
    i++;
  }
  spinner.succeed('Data Parsed');
};

const parseItem = async (item) => {
  if (item.details.header.subTitle) item.subtitle = item.details.header.subTitle;
  if (item.details.header.organization) item.organization = item.details.header.organization;

  if (item.details.overview.startDate) item.startDate = new Date(item.details.overview.startDate);
  if (item.details.overview.endDate) item.endDate = new Date(item.details.overview.endDate);
  if (item.details.overview.tags) item.tags = item.details.overview.tags;

  if (item.details.overview.teams) item.teams = Number(item.details.overview.teams.trim().replace(',', ''));
  if (item.details.overview.competitors)
    item.competitors = Number(item.details.overview.competitors.trim().replace(',', ''));

  if (item.details.data) item.datasetSlug = item.details.data.slug;

  if (item.details.leaderboard) {
    item.leaderboard = item.details.leaderboard.map((team) => {
      const rank = Number(team.rank);
      const entries = Number(team.entries);
      const score = Number(team.score);

      return { name: team.name, rank, entries, score, members: team.members };
    });
  }

  //SAVE
  item.details = undefined;
  item.relativeDeadline = undefined;
  delete item.details;

  await save(item);
};

const save = async (item) => {
  await item.save();
};

const getCollection = async (database) => {
  if (database === 'competition') return await Competition.find();
  if (database === 'dataset') return await Dataset.find();
  if (database === 'user') return await User.find();
};

start();
