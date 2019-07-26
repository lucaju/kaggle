const {Ranking, UserRanking, CompetitionRanking, DatasetRanking} = require('../models/ranking');
const {addUser, getLogUsers} = require('../router/user');
const {addCompetition, getLogCompetitions} = require('../router/competition');
const {addDataset, getLogDatasets} = require('../router/dataset');
const chalk = require('chalk');

const {logMessage, logError} = require('../logs/datalog');

const addRanking = async (type, collection) => {

	console.log(chalk.grey('\nSaving into database...'));

	const rankingData = {
		type,
		ranking: []
	};

	for (const data of collection) {

		let rankItem;

		if (type == 'users') {
			rankItem = await getUser(data);
		} else if (type == 'competitions') {
			rankItem = await getCompetition(data);
		} else if (type == 'datasets') {
			rankItem = await getDataset(data);
		}

		rankingData.ranking.push(rankItem);

	}

	//add ranking
	insertRanking(rankingData);

	//logs
	const log = getLog(type);
	const itemsAdded = log.filter( item => item.status == 'added');
	const itemsUpdated = log.filter( item => item.status == 'updated');

	logMessage(`${type}`,log);
	logMessage('Ranking',`${rankingData.ranking.length} ${type}.`);

	console.log(
		chalk.keyword('olive')(`${itemsAdded.length} ${type} added.`),
		chalk.keyword('orange')(`${itemsUpdated.length} ${type} updated.`),
		chalk.keyword('khaki')(`${rankingData.ranking.length} ${type} ranked.\n`)
	);

};

const addDay = async day => {
	return await insertRanking(day);
};

const getUser = async (data) => {

	const user = await addUser(data);

	const rankItem = new UserRanking({
		position: data.rank,
		user: user._id,
		name: user.name,
		endpoint: user.endpoint
	});

	return rankItem;

};

const getCompetition = async (data) => {

	const competition = await addCompetition(data);

	const rankItem = new DatasetRanking({
		position: data.rank,
		competition: competition._id,
		title: competition.title,
		endpoint: competition.endpoint
	});

	return rankItem;

};

const getDataset = async (data) => {

	const dataset = await addDataset(data);

	const rankItem = new CompetitionRanking({
		position: data.rank,
		dataset: dataset._id,
		title: dataset.title,
		endpoint: dataset.endpoint
	});

	return rankItem;

};

const insertRanking = async data => {
	const ranking = new Ranking(data);

	try {
		return await ranking.save();
	} catch (err) {
		console.log(`MongoDB coudnn't insert ranking on this date: ${new Date()}: ${err}`);
		logError(`MongoDB coudnn't insert ranking on this date: ${new Date()}: ${err}`);
	}
};

const getLog = type => {

	let log;

	if (type == 'users') {
		log = getLogUsers();
	} else if (type == 'competitions') {
		log = getLogCompetitions();
	} else if (type == 'datasets') {
		log = getLogDatasets();
	}

	return log;
};


module.exports = {
	addRanking,
	addDay
};