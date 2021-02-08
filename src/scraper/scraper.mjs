import { Duration } from 'luxon';
import { collectCompetitions } from './competitions.mjs';
import { collectDatasets } from './datasets.mjs';
import { collectUsers } from './users.mjs';
import { config } from '../config.mjs';

const coolDownTime = config.coolDownTime || 5000;
export const limitScrollTo = config.limitScrollTo || 50; //null

export const scraper = async ({ title, url }, page) => {
  if (title === 'competitions') return await collectCompetitions(url, page);
  if (title === 'datasets') return await collectDatasets(url, page);
  if (title === 'users') return await collectUsers(url, page);
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
