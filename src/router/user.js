const User = require('../models/user');
const chalk = require('chalk');

const {logMessage, logError} = require('../logs/datalog');

const addUsers = async collection => {

	console.log(chalk.grey('\nSaving into database...'));

	let itemsAdded = 0;
	let itemsUpdated = 0;

	for (const data of collection) {

		const user = await findUserByName(data.name);

		if (!user) {
			const newItem = await addUser(data);
			if (newItem) itemsAdded += 1;
		} else {
			const itemUpdated = await updateUser(user, data);
			if (itemUpdated) itemsUpdated += 1;
		}
	}

	logMessage(`USERS: ${itemsAdded} users added. ${itemsUpdated} users updated.`);

	console.log(
		chalk.keyword('olive')(`${itemsAdded} users added.`),
		chalk.keyword('orange')(`${itemsUpdated} users updated.`)
	);

};

const findUserByName = async name => {
	return await User.findOne({name});
};

const addUser = async data => {
	const user = new User(data);

	try {
		return await user.save();
	} catch (err) {
		console.log(`MongoDB did not inserted user ${user.name}: ${err}`);
		logError(`MongoDB did not inserted user ${user.name}: ${err}`);
	}
};

const updateUser = async (user, data) => {

	if (data.tier != '' && user.tier != data.tier) user.tier = data.tier;
	if (data.points && user.points != data.points) user.points = data.points;
	if (data.medals.gold && user.medals.gold != data.medals.gold) user.medals.gold = data.medals.gold;
	if (data.medals.silver && user.medals.silver != data.medals.silver) user.medals.silver = data.medals.silver;
	if (data.medals.bronze && user.medals.bronze != data.medals.bronze) user.medals.bronze = data.medals.bronze;
	if (data.rank) user.rank.push(data.rank);

	try {
		return await user.save();
	} catch (err) {
		console.log(`MongoDB did not update user ${user.name}: ${err}`);
		logError(`MongoDB did not update user ${user.name}: ${err}`);
	}
};


module.exports = {
	addUsers,
	addUser
};