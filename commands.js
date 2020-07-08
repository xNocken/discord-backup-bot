const fs = require('fs');
const translations = require('./messages');
const globals = require('./globals');
const { backUpMessage, getChannelIdByName } = require('./helper');

const index = (reply, args, guildId, channelId, message) => {
  const file = JSON.parse(fs.readFileSync(`data/${guildId}/${channelId}.json`));

  file.messages = [];

  fs.writeFileSync(`data/${guildId}/${channelId}.json`, JSON.stringify(file));

  reply(translations['index.start']);

  let count = 0;
  const messageList = [];

  const callback = (messageRes) => {
    count += messageRes.length;
    const newmessageRes = messageRes.reverse();
    newmessageRes.reverse();
    newmessageRes.forEach((item) => messageList.push(item));

    if (messageRes.length !== 100 || messageList.length >= globals.limit) {
      reply(translations['index.complete'](count));
      messageList.reverse();
      messageList.forEach((item) => {
        backUpMessage(item);
      });
      return;
    }

    setTimeout(() => {
      message.getChannel().getMessages(100, messageRes[messageRes.length - 1].id, callback);
    }, 1000);
  };

  message.getChannel().getMessages(100, message.id, callback);
};

const restore = (reply, args, guildId, channelId, message) => {
  const id = getChannelIdByName(args[0], guildId);

  if (!id) {
    reply(translations['restore.notfound'](args[0]));
    return;
  }

  const restoreMessages = JSON.parse(fs.readFileSync(`data/${guildId}/${id}.json`)).messages;

  const startTime = (new Date());

  reply(translations['restore.start']((restoreMessages.length * 1) * 1000));

  restoreMessages.forEach((Rmessage) => {
    const body = {
      content: `${(new Date(Rmessage.time).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }))} ${Rmessage.author}: ${Rmessage.content}
${Rmessage.attachments[0] ? Rmessage.attachments[0].url : ''}`,
      file: Rmessage.attachments[0],
      embed: Rmessage.embeds ? Rmessage.embeds[0] : null,
      nonce: `backupmessage${Math.floor(Math.random() * 10000000000)}`,
    };

    message.getChannel().sendMessageBody(body, () => {
      if (index === restoreMessages.length - 1) {
        reply(translations['restore.complete'](restoreMessages.length, ((new Date())) - startTime));
      }
    });
  });
};

const set = (reply, args, guildId, channelId) => {
  const settings = JSON.parse(fs.readFileSync(`data/${guildId}.json`));

  switch (args[0]) {
    case 'on':
      settings.channels[channelId] = true;
      reply(translations['setting.enable.guild']);

      break;
    case 'off':
      settings.channels[channelId] = false;
      reply(translations['setting.disable.guild']);

      break;

    default:
      reply(translations['setting.invalid']);
  }

  console.log(settings, `data/${guildId}.json`);

  console.log(fs.writeFileSync(`data/${guildId}.json`, JSON.stringify(settings)));
};

const deletee = (reply, args, guildId, channelId, message) => {
  if (!fs.existsSync(`data/${guildId}/${channelId}.json`)) {
    reply(translations['restore.notfound']);
  } else {
    reply(translations['delete.sure'](message.getChannel().name), null, (response) => {
      response.react('✔️');
      setTimeout(() => {
        response.react('✖️');
      }, 500);

      globals.reactions[message.author.id] = (willDelete) => {
        if (willDelete) {
          try {
            fs.unlinkSync(`data/${guildId}/${channelId}.json`);
            reply(translations['delete.completed']);
          } catch (err) {
            reply(translations['delete.error']);
          }
        } else {
          reply(translations['delete.abort']);
        }
      };
    });
  }
};

const status = (reply, args, guildId, channelId) => {
  const settings = JSON.parse(fs.readFileSync(`data/${guildId}.json`));

  reply(translations['backup.status'](settings.channels[channelId]));
};

module.exports = {
  set,
  delete: deletee,
  status,
  restore,
  index,
};
