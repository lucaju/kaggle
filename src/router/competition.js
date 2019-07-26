const Competition = require('../models/competition');
const chalk = require('chalk');
const {logMessage, logError} = require('../logs/datalog');

let itemsAdded = 0;
let itemsUpdated = 0;

const log = [];

const addCompetitions = async collection => {

	console.log(chalk.grey('\nSaving into database...'));

	for (const data of collection) {
		await addCompetition(data);
	}

	logMessage('Competittion', `${itemsAdded} added. ${itemsUpdated} updated.`);

	console.log(
		chalk.keyword('olive')(`${itemsAdded} competitions added.`),
		chalk.keyword('orange')(`${itemsUpdated} competitions updated.`)
	);
};

const findUserByTitle = async title => {
	return await Competition.findOne({title});
};

const addCompetition = async data => {
	
	let competition = await findUserByTitle(data.title);

	if (!competition) {
		competition = await insertCompetition(data);
		if (competition) itemsAdded++;
		if (competition) log.push({tile:competition.title, status: 'added'});
	} else {
		competition = await updateCompetition(competition, data);
		if (competition) itemsUpdated++;
		if (competition) log.push({tile:competition.title, status: 'updated'});
	}

	return competition;

};

const insertCompetition = async data => {
	const competition = new Competition(data);
	
	try {
		return await competition.save();
	} catch (err) {
		console.log(`MongoDB did not insert competition ${competition.title}: ${err}`);
		logError('MongoDB',`MongoDB did not insert competition ${competition.title}: ${err}`);
	}
};

const updateCompetition = async (competition, data) => {

	if (data.description != '' && competition.description != data.description) competition.description = data.description;
	if (data.deadline != '' && competition.deadline != data.deadline) competition.deadline = data.deadline;
	if (data.organization != '' && competition.organization != data.organization) competition.organization = data.organization;
	if (data.type != '' && competition.type != data.type) competition.type = data.type;
	if (data.tags.length > 0 && competition.tags.join() != data.tags.join()) competition.tags = data.tags;
	if (data.prize != '' && competition.prize != data.prize) competition.prize = data.prize;
	if (data.teamsTotal && competition.teamsTotal != data.teamsTotal) competition.teamsTotal = data.teamsTotal;

	try {
		return await competition.save();
	} catch (err) {
		console.log(`MongoDB did not update competition ${competition.title}: ${err}`);
		logError('MongoDB',`MongoDB did not update competition ${competition.title}: ${err}`);
	}
};

const getLogCompetitions = () => {
	// return {
	// 	itemsAdded,
	// 	itemsUpdated
	// };

	return log;
};

module.exports = {
	addCompetitions,
	addCompetition,
	getLogCompetitions
};