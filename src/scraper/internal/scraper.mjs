import { Duration } from 'luxon';
import { collectCompetition } from './competition.mjs';
// import { collectDatasets } from './datasets.mjs';
// import { collectUsers } from './users.mjs';
import { config } from './config.mjs';

const coolDownTime = config.coolDownTime || 5000;
export const limitScrollTo = config.limitScrollTo || 50; //null

export const scraper = async ({ item, target }, page) => {
	if (target.name === 'competition') return await collectCompetition(item, target, page);
	// if (target === 'dataset') return await collectDataset(item, page);
	// if (target === 'user') return await collectUser(item, page);
};

export const coolDown = async (page, spinner) => {
	const interval = 1000;
	let duration = Duration.fromMillis(coolDownTime);

	spinner.start({ text: `Cooldown: ${duration.toFormat('mm:ss')}` });

	//timer
	const timer = setInterval(() => {
		duration = duration.minus({ milliseconds: interval });
		const durationText = duration.toFormat('mm:ss');
		spinner.text = `Cooldown: ${durationText}`;
	}, interval);

	//waiting
	await page.waitForTimeout(coolDownTime);

	//after timer
	clearInterval(timer);
	spinner.succeed('Done');

	return;
};

export default {
	limitScrollTo,
	coolDown,
	scraper,
};
