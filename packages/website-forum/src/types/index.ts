export interface Author {
  name: string;
  tier?: string;
  url: string;
}

export interface Comment {
  author?: Author;
  authorType?: string;
  competitionRanking?: number;
  content?: string;
  id: number;
  isDeleted?: boolean;
  medal?: string;
  postDate: string;
  parentMessageId?: string;
  votes?: number;
}

export interface Thread {
  author: Author;
  commentCount: number;
  comments?: Comment[];
  firstMessage: Comment;
  forumId: number;
  forumName: string;
  id: number;
  parentName: string;
  parentUrl: string;
  pinned?: boolean;
  postDate: string;
  title: string;
  totalVotes: number;
  url: string;
}