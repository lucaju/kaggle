const mongoose = require('mongoose');

const Competition = mongoose.model('Competition', {
	title: {
		type: String,
		required: true
	},
	endpoint: {
		type: String,
		required: true
	},
	description: {
		type: String
	},
	deadline: {
		type: String
	},
	type: {
		type: String
	},
	tags: {
		type: Array,
		default: []
	},
	prize: {
		type: String,
	},
	teamsTotal: {
		type: String
	},
	rank: {
		type: Array,
		default: []
	},
	addAt: {
		type: Date,
		default: Date.now()
	},
});

module.exports = Competition;


