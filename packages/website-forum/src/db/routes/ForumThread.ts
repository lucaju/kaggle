import type { Thread } from '../../types';
import { ForumThreadModel } from '../models/ForumThread';

export const exists = async (url: string) => {
  const thread = await ForumThreadModel.exists({ url });
  return !!thread;
};

export const save = async (thread: Thread) => {
  const threadModel = await ForumThreadModel.create(thread);
  return threadModel;
};

export default {
  exists,
  save,
};
