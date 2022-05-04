import { blue, dim, magenta, red } from 'kleur';
import { Duration } from 'luxon';
import emoji from 'node-emoji';
import ora from 'ora';
import puppeteer, { Browser } from 'puppeteer';
import type { Comment, Thread } from './types';
import ForumThread from './db/routes/ForumThread';

type Sort = 'hotness' | 'recent-comments' | 'published' | 'votes' | 'most-comments';

interface Topic {
  commentCount: number;
  title: string;
  topicUrl: string;
}

const MAX_TOPICS = Infinity; 
const MAX_COMMENTS = Infinity;

const spinner = ora({ spinner: 'dots', color: 'blue', stream: process.stdout });

class ForumScraper {
  private readonly baseUrl: string;
  private readonly name: string;

  private browser: Browser | undefined;

  private threads: Thread[] = [];

  private topicCount: number = 0;
  private topicCountTotal: number = 0;
  private topics: Topic[] = [];

  constructor({ name, url }: { name: string; url: string }) {
    this.baseUrl = url;
    this.name = name;
  }

  async init() {
    this.browser = await puppeteer.launch({
      defaultViewport: { width: 1400, height: 1200 },
      headless: true,
    });

    console.log('\n');
    spinner.start(blue(this.name));

    // Visit the dicussion page
    let page = 1;
    await this.scrapeDiscussionPage({ sort: 'published', page });

    spinner.stop();

    console.log(`${blue(this.name)} ${magenta(`[${this.topicCountTotal} topics]`)}`);

    spinner.prefixText = 'Collecting Topics';
    spinner.start();

    // fliping throug discussion page
    while (this.topicCount < Math.min(this.topicCountTotal, MAX_TOPICS)) {
      spinner.text = `${this.topicCount}/${this.topicCountTotal}`;
      page = page + 1;
      await this.scrapeDiscussionPage({ sort: 'published', page });
    }

    spinner.stop();
    spinner.prefixText = ' ';

    // visiting each topic
    let i = 0;
    let collected = 0;
    for (const topic of this.topics) {

      //
      if (i > MAX_COMMENTS) break;

      //cooldown
      if (collected > 0 && collected % 10 === 0) await this.pause();

      spinner.prefixText = dim(`  [${i}]`);
      spinner.start(topic.title);

      //Skip if already saved to DB
      const threadStored = await ForumThread.exists(topic.topicUrl)
      // console.log(' ',{exists: threadStored})
      if (threadStored) {
        i++;
        continue;
      }

      const thread = await this.scrapeThreadPage(topic.topicUrl);

      //Save to DB
      if (thread) ForumThread.save(thread)

      spinner.stop();

      const prefixLog = dim(`[${i}]`);
      const iconLog = thread ? emoji.get('pizza') : emoji.get('x');
      const titleLog = thread ? blue(topic.title) : red(topic.title);
      const commentCountLog = thread ? magenta(`(${topic.commentCount} comments)`) : '';

      const log = `  ${prefixLog} ${iconLog} ${titleLog} ${commentCountLog}`;
      console.log(log);

      i++;
      collected++;
    }

    spinner.prefixText ='';
    spinner.stop();

    //cooldown after finish
    await this.pause(30_000);

    await this.browser.close();
  }

  private async scrapeDiscussionPage({
    sort = 'hotness',
    page = 1,
  }: {
    sort?: Sort;
    page?: number;
  }) {
    if (!this.browser) throw new Error('Browser not instantiated');

    const url = `${this.baseUrl}/discussion?sort=${sort}&page=${page}`;
    const tab = await this.browser.newPage();

    //naigate to the page
    await tab.goto(url).catch((error) => console.log(error));

    //await request to get the list of topics
    const discussionResponse = await tab.waitForResponse(
      (response) =>
        response.request().url() ===
          'https://www.kaggle.com/api/i/discussions.DiscussionsService/GetTopicListByForumId' &&
        response.status() === 200
    );

    const discussions = await discussionResponse.json();

    //get total number of topics
    if (this.topicCountTotal === 0) this.topicCountTotal = discussions.count;

    if (discussions.topics.length === 0) return [];

    this.topicCount += discussions.topics.length;

    //Parse topics
    const topics: Topic[] = discussions.topics.map(({ commentCount, title, topicUrl }: Topic) => ({
      commentCount: commentCount ?? 0,
      title,
      topicUrl: `https://www.kaggle.com${topicUrl}`,
    }));

    this.topics = [...this.topics, ...topics];

    await tab.close();

    return topics;
  }

