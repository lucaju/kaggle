import Competition from '../models/competition.mjs';
import { logError } from '../logs/datalog.mjs';

export const saveCompetition = async (data) => {
	let status = 'inserted';
	let competition = await findByUri(data.uri);

	if (!competition) {
		status = 'inserted';
		competition = await insert(data);
	} else {
		status = 'updated';
		competition = await update(competition, data);
	}

	return {
		competition,
		status,
	};
};

const findByUri = async (uri) => {
	return await Competition.findOne({ uri });
};

const insert = async (data) => {
	const competition = new Competition(data);
	return await competition.save()
		.catch((error) => {
			const msg = {
				title: 'MongoDB',
				message: `MongoDB did not insert competition ${competition.title}: ${error}`,
			};
			logError(msg);
			return { error: msg };
		});
};

const update = async (competition, data) => {
	if (data?.shortDescription !== '') competition.shortDescription = data.shortDescription;
	if (data?.relativeDeadline !== '') competition.relativeDeadline = data.relativeDeadline;
	if (data?.category !== '') competition.category = data.category;
	if (data?.subCategory !== '') competition.subCategory = data.subCategory;
	if (data?.prize !== '') competition.prize = data.prize;
	if (data?.teams !== 0) competition.teams = data.teams;

	return await competition.save()
		.catch((error) => {
			const msg = {
				title: 'MongoDB',
				message: `MongoDB did not update competition ${competition.title}: ${error}`,
			};
			logError(msg);
			return { error: msg };
		});
};

export default {
	saveCompetition,
};
