const fs = require('fs');
const globals = require('./globals');

const backUpMessage = (message) => {
  const { guildId, id: channelId } = message.getChannel();

  const channel = JSON.parse(fs.readFileSync(`data/${guildId}/${channelId}.json`));
  const settings = JSON.parse(fs.readFileSync(`data/${guildId}.json`));
  const users = JSON.parse(fs.readFileSync('data/users.json'));

  if (message.type !== 0
    || !message.author
    || (!users[message.author.id] && !message.author.bot)
    || (message.nonce && message.nonce.match('backupmessage'))
    || !settings.channels[channelId]) {
    return;
  }

  channel.messages.push({
    author: `${message.author.username}#${message.author.discriminator}`,
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
};

const getChannelIdByName = (name, guildId) => {
  let id = false;

  const folder = fs.readdirSync(`data/${guildId}`);

  folder.forEach((fileName) => {
    console.log(JSON.parse(fs.readFileSync(`data/${guildId}/${fileName}`)), name);

    if (JSON.parse(fs.readFileSync(`data/${guildId}/${fileName}`)).name === name) {
      [id] = fileName.split('.json');
    }
  });

  return id;
};

module.exports = {
  backUpMessage,
  getChannelIdByName,
};