  private async scrapeThreadPage(url: string) {
    if (!this.browser) throw new Error('Browser not instantiated');

    const tab = await this.browser.newPage();

    //Navigate to thread page
    const urlLoaded = await tab.goto(url).catch((error) => null);
    if (!urlLoaded) return;

    //await request to get the topic detail
    const topicResponse = await tab
      .waitForResponse(
        (response) =>
          response.request().url() ===
            'https://www.kaggle.com/api/i/discussions.DiscussionsService/GetForumTopicById' &&
          response.status() === 200
      )
      .catch((error) => null);
    if (!topicResponse) return;

    const { forumTopic } = await topicResponse.json();

    const {
      commentSort,
      firstMessage,
      forumName,
      forumId,
      id,
      isSticky,
      name,
      parentName,
      parentUrl,
      postDate,
      totalVotes,
    } = forumTopic;

    // This scripts consider comments sort by "hotness"
    if (commentSort !== 'COMMENT_LIST_SORT_BY_HOT') {
      console.log(`sorting is different from "COMMENT_LIST_SORT_BY_HOT"`);
      return;
    }

    // Initial message details
    const intialMessage = {
      author: {
        name: firstMessage.author.displayName,
        tier: firstMessage.author.tier,
        url: `https://www.kaggle.com/${firstMessage.author.url}`,
      },
      content: firstMessage.rawMarkdown,
      id: firstMessage.id,
      medal: firstMessage.medal,
      postDate: firstMessage.postDate,
      votes: firstMessage.votes.totalVotes ?? 0,
    };

    //Thread details
    const thread: Thread = {
      author: {
        name: firstMessage.author.displayName,
        tier: firstMessage.author.tier,
        url: `https://www.kaggle.com/${firstMessage.author.url}`,
      },
      commentCount: 0,
      firstMessage: intialMessage,
      forumId,
      forumName,
      id,
      parentName,
      parentUrl: `https://www.kaggle.com${parentUrl}`,
      pinned: isSticky,
      postDate,
      title: name,
      totalVotes,
      url,
    };

    // Parse responses to the topic
    if (forumTopic.comments?.length > 0) {
      const comments: Comment[] = this.getReplies(forumTopic.comments);
      thread.comments = comments;
      thread.commentCount = comments.length;
    }

    this.threads.push(thread);

    await tab.close();

    return thread;
  }

  private getReplies(replies: any) {
    let commentReplies: Comment[] = [];
    const comments: Comment[] = replies.map((reply: any) => {
      const {
        author,
        authorType,
        competitionRanking,
        id,
        isDeleted,
        medal,
        parent,
        postDate,
        rawMarkdown,
        replies,
        votes,
      } = reply;

      // If comment is deleted there is no author
      const commentAuthor = !isDeleted
        ? {
            name: author.displayName,
            tier: author.tier,
            url: `https://www.kaggle.com/${author.url}`,
          }
        : undefined;

      //if there are replies to comment, recursivelly call get Replies and flat the list
      if (replies) commentReplies = [...commentReplies, ...this.getReplies(replies)];

      // comment details
      return {
        author: commentAuthor,
        authorType,
        competitionRanking,
        content: rawMarkdown,
        id,
        isDeleted,
        medal,
        postDate,
        parentMessageId: parent.url,
        votes: votes.totalVotes ?? 0,
      };
    });

    // flat comments (unest replies)
    return [...comments, ...commentReplies];
  }

  private async pause(time: number = 10_000) {
    return new Promise((resolve) => {
      const interval = 1_000;
      let duration = Duration.fromMillis(time);

      spinner.prefixText = '  ';
      spinner.start(`Cooldown: ${duration.toFormat('mm:ss')}`);

      //timer
      const timer = setInterval(() => {
        duration = duration.minus({ milliseconds: interval });
        const durationText = duration.toFormat('mm:ss');
        spinner.text = `Cooldown: ${durationText}`;

        if (duration.milliseconds <= 0) {
          clearInterval(timer);
          resolve(true);
          spinner.prefixText = '';
          spinner.stop();
        }
      }, interval);
    });
  }
}

export default ForumScraper;
