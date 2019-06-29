const User = require('../models/user');
const chalk = require('chalk');

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

	console.log(
		chalk.keyword('olive')(`${itemsAdded} users added.`),
		chalk.keyword('orange')(`${itemsUpdated} users updated.`)
	);
};

const findUserByName = async name => {
	try {
		return await User.findOne({name});
	} catch (err) {
		console.log(err);
	}
};

const addUser = async data => {
	const user = new User(data);

	try {
		return await user.save();
	} catch (e) {
		console.log(e);
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
	} catch (e) {
		console.log(e);
	}
};


module.exports = {
	addUsers,
	addUser
};