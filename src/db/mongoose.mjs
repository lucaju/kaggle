import mongoose from 'mongoose';
import chalk from 'chalk';

import { logError } from '../logs/datalog.mjs';

const connect = async () => {
	await mongoose
		.connect(process.env.MONGODB_URL, {
			useNewUrlParser: true,
			useCreateIndex: true,
			useUnifiedTopology: true,
		})
		.catch((error) => {
			logError({
				title: 'Mongoose',
				message: error.name,
			});
			console.log(chalk.red(error.name));
		});

	return true;
};

const close = () => mongoose.connection.close();

export default {
	connect,
	close,
};
