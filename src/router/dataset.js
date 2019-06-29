const Dataset = require('../models/dataset');
const chalk = require('chalk');

const addDatasets = async collection => {

	console.log(chalk.grey('\nSaving into database...'));

	let itemsAdded = 0;
	let itemsUpdated = 0;

	for (const data of collection) {

		const dataset = await findDatasetByTitle(data.title);

		if (!dataset) {
			const newItem = await addDataset(data);
			if (newItem) itemsAdded += 1;
		} else {
			const itemUpdated = await updateDataset(dataset, data);
			if (itemUpdated) itemsUpdated += 1;
		}

	}

	console.log(
		chalk.keyword('olive')(`${itemsAdded} datasets added.`),
		chalk.keyword('orange')(`${itemsUpdated} datasets updated.`)
	);

};

const findDatasetByTitle = async title => {
	try {
		return await Dataset.findOne({title});
	} catch (err) {
		console.log(err);
	}
};

const addDataset = async data => {
	const dataset = new Dataset(data);
	
	try {
		await dataset.save();
		return dataset;
	} catch (e) {
		console.log(e);
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

	if (data.rank) datatset.rank.push(data.rank);

	try {
		return await datatset.save();
	} catch (e) {
		console.log(e);
	}
};

module.exports = {
	addDatasets,
	addDataset
};