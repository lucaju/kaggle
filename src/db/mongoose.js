const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL, {
	useNewUrlParser: true,
	useCreateIndex: true
});

const close = () => {
	mongoose.connection.close();
};

module.exports = {
	close
};