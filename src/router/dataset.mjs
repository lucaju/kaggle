import Dataset from '../models/dataset.mjs';
import { logError } from '../logs/datalog.mjs';

export const saveDataset = async (data) => {
	let status = 'inserted';
	let dataset = await findDatasetByUri(data.uri);

	if (!dataset) {
		status = 'inserted';
		dataset = await insert(data);
	} else {
		status = 'updated';
		dataset = await update(dataset, data);
	}

	return {
		dataset,
		status,
	};
};

const findDatasetByUri = async (title) => {
	return await Dataset.findOne({ title });
};

const insert = async (data) => {
	const dataset = new Dataset(data);

	return await dataset.save().catch((error) => {
		const msg = {
			title: 'MongoDB',
			message: `MongoDB did not insert datatset ${dataset.title}: ${error}`,
		};
		logError(msg);
		return { error: msg };
	});
};

const update = async (datatset, data) => {
	if (data?.uploadedAtRelative !== '') datatset.uploadedAtRelative = data.uploadedAtRelative;
	if (data?.size !== '') datatset.size = data.size;
	if (data?.usabilityScore !== 0) datatset.usabilityScore = data.usabilityScore;
	if (data?.files) datatset.files = data.files;
	if (data?.upvotes !== 0) datatset.upvotes = data.upvotes;

	return await datatset.save().catch((error) => {
		const msg = {
			title: 'MongoDB',
			message: `MongoDB did not update datatset ${datatset.title}: ${error}`,
		};
		logError(msg);
		return { error: msg };
	});
};

export default {
	saveDataset,
};
