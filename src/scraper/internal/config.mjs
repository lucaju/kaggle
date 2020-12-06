export const config = {
	targets: [
		{
			name: 'competition',
			titleAttr: 'title',
			tabs: ['overview', 'data','leaderboard'],
		},
		{
			name: 'dataset',
			titleAttr: 'title',
			tabs: ['data', 'task', 'notebooks', 'discussion', 'activity', 'metadata'],
		},
		{
			name: 'user',
			titleAttr: 'name',
			tabs: ['home', 'competition', 'notebooks', 'discussion', 'followers'],
		},
	],
	filterAttr: {
		// details: false,
		ative: true,
	},
	limit: 100,
	puppeteer: { headless: false },
	coolDownTime: 300000, // halt the script for [milisecons]
	limitScrollTo: -1, // limit the number if items when scrollin [number -1 for no limits]
};
