import Competition from '../models/competition.mjs';
import { logError } from '../logs/datalog.mjs';

export const saveCompetition = async (data) => {
	let status = 'inserted';
	let competition = await findByUri(data.uri);

	if (!competition) {
		status = 'inserted';
		competition = await insertCompetition(data);
	} else {
		status = 'updated';
		competition = await updateCompetition(competition, data);
	}

	return {
		competition,
		status,
	};
};

const findByUri = async (uri) => {
	return await Competition.findOne({ uri });
};

const insertCompetition = async (data) => {
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

const updateCompetition = async (competition, data) => {
	if (data?.shortDescription !== '') competition.description = data.description;
	if (data?.deadline !== '') competition.deadline = data.deadline;
	if (data?.category !== '') competition.category = data.category;
	if (data?.subCategory !== '') competition.subCategory = data.subCategory;
	if (data?.prize !== '') competition.prize = data.prize;
	if (data?.teams !== '') competition.teams = data.teams;

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
