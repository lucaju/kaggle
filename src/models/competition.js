const mongoose = require('mongoose');

const competitionSchema = mongoose.Schema({
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
	organization: {
		type: String,
		trim: true
	},
	deadline: {
		type: String,
		trim: true
	},
	type: {
		type: String,
		trim: true
	},
	tags: {
		type: Array,
		default: []
	},
	prize: {
		type: String,
		trim: true
	},
	teamsTotal: {
		type: String,
		trim: true
	},
}, {
	timestamps: true
});

competitionSchema.virtual('ranking', {
	ref: 'CompetitionRanking',
	localField: '_id',
	foreignField: 'competition'
});

competitionSchema.methods.toJSON = function () {
	const competition = this;
	const obj = competition.toObject();
	return obj;
};

const Competition = mongoose.model('Competition', competitionSchema);

module.exports = Competition;


