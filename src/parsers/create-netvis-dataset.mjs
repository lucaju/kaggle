import chalk from 'chalk';
import fs from 'fs-extra';
import Papa from 'papaparse';
import mongoose from '../db/mongoose.mjs';
import Competition from '../models/competition.mjs';
import Dataset from '../models/Dataset.mjs';
import User from '../models/User.mjs';
import ora from 'ora';

const spinner = ora({ spinner: 'dots' });

const network = {
  nodes: [],
  edges: [],
};

const config = {
  source: 'competition',
  competiton: {
    useTeam: false,
    useMembers: true,
    useInclass: false,
  },
};

const start = async () => {
  console.log(chalk.blue('Parsing'));

  const connection = await mongoose.connect();
  if (!connection) {
    console.log(chalk.blue('\nConnection error'));
    return;
  }

  await parseNetwork();
  await saveNetworkCSV(network);

  mongoose.close();
  console.log(chalk.blue('\nDone'));
};

const parseNetwork = async () => {
  console.log(chalk.blue('Fetching data'));
  const collection = await getCollection(config.source);

  spinner.start({
    prefixText: 'Parsing',
    text: '',
  });

  collection.forEach((item, i) => {
    console.log(`Parsing ${item.title} [${i}/${collection.length}]`);
    if (config.source === 'competition') parseCompetition(item);
  });

  spinner.succeed({
    prefixText: '',
    text: 'Data Parsed',
  });
};

const parseCompetition = (item) => {
  spinner.prefixText = `${item.title}`;
  spinner.text = ``;
  //node Competition
  let nodeCompetition = network.nodes.find((node) => node.uri === item.uri);

  if (!nodeCompetition) {
    nodeCompetition = {
      id: item.uri,
      label: item.title,
      type: 'competition',
      name: item.title,
      uri: item.uri,
      prize: item.prize,
      active: item.active,
      inClass: item.inClass,
      category: item.category,
      subCategory: item.subCategory,
      teams: item.teams,
      competitors: item.competitors,
    };

    if (item.startDate) nodeCompetition.year = item.startDate.getYear();

    network.nodes.push(nodeCompetition);
  }

  // Node Team
  if (!item.leaderboard) return;

  item.leaderboard.forEach((team) => {
    parseCompetitionTeam(nodeCompetition, team);
  });
};

const parseCompetitionTeam = (nodeCompetition, team) => {
  spinner.text = team.name;
  //teams
  let nodeTeam;
  if (config.competiton.useTeam) {
    nodeTeam = network.nodes.find((node) => node.name === team.name);

    if (!nodeTeam) {
      nodeTeam = {
        id: `${team.name}-${nodeCompetition.id}`,
        label: team.name,
        type: 'team',
        name: team.name,
        rank: team.rank,
        score: team.score,
        entries: team.entries,
      };

      network.nodes.push(nodeTeam);
    }

    //edge
    network.edges.push({
      source: nodeCompetition.id,
      target: nodeTeam.name,
    });
  }

  //members
  if (!team.members) return;

  if (config.competiton.useMembers) {
    const memberSource = config.competiton.useTeam ? nodeTeam : nodeCompetition;
    team.members.forEach((member) => {
      parseCompetitionTeamdMember(memberSource, member);
    });
  }
};

const parseCompetitionTeamdMember = (source, member) => {
  spinner.text = member.name;
  let nodeMember = network.nodes.find((node) => node.name === `_${member}`);

  if (!nodeMember) {
    nodeMember = {
      id: `_${member}`,
      label: `_${member}`,
      type: 'user',
      name: `_${member}`,
    };

    network.nodes.push(nodeMember);
  }

  //edge
  network.edges.push({
    source: source.id,
    target: nodeMember.name,
  });
};

const saveNetworkCSV = async (data) => {
  spinner.start('Saving Netvis');

  //tranform
  const nodes = Papa.unparse(data.nodes, {
    delimiter: '\t',
    columns: [
      'id',
      'label',
      'type',
      'name',
      'uri',
      'prize',
      'active',
      'inClass',
      'category',
      'subCategory',
      'year',
      'teams',
      'competitors',
    ],
  });
  const edges = Papa.unparse(data.edges, { delimiter: '\t' });

  //save
  const folder = 'netvis';
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
  await fs.writeFile(`${folder}/nodes.tsv`, nodes);
  await fs.writeFile(`${folder}/edges.tsv`, edges);

  spinner.succeed('Netvis saved');
};

const getCollection = async (database) => {
  if (database === 'competition') return await Competition.find({ inClass: config.competiton.useInclass });
  if (database === 'dataset') return await Dataset.find();
  if (database === 'user') return await User.find();
};

start();
