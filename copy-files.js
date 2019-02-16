//Modules
require('colors');
const find = require('find');
const fileMetadata = require('file-metadata');
const fs = require('fs-extra');
const moment = require('moment');

//parameters
const now = moment();
const originFolder = './results';


//get JSON
function copyFiles() {

	find.file(/\.json$/, originFolder, function (files) {

		Promise.all(files.map(parseFile))
			.then(function () {
				console.log('-----------------');
				console.log('End.');
			});

	});

}

function parseFile(file) {
	return new Promise(
		(resolve, reject) => {

			//get metadata
			fileMetadata(file).then(function (fileInfo) {

				//get file info
				const fileName = fileInfo.fsName;
				const fileDate = moment(fileInfo.dateAdded);

				//copy only todays file
				if (fileDate.isSame(now, 'day')) {

					const copyFolder = './copies';
					// const copyFolder = './../../../../../../Volumes/Gaveta/Kaggle/results';

					//create folder
					if (!fs.existsSync(copyFolder)) fs.mkdirSync(copyFolder);

					//copy file
					fs.copy(`${originFolder}/${fileName}`, `${copyFolder}/${fileName}`)
						.then(() => {
							console.log(`${fileName} copied to ${copyFolder}`);
							resolve(file);
						})
						.catch(err => {
							console.error(err);
							reject(err);
						});

				} else {
					resolve(file);
				}
			});

		});
}

copyFiles();