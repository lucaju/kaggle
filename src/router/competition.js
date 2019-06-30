const Competition = require('../models/competition');
const chalk = require('chalk');

const {logMessage, logError} = require('../logs/datalog');

const addCompetitions = async collection => {

	console.log(chalk.grey('\nSaving into database...'));

	let itemsAdded = 0;
	let itemsUpdated = 0;

	for (const data of collection) {

		const competition = await findUserByTitle(data.title);

		if (!competition) {
			const newItem = await addCompetition(data);
			if (newItem) itemsAdded += 1;
		} else {
			const itemUpdated = await updateCompetition(competition, data);
			if (itemUpdated) itemsUpdated += 1;
		}

	}

	logMessage(`COMPETITIONS: ${itemsAdded} users added. ${itemsUpdated} users updated.`);

	console.log(
		chalk.keyword('olive')(`${itemsAdded} competitions added.`),
		chalk.keyword('orange')(`${itemsUpdated} competitions updated.`)
	);
};

const findUserByTitle = async title => {
	return await Competition.findOne({title});
};

const addCompetition = async data => {
	const competition = new Competition(data);
	
	try {
		return await competition.save();
	} catch (err) {
		console.log(`MongoDB did not inserted competition ${competition.title}: ${err}`);
		logError(`MongoDB did not inserted competition ${competition.title}: ${err}`);
	}
};

const updateCompetition = async (competition, data) => {

	if (data.description != '' && competition.description != data.description) competition.description = data.description;
	if (data.deadline != '' && competition.deadline != data.deadline) competition.deadline = data.deadline;
	if (data.type != '' && competition.type != data.type) competition.type = data.type;
	if (data.tags.length > 0 && competition.tags.join() != data.tags.join()) competition.tags = data.tags;
	if (data.prize != '' && competition.prize != data.prize) competition.prize = data.prize;
	if (data.teamsTotal && competition.teamsTotal != data.teamsTotal) competition.teamsTotal = data.teamsTotal;
	if (data.rank) competition.rank.push(data.rank);

	try {
		return await competition.save();
	} catch (err) {
		console.log(`MongoDB did not update competition ${competition.title}: ${err}`);
		logError(`MongoDB did not update competition ${competition.title}: ${err}`);
	}
};

module.exports = {
	addCompetitions,
	addCompetition
};