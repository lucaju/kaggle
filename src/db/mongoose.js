const mongoose = require('mongoose');
const chalk = require('chalk');
const {logError} = require('../logs/datalog');

const connect = async () => {

	try {
		await mongoose.connect(process.env.MONGODB_URL, {
			useNewUrlParser: true,
			useCreateIndex: true
		});
		return true;

	} catch (err) {
		console.log(chalk.red(err.name));
		logError('Mongoose',err.name);
	}
};

const close = () => {
	mongoose.connection.close();
};

module.exports = {
	connect,
	close
};