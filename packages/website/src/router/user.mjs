import User from '../models/user.mjs';
import { logError } from '../logs/datalog.mjs';

export const saveUser = async (data) => {
  let status = 'inserted';
  let user = await findDatasetByUri(data.uri);

  if (!user) {
    status = 'inserted';
    user = await insert(data);
  } else {
    status = 'updated';
    user = await update(user, data);
  }

  return { user, status };
};

const findDatasetByUri = async (uri) => {
  return await User.findOne({ uri });
};

const insert = async (data) => {
  const user = new User(data);

  return await user.save().catch((error) => {
    const msg = {
      title: 'MongoDB',
      message: `MongoDB did not insert user ${user.name}: ${error}`,
    };
    logError(msg);
    return { error: msg };
  });
};

const update = async (user, data) => {
  if (data.rankCompetitions) user.rankCompetitions = data.rankCompetitions;
  if (data.rankDatasets) user.rankDatasets = data.rankDatasets;
  if (data.rankNotebooks) user.rankNotebooks = data.rankNotebooks;
  if (data.rankDiscussions) user.rankDiscussions = data.rankDiscussions;

  return await user.save().catch((error) => {
    const msg = {
      title: 'MongoDB',
      message: `MongoDB did not update user ${user.title}: ${error}`,
    };
    logError(msg);
    return { error: msg };
  });
};

export default {
  saveUser,
};
