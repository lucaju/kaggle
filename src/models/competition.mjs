import mongoose from 'mongoose';

const competitionSchema = mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    uri: { type: String, required: true, trim: true },
    shortDescription: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    organization: { type: String, trim: true },
    category: { type: String, trim: true },
    subCategory: { type: String, trim: true },
    tags: { type: Array },
    relativeDeadline: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    datasetSlug: { type: String, trim: true },
    teams: { type: Number },
    competitors: { type: Number },
    prize: { type: String, trim: true },
    active: { type: Boolean },
    inClass: { type: Boolean },
    details: { type: Object },
    leaderboard: { type: Array },
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
