const mongoose = require('mongoose');

const rankingSchema = new mongoose.Schema({
	type: {
		type: String,
		required: true,
		trim: true
	},
	date: {
		type: Date,
		default: Date.now(),
		required: true
	},
	ranking: {
		type: Array,
		default: []
	},
});

rankingSchema.methods.toJSON = function () {
	const ranking = this;
	const obj = ranking.toObject();
	return obj;
};

const Ranking = mongoose.model('Ranking', rankingSchema);



const userRankSchema = new mongoose.Schema({
	position: {
		type: Number,
		required: true
	},
	user: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'User'
	},
	name: {
		type: String,
		require: true
	},
	endpoint: {
		type: String,
		require: true
	}
});

const UserRanking = mongoose.model('UserRanking', userRankSchema);



const datasetSchema = new mongoose.Schema({
	position: {
		type: Number,
		required: true
	},
	dataset: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'Dataset'
	},
	title: {
		type: String,
		require: true
	},
	endpoint: {
		type: String,
		require: true
	}
});

const DatasetRanking = mongoose.model('DatasetRanking', datasetSchema);



const competitionSchema = new mongoose.Schema({
	position: {
		type: Number,
		required: true
	},
	competition: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'Competition'
	},
	title: {
		type: String,
		require: true
	},
	endpoint: {
		type: String,
		require: true
	}
});

const CompetitionRanking = mongoose.model('CompetitionRanking', competitionSchema);

module.exports = {
	Ranking,
	UserRanking,
	DatasetRanking,
	CompetitionRanking
};


