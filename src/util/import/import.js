require('dotenv').config();
const chalk = require('chalk');
const fs = require('fs');
const util = require('util');
const mongoose = require('../db/mongoose');
const { DateTime } = require('luxon');

const { addUser, getLogUsers } = require('../router/user');
const { addDataset, getLogDatasets } = require('../router/dataset');
const { addCompetition, getLogCompetitions } = require('../router/competition');
const { addDay } = require('../router/ranking');

const readFile = util.promisify(fs.readFile);
const folder = './pastresults/db';

const rankings = {
  Users: [],
  Competitions: [],
  Datasets: [],
};

const targets = ['Users', 'Datasets', 'Competitions'];

const run = async () => {
  await mongoose.connect();

  console.log(chalk.blue('Importing...'));

  for (const target of targets) {
    console.log(chalk.green(`\nImporting ${target.type}`));
    await importData(target);
  }

  mongoose.close();
  //done
  console.log('\n');
  console.log(chalk.blue('Done'));
};

const importData = async (type) => {
  //loop through files
  console.log('\nLoading data');

  console.log(chalk.keyword('dodgerblue')(`:: ${type}.json`));

  const rawdata = await readFile(`${folder}/${type}.json`);
  const data = JSON.parse(rawdata);

  if (type == 'Users') {
    await parseUsers(data);
  } else if (type == 'Datasets') {
    await parseDatasets(data);
  } else if (type == 'Competitions') {
    await parseCompetitions(data);
  }

  console.log('-----\n');

  console.log(chalk.keyword('dodgerblue')('saving ranking'));
  for (const day of rankings[type]) {
    console.log(chalk.keyword('orange')(day.date), chalk.gray(` | ${day.ranking.length}`));
    await addDay(day);
  }
};

const parseUsers = async (data) => {
  console.log(chalk.keyword('green')('Loop through users'));

  for (const item of data) {
    console.log(chalk.green(`:: ${item.name}`));

    const user = {
      name: item.name.trim(),
      endpoint: item.endpoint.trim(),
      joinedDate: new Date(item.joinedDate.$date),
      tier: item.tier.trim(),
      points: item.points,
      medals: {
        gold: item.medals.gold,
        silver: item.medals.silver,
        bronze: item.medals.bronze,
      },
      createdAt: new Date(item.addAt.$date),
    };

    for (const rank of item.rank) {
      const d = DateTime.fromISO(rank.date.$date);
      const o = DateTime.local(2019, 6, 29);
      if (d > o) {
        const newUser = await addUser(user);
        console.log(chalk.gray(`:: ${newUser.name} :: ${rank.date.$date}`));

        addToUserRanking('Users', rank, newUser);
      }
    }

    console.log(chalk.gray('-----'));
  }

  const log = getLogUsers();
  console.log(log);
};

const addToUserRanking = (type, { date, rank }, { id, name, endpoint }) => {
  const item = {
    position: rank,
    user: id,
    name,
    endpoint,
  };

  let day = rankings[type].find((d) => new Date(d.date).toDateString() == new Date(date.$date).toDateString());

  if (!day) {
    console.log(chalk.keyword('orange')(`create new day: ${date.$date}`));
    day = {
      type,
      date: date.$date,
      ranking: [],
    };

    rankings[type].push(day);
  }

  day.ranking.push(item);
};

const parseDatasets = async (data) => {
  console.log(chalk.keyword('green')('Loop through datasets'));

  for (const item of data) {
    console.log(chalk.green(`:: ${item.title}`));

    const dataset = {
      title: item.title.trim(),
      endpoint: item.endpoint.trim(),
      description: item.description.trim(),
      uploadedAt: new Date(item.createdAt.$date),
      owner: item.owner.trim(),
      ownerEndpoint: item.userEndpoint.trim(),
      license: item.license.trim(),
      usability: item.usability,
      size: item.size,
      files: item.files,
      tags: item.tags,
      upvotes: item.upvotes,
      createdAt: new Date(item.addAt.$date),
    };

    for (const rank of item.rank) {
      const d = DateTime.fromISO(rank.date.$date);
      const o = DateTime.local(2019, 7, 2);
      if (d > o) {
        const newDataset = await addDataset(dataset);

        console.log(chalk.gray(`:: ${newDataset.title} :: ${rank.date.$date}`));
        addToDatasetRanking('Datasets', rank, newDataset);
      }
    }
  }

  const log = getLogDatasets();
  console.log(log);
};

const addToDatasetRanking = (type, { date, rank }, { id, title, endpoint }) => {
  const item = {
    position: rank,
    dataset: id,
    title,
    endpoint,
  };

  let day = rankings[type].find((d) => new Date(d.date).toDateString() == new Date(date.$date).toDateString());

  if (!day) {
    console.log(chalk.keyword('orange')('create new day'));
    day = {
      type,
      date: date.$date,
      ranking: [],
    };

    rankings[type].push(day);
  }

  day.ranking.push(item);
};

const parseCompetitions = async (data) => {
  console.log(chalk.keyword('green')('Loop through competitions'));

  for (const item of data) {
    console.log(chalk.green(`:: ${item.title}`));

    const competition = {
      title: item.title.trim(),
      endpoint: item.endpoint.trim(),
      description: item.description.trim(),
      organization: item.organization,
      deadline: item.deadline.trim(),
      type: item.type.trim(),
      tags: item.tags,
      prize: item.prize.trim(),
      teamsTotal: item.teamsTotal,
      upvotes: item.upvotes,
      createdAt: new Date(item.addAt.$date),
    };

    for (const rank of item.rank) {
      const d = DateTime.fromISO(rank.date.$date);
      const o = DateTime.local(2019, 7, 2);
      if (d > o) {
        const newCompetition = await addCompetition(competition);
        console.log(chalk.gray(`:: ${newCompetition.title} :: ${rank.date.$date}`));

        addToCompetionRanking('Competitions', rank, newCompetition);
      }
    }
  }

  const log = getLogCompetitions();
  console.log(log);
};

const addToCompetionRanking = (type, { date, rank }, { id, title, endpoint }) => {
  const item = {
    position: rank,
    dataset: id,
    title,
    endpoint,
  };

  let day = rankings[type].find((d) => new Date(d.date).toDateString() == new Date(date.$date).toDateString());

  if (!day) {
    console.log(chalk.keyword('orange')('create new day'));
    day = {
      type,
      date: date.$date,
      ranking: [],
    };

    rankings[type].push(day);
  }

  day.ranking.push(item);
};

run();
