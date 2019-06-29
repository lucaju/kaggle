const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/kaggle', {
	useNewUrlParser: true,
	useCreateIndex: true
});

const close = () => {
	mongoose.connection.close();
};

module.exports = {
	close
};