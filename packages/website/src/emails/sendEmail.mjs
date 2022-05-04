import sendgrid from '@sendgrid/mail';
import { DateTime } from 'luxon';
import { messagesLog } from '../logs/datalog.mjs';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export const sendLogEmail = () => {
  const date = DateTime.local().toLocaleString(DateTime.DATE_MED);

  const dynamic_template_data = getData();
  dynamic_template_data.date = date;

  sendgrid.send({
    to: process.env.EMAIL_TO,
    from: process.env.EMAIL_FROM,
    subject: `{App: Kaggle Scraper - ${date}}`,
    templateId: 'd-e5e6be567871413796f160e0b1fc3523',
    dynamic_template_data,
  });

  console.log('Log email sent.');
};

const getData = () => {
  const result = {};

  const datasets = messagesLog.find((msg) => msg.title == 'datasets');
  if (datasets) {
    const datasetsAdded = datasets.message.filter((item) => item.status == 'added');
    const datasetsUpdated = datasets.message.filter((item) => item.status == 'updated');

    result.db = {
      up: datasetsUpdated.length,
      add: datasetsAdded.length,
      showAdded: datasetsAdded.length > 0 ? 'block' : 'none',
    };
  }

  const competitions = messagesLog.find((msg) => msg.title == 'competitions');
  if (competitions) {
    const competitionsAdded = competitions.message.filter((item) => item.status == 'added');
    const competitionsUpdated = competitions.message.filter((item) => item.status == 'updated');

    result.cmp = {
      up: competitionsUpdated.length,
      add: competitionsAdded.length,
      showAdded: competitionsAdded.length > 0 ? 'block' : 'none',
    };
  }

  const users = messagesLog.find((msg) => msg.title == 'users');
  if (users) {
    const usersAdded = users.message.filter((item) => item.status == 'added');
    const usersUpdated = users.message.filter((item) => item.status == 'updated');

    result.usr = {
      up: usersUpdated.length,
      add: usersAdded.length,
      showAdded: usersAdded.length > 0 ? 'block' : 'none',
    };
  }

  return result;
};

export default {
  sendLogEmail,
};