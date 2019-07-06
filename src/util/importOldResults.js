
require('dotenv').config();
const chalk = require('chalk');
const fs = require('fs');
const util = require('util');
const mongoose = require('../db/mongoose');
const { DateTime } = require('luxon');

const {addUser} = require('../router/user');
const {addDataset} = require('../router/dataset');
const {addCompetition} = require('../router/competition');
const {addDay} = require('../router/ranking');
const {UserRanking, CompetitionRanking, DatasetRanking} = require('../models/ranking');


const readFile = util.promisify(fs.readFile);
const folder = './pastresults/json';

const targets = [
	{
		type: 'users',
		startDate: DateTime.local(2019,2,16),
		endDate: DateTime.local(2019,6,29)
	},
	{
		type: 'datasets',
		startDate: DateTime.local(2019,2,16),
		endDate: DateTime.local(2019,5,25)
	},
	{
		type: 'competitions',
		startDate: DateTime.local(2019,2,16),
		endDate: DateTime.local(2019,6,9)
	}
];

const run = async () => {

	await mongoose.connect();

	console.log(chalk.blue('Importing old results'));
	
	for (const target of targets) {
		console.log(chalk.green(`\nImporting ${target.type}`));
		console.log('Cheking available dates');

		const files = checkAvailableDates(target);
		await importData(target, files);
	}

	mongoose.close();
	//done
	console.log('\n');
	console.log(chalk.blue('Done'));

};

const checkAvailableDates = ({type, startDate, endDate}) => {

	let date = startDate;
	let fileName;
	let files = [];

	while (date <= endDate) {
		fileName = `kaggle-top-${type}-${date.toISODate()}.json`;
		if (fs.existsSync(`${folder}/${fileName}`)) {
			files.push(fileName);

			// console.log(`:: ${date.toISODate()}`, chalk.keyword('darkslategray')(`√ ${fileName}`));
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write(`:: ${date.toISODate()}`);
			process.stdout.write(chalk.keyword('darkslategray')(` √ ${fileName}`));
			process.stdout.clearLine();
			
		} else {
			// console.log(`:: ${date.toISODate()}`, chalk.keyword('sienna')(`x ${fileName} doesn't exist`));
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write(`:: ${date.toISODate()}`);
			process.stdout.write(chalk.keyword('sienna')(` x ${fileName}  doesn't exist`));
			process.stdout.write('\n');
		}
		date = date.plus({days:1});
	}

	return files;

};

const importData = async ({type}, files) => {

	//loop through files
	console.log('\nLoading data');
	for (const file of files) {

		console.log(chalk.keyword('dodgerblue')(`:: ${file}`));

		const rawdata = await readFile(`${folder}/${file}`);
		const data = JSON.parse(rawdata);

		if (type == 'users') {
			await parseUsers(data);
		} else if (type == 'datasets') {
			await parseDatasets(data);
		} else if (type == 'competitions') {
			await parseCompetitions(data);
		}

		console.log(chalk.gray('-----'));

	}

	return true;

};

const parseUsers = async ({date, data}) => {

	// create ranking day
	const rankDay = {
		type: 'Users',
		date: new Date(date),
		ranking: []
	};

	const collection = [];

	for (const item of data) {

		console.log(chalk.grey(`:: ${item.displayName}`));

		const user = {
			name: item.displayName.trim(),
			endpoint: item.userUrl.trim(),
			joinedDate: new Date(item.joined),
			tier: item.tier.trim(),
			points: item.points,
			medals: {
				gold: item.totalGoldMedals,
				silver: item.totalSilverMedals,
				bronze: item.totalBronzeMedals
			},
			createdAt: new Date(date)
		};

		
		collection.push(user);

		const newUser = await addUser(user);

		// console.log(newUser.name);

		rankDay.ranking.push(new UserRanking({
			position: item.currentRanking,
			user: newUser._id,
			name: newUser.name,
			endpoint: newUser.endpoint
		}));

	}

	await addDay(rankDay);

	return collection;

};

const parseDatasets = async ({date, data}) => {

	// create ranking day
	const rankDay = {
		type: 'Datasets',
		date: new Date(date),
		ranking: []
	};

	const collection = [];
	let rank = 1;

	for (const item of data) {

		console.log(chalk.grey(`:: ${item.title}`));

		//-- files
		let fileTypes = [];
		let numFiles = 0;
		for (const files of item.commonFileTypes) {
			numFiles += files.count,
			fileTypes.push(files.fileType);
		}
		const fileTypesSet = new Set(fileTypes);
		fileTypes = [... fileTypesSet];

		//-- tags
		let tags = [];
		for (const cat of item.categories) {
			tags.push(cat.name);
		}

		let usability = '';
		if (item.usabilityRating) usability = item.usabilityRating.score;

		const dataset = {
			title: item.title.trim(),
			endpoint: item.datasetUrl.trim(),
			description: item.overview.trim(),
			uploadedAt: new Date(item.dateUpdated),
			owner: item.ownerName.trim(),
			ownerEndpoint: item.ownerUrl.trim(),
			license: item.licenseName.trim(),
			usability: usability,
			size: item.datasetSize,
			files: {
				numFiles: numFiles,
				fileTypes: fileTypes
			},
			tags: tags,
			upvotes: item.totalVotes,
			createdAt: new Date(date)
		};

		rank += 1; 	//update ranking

		const newDataset = await addDataset(dataset);

		// console.log(newDataset.title);

		rankDay.ranking.push(new DatasetRanking({
			position: rank,
			dataset: newDataset._id,
			title: newDataset.title,
			endpoint: newDataset.endpoint
		}));
	}

	await addDay(rankDay);

	return collection;

};

const parseCompetitions = async ({date, data}) => {

	// create ranking day
	const rankDay = {
		type: 'Competitions',
		date: new Date(date),
		ranking: []
	};

	const collection = [];
	let rank = 1;

	for (const item of data) {

		console.log(chalk.grey(`:: ${item.competitionTitle}`));

		//-- tags
		let tags = [];
		for (const cat of item.categories) {
			tags.push(cat.name);
		}

		//crate obj
		const competition = {
			title: item.competitionTitle.trim(),
			endpoint: item.competitionUrl.trim(),
			description: item.competitionDescription.trim(),
			organization: item.organizationName,
			deadline: item.deadline.trim(),
			type: item.hostSegmentTitle.trim(),
			tags: tags,
			prize: item.rewardDisplay.trim(),
			teamsTotal: item.totalTeams,
			createdAt: new Date(date)
		};

		rank += 1; 	//update ranking

		const newCompetition = await addCompetition(competition);

		// console.log(newCompetition.title);

		rankDay.ranking.push(new CompetitionRanking({
			position: rank,
			competition: newCompetition._id,
			title: newCompetition.title,
			endpoint: newCompetition.endpoint
		}));
	}

	await addDay(rankDay);

	return collection;

};

run();