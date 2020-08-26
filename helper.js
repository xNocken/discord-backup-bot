const fs = require('fs');
const globals = require('./globals');

const backUpMessage = (message) => {
  const { guildId, id: channelId } = message.getChannel();

  const channel = JSON.parse(fs.readFileSync(`data/${guildId}/${channelId}.json`));
  const settings = JSON.parse(fs.readFileSync(`data/${guildId}.json`));
  const users = JSON.parse(fs.readFileSync('data/users.json'));

  if (message.author && !fs.existsSync(`data/users/${message.author.id}.json`)) {
    fs.writeFileSync(`data/users/${message.author.id}.json`, JSON.stringify({
      guilds: {},
    }));
  }

  let userChannels;

  if (message.author) {
    userChannels = JSON.parse(fs.readFileSync(`data/users/${message.author.id}.json`));
  } else {
    userChannels = false;
  }

  if (userChannels) {
    if (!userChannels.guilds[guildId]) {
      userChannels.guilds[guildId] = {};
    }

    userChannels.guilds[guildId][channelId] = true;
  }

  if (message.type !== 0
    || (message.author && !users[message.author.id] && !message.author.bot)
    || (message.nonce && message.nonce.match('backupmessage'))
    || !settings.channels[channelId]) {
    return;
  }

  channel.messages.push({
    author: message.author ? `${message.author.username}#${message.author.discriminator}` : 'Deleted User#0000',
    userId: message.author ? message.author.id : '',
    content: message.content,
    id: message.id,
    attachments: message.attachments,
    time: message.time,
    embeds: message.embeds,
  });

  if (channel.messages.length > globals.limit) {
    channel.messages.splice(0, 1);
  }

  fs.writeFileSync(`data/${guildId}/${channelId}.json`, JSON.stringify(channel));

  if (userChannels) {
    fs.writeFileSync(`data/users/${message.author.id}.json`, JSON.stringify(userChannels));
  }
};

const getChannelIdByName = (name, guildId) => {
  let id = false;

  const folder = fs.readdirSync(`data/${guildId}`);

  folder.forEach((fileName) => {
    if (JSON.parse(fs.readFileSync(`data/${guildId}/${fileName}`)).name === name) {
      [id] = fileName.split('.json');
    }
  });

  return id;
};

const backUpMessages = (messages) => {
  const { guildId, id: channelId } = messages[0].getChannel();
  const channel = JSON.parse(fs.readFileSync(`data/${guildId}/${channelId}.json`));
  const settings = JSON.parse(fs.readFileSync(`data/${guildId}.json`));
  const user = {};

  messages.forEach((message) => {
    const users = JSON.parse(fs.readFileSync('data/users.json'));

    if (message.author && !fs.existsSync(`data/users/${message.author.id}.json`)) {
      fs.writeFileSync(`data/users/${message.author.id}.json`, JSON.stringify({
        guilds: {},
      }));
    }

    let userChannels;

    if (message.author) {
      if (!user[message.author.id]) {
        user[message.author.id] = JSON.parse(fs.readFileSync(`data/users/${message.author.id}.json`));
        userChannels = true;
      }
    } else {
      userChannels = false;
    }

    if (message.type !== 0
      || (message.author && !users[message.author.id] && !message.author.bot)
      || (message.nonce && message.nonce.match('backupmessage'))
      || !settings.channels[channelId]) {
      return;
    }

    if (userChannels) {
      if (!user[message.author.id].guilds[guildId]) {
        user[message.author.id].guilds[guildId] = {};
      }

      user[message.author.id].guilds[guildId][channelId] = true;
    }

    channel.messages.push({
      author: message.author ? `${message.author.username}#${message.author.discriminator}` : 'Deleted User#0000',
      userId: message.author ? message.author.id : '',
      content: message.content,
      id: message.id,
      attachments: message.attachments,
      time: message.time,
      embeds: message.embeds,
    });

    if (channel.messages.length > globals.limit) {
      channel.messages.splice(0, 1);
    }
  });

  Object.entries(user).forEach((users) => {
    fs.writeFileSync(`data/users/${users[0]}.json`, JSON.stringify(users[1]));
  });

  fs.writeFileSync(`data/${guildId}/${channelId}.json`, JSON.stringify(channel));
};

module.exports = {
  backUpMessage,
  getChannelIdByName,
  backUpMessages,
};
