import chalk from 'chalk';
import fs from 'fs-extra';
import Papa from 'papaparse';
import mongoose from './db/mongoose.mjs';
import Competition from './models/competition.mjs';
import Dataset from './models/Dataset.mjs';
import User from './models/User.mjs';
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
		spinner.text = `Parsing ${item.title} [${i}/${collection.length}]`;
		if (item.details) await parseItem(item);
		addToNetvis(item);
		i++;
	}
	spinner.succeed('Data Parsed');

	//save networkk
	spinner.start('Saving Netvis');
	saveNetworkCSV(network);
	spinner.succeed('Netvis saved');
};

const parseItem = async (item) => {
	if (item.details.header.subTitle) item.subtitle = item.details.header.subTitle;
	if (item.details.header.organization) item.organizer = item.details.header.organization;

	if (item.details.overview.startDate) item.startDate = new Date(item.details.overview.startDate);
	if (item.details.overview.endDate) item.endDate = new Date(item.details.overview.endDate);
	if (item.details.overview.tags) item.tags = item.details.overview.tags;

	if (item.details.overview.teams)
		item.teams = Number(item.details.overview.teams.trim().replace(',', ''));
	if (item.details.overview.competitors)
		item.competitors = Number(item.details.overview.competitors.trim().replace(',', ''));

	if (item.details.data) item.datasetSlug = item.details.data.slug;

	if (item.details.leaderboard) {
		item.leaderboard = item.details.leaderboard.map((team) => {
			const rank = Number(team.rank);
			const entries = Number(team.entries);
			const score = Number(team.score);
			return {
				name: team.name,
				rank,
				entries,
				score,
				members: team.members,
			};
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

const addToNetvis = (item) => {
	spinner.text = `Adding ${item.title} to netvis`;
	//node Competition
	let nodeCompetition = network.nodes.find((node) => node.uri === item.uri);
	if (!nodeCompetition) {
		nodeCompetition = {
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

		if (item.startDate) nodeCompetition.year = item.startDate.getYear(),

		network.nodes.push(nodeCompetition);
	}

	// Node Team
	if (!item.leaderboard) return;

	item.leaderboard.forEach((team) => {

		//teams
		let nodeTeam = network.nodes.find((node) => node.name === team.name);
		if (!nodeTeam) {
			nodeTeam = {
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
			source: nodeCompetition.uri,
			target: nodeTeam.name
		});

		//members
		if (!team.members) return;

		team.members.forEach((member) => {
			let nodeMember = network.nodes.find((node) => node.name === `_${member}`);
			if (!nodeMember) {
				nodeMember = {
					type: 'user',
					name: `_${member}`,
				};
				network.nodes.push(nodeMember);
			}

			//edge
			network.edges.push({
				source: nodeTeam.name,
				target: nodeMember.name
			});
		});
	});
};

const saveNetworkCSV = async (data) => {
	//tranform
	const nodes = Papa.unparse(data.nodes, {
		delimiter: '\t',
		columns: ['type','name', 'uri', 'prize' , 'active', 'inClass', 'category','subCategory', 'year', 'teams', 'competitors', 'rank', 'score', 'entries']
	});
	const edges = Papa.unparse(data.edges, { delimiter: '\t' });
	
	//save
	const folder = 'netvis';
	if (!fs.existsSync(folder)) fs.mkdirSync(folder);
	await fs.writeFile(`${folder}/nodes.tsv`, nodes);
	await fs.writeFile(`${folder}/edges.tsv`, edges);
};

const getCollection = async (database) => {
	if (database === 'competition') return await Competition.find();
	if (database === 'dataset') return await Dataset.find();
	if (database === 'user') return await User.find();
};

start();
