import { collectCompetitions } from './competitions.mjs';
import { collectDatasets } from './datasets.mjs';
// import { collectUsers } from './users.mjs';

export const scraper = async (target, page) => {
	switch (target) {
	case 'competitions':
		return await collectCompetitions(page);
	case 'datasets':
		await collectDatasets(page);
	// case 'users':
	// 	return  await collectUsers(page);
	}
};

export const limitScrollTo = 75; //null

export default {
	scraper,
	limitScrollTo
};
