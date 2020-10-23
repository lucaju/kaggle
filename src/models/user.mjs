const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
		
	},
	endpoint: {
		type: String,
		required: true,
		trim: true
	},
	joinedDate: {
		type: Date
	},
	tier: {
		type: String,
		trim: true
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
}, {
	timestamps: true
});

userSchema.virtual('ranking', {
	ref: 'UserRanking',
	localField: '_id',
	foreignField: 'user'
});

userSchema.methods.toJSON = function () {
	const user = this;
	const obj = user.toObject();
	return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;


