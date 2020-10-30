import { collectCompetitions } from './competitions.mjs';
import { collectDatasets } from './datasets.mjs';
import { collectUsers } from './users.mjs';

const coolDownTime = 5000;

export const limitScrollTo = 50; //null

export const scraper = async (target, page) => {
	switch (target) {
	case 'competitions':
		return await collectCompetitions(page);
	case 'datasets':
		return await collectDatasets(page);
	case 'users':
		return  await collectUsers(page);
	}
};

export const coolDown = async (page,spinner) => {
	const interval = 1000;
	let passedTime = coolDownTime;

	spinner.start({text: `Cooldown${coolDownTime / 1000} seconds`});
	const timer = setInterval(() => {
		passedTime -= interval;
		spinner.text = `Cooldown: ${passedTime / 1000} seconds`;
	}, interval);

	await page.waitForTimeout(coolDownTime);
	clearInterval(timer);
	spinner.succeed('Done');

	return;
};

export default {
	limitScrollTo,
	coolDown,
	scraper
};
