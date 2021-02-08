export const config = {
  targets: [
    {
      name: 'competition',
      titleAttr: 'title',
      tabs: ['overview', 'data', 'leaderboard'],
    },
  ],
  filter: {
    details: { $exists: false },
  },
  limit: 100,
  puppeteer: { headless: false },
  useCluster: true,
  clusterConfig: {
    maxConcurrency: 8,
    puppeteerOptions: {
      defaultViewport: { width: 1000, height: 800 },
    },
    retryLimit: 1,
    retryDelay: 10000,
    sameDomainDelay: 4000,
    timeout: 600000,
    monitor: true,
    workerCreationDelay: 40,
  },
};
