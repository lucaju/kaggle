import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import pkg from '../package.json';

export const argv = yargs(hideBin(process.argv))
  .usage('Webpage snapshots\n\nUsage: $0 [options]')
  .help('help')
  .alias('help', 'h')
  .version('version', pkg.version)
  .alias('version', 'V')
  .options({
    csvFile: {
      description: 'Path to CSV file',
      require: true,
      string: true,
    },
    imageType: {
      default: 'png',
      description: `Snapshot image type. 'png' or 'jpg'`,
      string: true,
    },
    prefixFilename: {
      default: '',
      description: 'Add a prefix to the image filename.',
      string: true,
    },
    retyAttempts: {
      default: 3,
      description: 'Number of times to retry fail attemps',
      number: true,
    },
    snapshotTimeout: {
      default: 30000,
      description: 'Amount of time allow to get a url snapshot in milliseonds',
      number: true,
    },
  }).argv;
