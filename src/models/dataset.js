const mongoose = require('mongoose');

const datasetSchema = mongoose.Schema({
	title: {
		type: String,
		required: true,
		trim: true
	},
	endpoint: {
		type: String,
		required: true,
		trim: true
	},
	description: {
		type: String,
		trim: true
	},
	uploadedAt: {
		type: Date
	},
	owner: {
		type: String,
		trim: true
	},
	ownerEndpoint: {
		type: String,
		trim: true
	},
	license: {
		type: String,
		trim: true
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
}, {
	timestamps: true
});

datasetSchema.virtual('ranking', {
	ref: 'DatasetRanking',
	localField: '_id',
	foreignField: 'dataset'
});

datasetSchema.methods.toJSON = function () {
	const dataset = this;
	const obj = dataset.toObject();
	return obj;
};

const Dataset = mongoose.model('Dataset', datasetSchema);

module.exports = Dataset;


