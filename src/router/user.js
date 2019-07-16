const User = require('../models/user');
const chalk = require('chalk');
const {logMessage, logError} = require('../logs/datalog');

let itemsAdded = 0;
let itemsUpdated = 0;

const addUsers = async collection => {

	console.log(chalk.grey('\nSaving into database...'));

	for (const data of collection) {
		await addUser(data);
	}

	logMessage('Users', `${itemsAdded} added. ${itemsUpdated} updated.`);

	console.log(
		chalk.keyword('olive')(`${itemsAdded} users added.`),
		chalk.keyword('orange')(`${itemsUpdated} users updated.\n`)
	);

};

const findUserByName = async name => {
	return await User.findOne({name});
};

const addUser = async data => {

	let user = await findUserByName(data.name);

	if (!user) {
		user = await inserUser(data);
		if (user) itemsAdded++;
	} else {
		user = await updateUser(user, data);
		if (user) itemsUpdated++;
	}

	return user;

};

const inserUser = async data => {
	const user = new User(data);

	try {
		return await user.save();
	} catch (err) {
		console.log(`MongoDB did not insert user ${user.name}: ${err}`);
		logError('MongoDB',`MongoDB did not insert user ${user.name}: ${err}`);
	}
};

const updateUser = async (user, data) => {

	if (data.tier != '' && user.tier != data.tier) user.tier = data.tier;
	if (data.points && user.points != data.points) user.points = data.points;
	if (data.medals.gold && user.medals.gold != data.medals.gold) user.medals.gold = data.medals.gold;
	if (data.medals.silver && user.medals.silver != data.medals.silver) user.medals.silver = data.medals.silver;
	if (data.medals.bronze && user.medals.bronze != data.medals.bronze) user.medals.bronze = data.medals.bronze;
	
	try {
		return await user.save();
	} catch (err) {
		console.log(`MongoDB did not update user ${user.name}: ${err}`);
		logError('MongoDB',`MongoDB did not update user ${user.name}: ${err}`);
	}
};

const getLogUsers = () => {
	return {
		itemsAdded,
		itemsUpdated
	};
};


module.exports = {
	addUsers,
	addUser,
	getLogUsers
};