export const config = {
	targets: [
		{
			title: 'competitions',
			url: 'https://www.kaggle.com/competitions',
		},
		// {
		// 	title: 'datasets',
		// 	url: 'https://www.kaggle.com/datasets',
		// },
		// {
		// 	title: 'users',
		// 	url: 'https://www.kaggle.com/rankings',
		// },
	],
	puppeteer: {
		headless: true,
	},
	coolDownTime: 60000, // hault the script for [milisecons]
	limitScrollTo: -1, // limit the number if items when scrollin [number -1 for no limits]
};
