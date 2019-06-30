const chalk = require('chalk');
const fs = require('fs');
const util = require('util');
const mongoose = require('../db/mongoose');
const { DateTime } = require('luxon');

const {addUsers} = require('../router/user');
const {addDatasets} = require('../router/dataset');
const {addCompetitions} = require('../router/competition');

const readFile = util.promisify(fs.readFile);
const folder = './results';

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

	while (date < endDate) {
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

		let collection;

		if (type == 'users') {
			collection = parseUsers(data);
			await addUsers(collection);
		} else if (type == 'datasets') {
			collection = parseDatasets(data);
			await addDatasets(collection);
		} else if (type == 'competitions') {
			collection = parseCompetitions(data);
			await addCompetitions(collection);
		}

		console.log(chalk.gray('-----'));

	}

};

const parseUsers = ({date, data}) => {

	const collection = [];

	for (const item of data) {

		// console.log(chalk.grey(`:: ${item.displayName}`));

		const user = {
			name: item.displayName,
			endpoint: item.userUrl,
			joinedDate: item.joined,
			tier: item.tier,
			points: item.points,
			medals: {
				gold: item.totalGoldMedals,
				silver: item.totalSilverMedals,
				bronze: item.totalBronzeMedals
			},
			rank: {
				date: date,
				rank: item.currentRanking
			},
			addAt: date
		};

		collection.push(user);
	}

	return collection;

};

const parseDatasets = ({date, data}) => {

	const collection = [];
	let rank = 1;

	for (const item of data) {

		// console.log(chalk.grey(`:: ${item.title}`));

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

		//crate obj

		const dataset = {
			title: item.title,
			endpoint: item.datasetUrl,
			description: item.overview,
			createdAt: item.dateUpdated,
			owner: item.ownerName,
			userEndpoint: item.ownerUrl,
			license: item.licenseName,
			size: item.datasetSize,
			files: {
				numFiles: numFiles,
				fileTypes: fileTypes
			},
			tags: tags,
			upvotes: item.totalVotes,
			rank: {
				date: new Date(),
				rank: rank
			},
			addAt: date
		};

		rank += 1; 	//update ranking

		collection.push(dataset);
	}

	return collection;

};

const parseCompetitions = ({date, data}) => {

	const collection = [];
	let rank = 1;

	for (const item of data) {

		// console.log(chalk.grey(`:: ${item.competitionTitle}`));

		//-- tags
		let tags = [];
		for (const cat of item.categories) {
			tags.push(cat.name);
		}

		//crate obj
		const dataset = {
			title: item.competitionTitle,
			endpoint: item.competitionUrl,
			description: item.competitionDescription,
			deadline: item.deadline,
			type: item.hostSegment,
			tags: tags,
			prize: item.rewardDisplay,
			teamsTotal: item.totalTeams,
			organization: item.organizationName,
			rank: {
				date: new Date(),
				rank: rank
			},
			addAt: date
		};

		rank += 1; 	//update ranking

		collection.push(dataset);
	}

	return collection;

};

run();