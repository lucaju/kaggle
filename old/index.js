/* eslint-disable no-self-assign */
//Modules
const chalk = require('chalk');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const jsonfile = require('jsonfile');
const moment = require('moment');
const rp = require('request-promise');


//-------------


//Initialize variables\

const pageSize = 20;

const targets = [
	// {
	// 	name: 'datasets',
	// 	url_: `https://www.kaggle.com/datasets?sortBy=votes&group=public&page=1&pageSize=${pageSize}&size=all&filetype=all&license=all`,
	// 	url: "https://www.kaggle.com/datasets"
	// },
	{
		name: 'competitions',
		url_: `https://www.kaggle.com/competitions?sortBy=numberOfTeams&group=general&page=1&pageSize=${pageSize}`,
		url: "https://www.kaggle.com/competitions"
	},
	// {
	// 	name: 'users',
	// 	url_: `https://www.kaggle.com/rankings?group=competitions&page=1&pageSize=${pageSize}`,
	// 	url: "https://www.kaggle.com/rankings"
	// }
];

const rpOptions = {
	transform: function (body) {
		return cheerio.load(body);
	}
};


//----------------------------//
//initiate
const initScrapper = async () => {
	
	console.log(chalk.green('Scraper for Kaggle'));
	console.log('-----------------');
	console.log('Initializing scrapping.');

	for (const target of targets) {
		console.log('-----------------');

		try {
			const $ = await loadURL(target);
			const data = await scrapeTarget(target, $);
			saveJson(data);
		} catch (e) {
			console.log(e);
			throw Error(e);
		}
		
	}

	console.log('End scraping.');


	// Promise.all(targets.map(loadURL))
	// 	.then(function () {
	// 		console.log('-----------------');
	// 		console.log('End scraping.');
	// 	});

};

const loadURL = target => {

	return new Promise(
		(resolve,reject) => {

			rpOptions.uri = target.url;

			//loadd promise
			rp(rpOptions)
				.then(sleeper(1000))
				.then(($) => {
					resolve($);
				})
				.catch((err) => {
					console.log(err);
					reject(err);
				});
		});

};

//delay load pages to scrapper
const sleeper =  ms => {
	return x => {
		return new Promise(resolve => setTimeout(() => resolve(x), ms));
	};
};


const scrapeTarget = (target, $) => {

	return new Promise(
		(resolve) => {

			console.log(chalk.blue('-----------------'));
			console.log(chalk.blue(`TOP ${target.name}`));

			//the data is on a javascript within the page
			const script = $('.site-layout__main-content').find('script');
			const scriptData = script.html();

			//the is in a json within the script
			// Must trim javascript stuff before and after
			let trimInitial = 77;
			let trimEnd;

			if (target.name == 'datasets') {
				trimEnd = 93;
			} else if (target.name == 'competitions') {
				trimEnd = 101;
			} else if (target.name == 'users') {
				trimEnd = 94;
			}

			//isolate data
			const isolatedData = scriptData.substring(trimInitial, scriptData.length - trimEnd);
			console.log(scriptData)
			const jsonData = JSON.parse(isolatedData);

			let list = [];

			if (target.name == 'datasets') {
				list = jsonData.datasetListItems;
				list = parseDatasetInfo(list);
			} else if (target.name == 'competitions') {
				console.log(jsonData)
				list = jsonData.pagedCompetitionGroup.competitions;
				list = parseCompetitionInfo(list);
			} else if (target.name == 'users') {
				console.log(jsonData)
				list = jsonData.list;
				list = parseUserInfo(list);
			}

			//add datatetime
			const date = moment();

			//payload
			const data = {
				title: target.name,
				date: date.format('YYYY-MM-DD'),
				dataset: list,
			};

			resolve(data);
		});

};

const parseDatasetInfo = list => {
	for (const item of list) {

		//get only votes from vote button
		item.totalVotes = item.voteButton.totalVotes;
		delete item.voteButton;

		//unpack filetypes
		item.commonFileTypes = item.commonFileTypes;

		//upack categories
		item.categories = item.categories;

		const listCategories = item.categories.categories;
		item.categories = [];

		for (const category of listCategories) {
			item.categories.push(category);
		}

		console.log(`${item.totalVotes} votes | ${item.title}`);
	}

	return list;

};

const parseCompetitionInfo = list => {
	for (const item of list) {

		//upack categories
		const listCategories = item.categories.categories;
		item.categories = [];

		for (const category of listCategories) {
			item.categories.push(category);
		}

		console.log(`${item.totalTeams} teams | ${item.competitionTitle}`);
	}

	return list;

};

const parseUserInfo = list => {
	for (const item of list) {
		console.log(`#${item.currentRanking} | ${item.displayName}`);
	}

	return list;

};

//get JSON
const saveJson = data => {

	return new Promise(
		(resolve, reject) => {

			const folder = './results';
			const fileName = `kaggle-top-${data.title}-${data.date}.json`;

			data.folder = folder;
			data.fileName = fileName;

			console.log(chalk.blue('-----------------'));
			console.log(`Writing data to ${folder}/${fileName}`);

			if (!fs.existsSync(folder)) fs.mkdirSync(folder);

			//payload
			const results = {
				title: data.title,
				date: data.date,
				data: data.dataset
			};

			//Save Json file
			jsonfile.writeFile(`${folder}/${fileName}`, results, {
				spaces: 4
			}, function (err) {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					console.log(chalk.blue('Json: Data written!'));
					resolve(data);
				}
			});

		});

};



initScrapper();