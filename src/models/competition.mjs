import mongoose from 'mongoose';

const competitionSchema = mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
		},
		uri: {
			type: String,
			required: true,
			trim: true,
		},
		shortDescription: { type: String, trim: true },
		relativeDeadline: { type: String, trim: true },
		category: { type: String, trim: true },
		subCategory: { type: String, trim: true },
		teams: { type: Number, trim: true },
		prize: { type: String, trim: true },
		active: { type: Boolean },
	},
	{
		timestamps: true,
		strict: false,
	}
);

competitionSchema.methods.toJSON = function () {
	const competition = this;
	const obj = competition.toObject();
	return obj;
};

const Competition = mongoose.model('Competition', competitionSchema);

export default Competition;
