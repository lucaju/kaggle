// import util from 'util';
// import chalk from 'chalk';
// import mongoose from './db/mongoose.mjs';

// import Competition from './models/competition.mjs';

// // const find = async () => {
// //   await mongoose.connect();

// //   const day = await Ranking.findOne({ type: 'users' });

// //   for (const position of day.ranking) {
// //     // console.log(util.inspect(user, {showHidden: false, depth: null}));

// //     const user = await User.findById(position.user);
// //     console.log(util.inspect(user, { showHidden: false, depth: null }));
// //   }

// //   console.log(chalk.blue('done'));
// // };

// const removeDetails = async () => {
//   await mongoose.connect();

//   const collection = await Competition.find({
//     details: { $exists: true },
//   }).limit(2);

//   // const collection = await Competition.find();

//   console.log(collection.length);

//   for await (const item of collection) {
//     console.log(item.title);
//     const data = {
//       ...item.toJson(),
//     };

//     delete data.details;
//     console.log(data);
//     // await item.save();
//   }

//   mongoose.close();
// };

// // find();

// removeDetails();
