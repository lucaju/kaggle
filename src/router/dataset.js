const Dataset = require('../models/dataset');
const chalk = require('chalk');
const {logMessage, logError} = require('../logs/datalog');

let itemsAdded = 0;
let itemsUpdated = 0;

const log = [];

const addDatasets = async collection => {

	console.log(chalk.grey('\nSaving into database...'));

	for (const data of collection) {
		await addDataset(data);
	}

	logMessage('Datasets', `${itemsAdded} added. ${itemsUpdated} updated.`);

	console.log(
		chalk.keyword('olive')(`${itemsAdded} datasets added.`),
		chalk.keyword('orange')(`${itemsUpdated} datasets updated.`)
	);

};

const findDatasetByTitle = async title => {
	return await Dataset.findOne({title});
};

const addDataset = async data => {
	
	let dataset = await findDatasetByTitle(data.title);

	if (!dataset) {
		dataset = await insertDataset(data);
		if (dataset) itemsAdded++;
		if (dataset) log.push({tile:dataset.title, status: 'added'});
	} else {
		dataset = await updateDataset(dataset, data);
		if (dataset) itemsUpdated++;
		if (dataset) log.push({tile:dataset.title, status: 'updated'});
	}

	return dataset;

};

const insertDataset = async data => {
	const dataset = new Dataset(data);
	
	try {
		return await dataset.save();
	} catch (err) {
		console.log(`MongoDB did not insert dataset ${dataset.title}: ${err}`);
		logError('MongoDB',`MongoDB did not insert dataset ${dataset.title}: ${err}`);
	}
};

const updateDataset = async (datatset, data) => {

	if (data.description != ''&& datatset.description != data.description) datatset.description = data.description;
	if (data.license != ''&& datatset.license != data.license) datatset.license = data.license;
	if (data.usability && datatset.usability != data.usability) datatset.usability = data.usability;
	if (data.size && datatset.size != data.size) datatset.size = data.size;
	if (data.files && data.files.numFiles && datatset.files.numFiles != data.files.numFiles) {
		datatset.files.numFiles = data.files.numFiles;
		datatset.files.fileTypes = data.files.fileTypes;
	}
	if (data.tags.length > 0 && datatset.tags.join() != data.tags.join()) datatset.tags = data.tags;
	if (data.upvotes && datatset.upvotes != data.upvotes) datatset.upvotes = data.upvotes;

	try {
		return await datatset.save();
	} catch (err) {
		console.log(`MongoDB did not update dataset ${datatset.title}: ${err}`);
		logError('MongoDB',`MongoDB did not update dataset ${datatset.title}: ${err}`);
	}
};

const getLogDatasets = () => {
	// return {
	// 	itemsAdded,
	// 	itemsUpdated
	// };

	return log;
};

module.exports = {
	addDatasets,
	addDataset,
	getLogDatasets
};