import { collectCompetitions } from './competitions.mjs';
// import { collectDatasets } from './datasets.mjs';
// import { collectUsers } from './users.mjs';

export const scraper = async (target, page) => {
	switch (target) {
	case 'competitions':
		return  await collectCompetitions(page);
	// case 'datasets':
	// 	return  await collectDatasets(page);
	// case 'users':
	// 	return  await collectUsers(page);
	}
};

export default {
	scraper,
};