import { Model, model, Schema } from 'mongoose';
import type { Author, Comment, Thread } from '../../types';

export const CommentAuthorSchema = new Schema<Author>({
  name: String,
  tier: { type: String, required: false },
  url: String,
});

export const CommentSchema = new Schema<Comment>({
  author: { type: CommentAuthorSchema, required: false },
  authorType: { type: String, required: false },
  competitionRanking: { type: Number, required: false },
  content: { type: String, required: false },
  id: Number,
  isDeleted: { type: Boolean, required: false },
  medal: { type: String, required: false },
  postDate: Date,
  parentMessageId: { type: String, required: false },
  votes: { type: Number, default: 0 },
});

export const ForumThreadSchema = new Schema<Thread, Model<Thread>>(
  {
    author: { type: CommentAuthorSchema, required: false },
    commentCount: { type: Number, default: 0 },
    comments: { type: [CommentSchema], required: false },
    firstMessage: CommentSchema,
    forumId: Number,
    forumName: String,
    id: Number,
    parentName: String,
    parentUrl: String,
    pinned: { type: Boolean, required: false },
    postDate: Date,
    title: String,
    totalVotes: { type: Number, default: 0 },
    url: String,
  },
  { strict: false, timestamps: true }
);

export const ForumThreadModel = model<Thread, Model<Thread>>('Thread', ForumThreadSchema);
