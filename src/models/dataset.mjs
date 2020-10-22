import mongoose from 'mongoose';

const datasetSchema = mongoose.Schema(
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
		owner: { type: String, trim: true },
		uploadedAtRelative: { type: String, trim: true },
		size: { type: String, trim: true },
		usabilityScore: { type: Number },
		files: {
			numFiles: { type: Number },
			fileTypes: { type: Array, default: [] },
		},
		upvotes: { type: Number },
		tasks: { type: Number },
	},
	{
		timestamps: true,
		strict: false,
	}
);

datasetSchema.methods.toJSON = function () {
	const dataset = this;
	const obj = dataset.toObject();
	return obj;
};

const Dataset = mongoose.model('Dataset', datasetSchema);

export default Dataset;
