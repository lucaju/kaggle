require('dotenv').config();
const util = require('util');
const chalk = require('chalk');
const mongoose = require('./src/db/mongoose');

const {Ranking} = require('./src/models/ranking');
const User = require('./src/models/user');




const find = async () => {
	await mongoose.connect();

	const day = await Ranking.findOne({type: 'users'});

	for (const position of day.ranking) {
		// console.log(util.inspect(user, {showHidden: false, depth: null}));

		const user = await User.findById(position.user);
		console.log(util.inspect(user, {showHidden: false, depth: null}));

	}
	
	console.log(chalk.blue('done'));

};

find();