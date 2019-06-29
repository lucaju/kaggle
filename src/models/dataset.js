const mongoose = require('mongoose');

const Dataset = mongoose.model('Dataset', {
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
	createdAt: {
		type: Date
	},
	owner: {
		type: String
	},
	userEndpoint: {
		type: String,
	},
	license: {
		type: String
	},
	usability: {
		type: Number
	},
	size: {
		type: Number
	},
	files: {
		numFiles: {
			type: Number
		},
		fileTypes: {
			type: Array,
			default: []
		}
	},
	tags: {
		type: Array,
		default: []
	},
	upvotes: {
		type: Number
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

module.exports = Dataset;


