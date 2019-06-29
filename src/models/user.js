const mongoose = require('mongoose');

// const RankSchema = mongoose.Schema({
// 	date: {
// 		type: Date
// 	},
// 	rank: {
// 		type: Number
// 	}
// });


const User = mongoose.model('User', {
	name: {
		type: String,
		required: true
	},
	endpoint: {
		type: String,
		required: true
	},
	joinedDate: {
		type: Date
	},
	tier: {
		type: String
	},
	points: {
		type: Number
	},
	medals: {
		gold: {
			type: Number
		},
		silver: {
			type: Number
		},
		bronze: {
			type: Number
		},
	},
	addAt: {
		type: Date,
		default: Date.now()
	},
	rank: {
		type: Array,
		default: []
	},
});

module.exports = User;


