const Competition = require('../models/competition');
const chalk = require('chalk');

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

	console.log(
		chalk.keyword('olive')(`${itemsAdded} competitions added.`),
		chalk.keyword('orange')(`${itemsUpdated} competitions updated.`)
	);
};

const findUserByTitle = async title => {
	try {
		return await Competition.findOne({title});
	} catch (err) {
		console.log(err);
	}
};

const addCompetition = async data => {
	const competion = new Competition(data);
	
	try {
		return await competion.save();
	} catch (e) {
		console.log(e);
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
	} catch (e) {
		console.log(e);
	}
};

module.exports = {
	addCompetitions,
	addCompetition
};