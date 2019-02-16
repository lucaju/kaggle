//Modules
const cheerio = require('cheerio');
require('colors');
const fs = require('fs');
const jsonfile = require('jsonfile');
const rp = require('request-promise');



//-------------

const KaggleScraper = function KaggleScraper() {

	//Initialize variables\

	this.datetime = new Date();
	this.datetime = `${this.datetime.getFullYear()}-${(this.datetime.getMonth()+1)}-${this.datetime.getDate()}`;

	const pageSzie = 20;

	this.targets = [{
		name: 'datasets',
		url: `https://www.kaggle.com/datasets?sortBy=votes&group=public&page=1&pageSize=${pageSzie}&size=all&filetype=all&license=all`
	},
	{
		name: 'competitions',
		url: `https://www.kaggle.com/competitions?sortBy=numberOfTeams&group=general&page=1&pageSize=${pageSzie}`
	},
	{
		name: 'users',
		url: `https://www.kaggle.com/rankings?group=competitions&page=1&pageSize=${pageSzie}`
	}
	];

	this.rpOptions = {
		transform: function (body) {
			return cheerio.load(body);
		}
	};


	//----------------------------//
	//initiate
	this.initScrapper = function initScrapper() {
		console.log('Scraper for Kaggle'.green);
		console.log('-----------------');
		console.log('Initializing scrapping.');

		Promise.all(this.targets.map(this.loadURL))
			.then(function () {
				console.log('-----------------');
				console.log('End scraping.');
			});

	};

	this.loadURL = function loadURL(target) {

		return new Promise(
			(resolve) => {

				scraper.rpOptions.uri = target.url;

				//loadd promise
				rp(scraper.rpOptions)
					.then(scraper.sleeper(100))
					.then(($) => {
						return scraper.scrapeTarget(target, $);
					})
					.then(function (data) {
						return scraper.getJson(data);
					})
					.then(function (data) {
						resolve(data);
					})
					.catch((err) => {
						console.log(err);
					});
			});

	};

	//delay load pages to scrapper
	this.sleeper = function sleeper(ms) {
		return function (x) {
			return new Promise(resolve => setTimeout(() => resolve(x), ms));
		};
	};


	this.scrapeTarget = function scrapeTarget(target, $) {

		return new Promise(
			(resolve) => {

				console.log('-----------------'.blue);
				console.log(`TOP ${target.name}`.blue);

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
				const jsonData = JSON.parse(isolatedData);

				let list = [];

				if (target.name == 'datasets') {
					list = jsonData.datasetListItems;
					list = this.parseDatasetInfo(list);
				} else if (target.name == 'competitions') {
					list = jsonData.pagedCompetitionGroup.competitions;
					list = this.parseCompetitionInfo(list);
				} else if (target.name == 'users') {
					list = jsonData.list;
					list = this.parseUserInfo(list);
				}

				const data = {
					title: target.name,
					dataset: list,
				};

				resolve(data);
			});

	};

	this.parseDatasetInfo = function parseDatasetInfo(list) {
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

	this.parseCompetitionInfo = function parseCompetitionInfo(list) {
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

	this.parseUserInfo = function parseUserInfo(list) {
		for (const item of list) {
			console.log(`#${item.currentRanking} | ${item.displayName}`);
		}

		return list;

	};

	//get JSON
	this.getJson = function getJson(data) {

		return new Promise(
			(resolve, reject) => {

				const folder = './results';
				const fileName = `kaggle-top-${data.title}-${this.datetime}.json`;

				data.folder = folder;
				data.fileName = fileName;

				console.log('-----------------'.green);
				console.log(`Writing data to ${folder}/${fileName}`);

				if (!fs.existsSync(folder)) fs.mkdirSync(folder);

				jsonfile.writeFile(`${folder}/${fileName}`, data.dataset, {
					spaces: 4
				}, function (err) {
					if (err) {
						console.log(err);
						reject(err);
					} else {
						console.log('Json: Data written!'.green);
						resolve(data);
					}
				});

			});

	};

};

const scraper = new KaggleScraper();
scraper.initScrapper();