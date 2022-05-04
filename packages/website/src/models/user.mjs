import mongoose from 'mongoose';

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    uri: { type: String, required: true, trim: true },
    joinedAt: { type: Date },
    rankCompetitions: {
      position: { type: Number },
      tier: { type: String, trim: true },
      points: { type: Number },
      goldMedals: { type: Number },
      silverMedals: { type: Number },
      bronzeMedals: { type: Number },
    },
    rankDatasets: {
      tier: { type: String, trim: true },
      points: { type: Number },
      goldMedals: { type: Number },
      silverMedals: { type: Number },
      bronzeMedals: { type: Number },
    },
    rankNotebooks: {
      tier: { type: String, trim: true },
      points: { type: Number },
      goldMedals: { type: Number },
      silverMedals: { type: Number },
      bronzeMedals: { type: Number },
    },
    rankDiscussions: {
      tier: { type: String, trim: true },
      points: { type: Number },
      goldMedals: { type: Number },
      silverMedals: { type: Number },
      bronzeMedals: { type: Number },
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

userSchema.methods.toJSON = function () {
  const user = this;
  const obj = user.toObject();
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
