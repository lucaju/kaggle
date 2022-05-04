import { blue, magenta, white } from 'kleur';
import db from './db';
import ForumScraper from './ForumScraper';

const competitions: { name: string; url: string }[] = [
  {
    name: 'Deepfake Detection Challenge',
    url: 'https://www.kaggle.com/competitions/deepfake-detection-challenge',
  },
  {
    name: 'Passenger Screening Algorithm Challenge',
    url: 'https://www.kaggle.com/competitions/passenger-screening-algorithm-challenge',
  },
  {
    name: 'Springleaf Marketing Response',
    url: 'https://www.kaggle.com/competitions/springleaf-marketing-response',
  },
  {
    name: 'Instacart Market Basket Analysis',
    url: 'https://www.kaggle.com/competitions/instacart-market-basket-analysis',
  },
];

const run = async () => {
  await db.connect();

  console.log(white(`Visiting ${blue(`${competitions.length}`)} sites`));
  for await (const item of competitions) {
    const scraper = new ForumScraper(item);
    await scraper.init();
  }

  db.close();
  console.log(magenta('\nDone'));
};
run();
