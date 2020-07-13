const fs = require('fs');
const translations = require('./messages');
const globals = require('./globals');
const { backUpMessages, getChannelIdByName } = require('./helper');

const index = (reply, args, guildId, channelId, message) => {
  if (globals.indexing[channelId]) {
    reply(translations['index.busy']);
    return;
  }

  const settings = JSON.parse(fs.readFileSync(`data/${guildId}.json`));

  if (!settings.channels[channelId]) {
    reply(translations['index.disabled']);
    return;
  }

  globals.indexing[channelId] = true;
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
      globals.indexing[channelId] = false;
      messageList.reverse();
      backUpMessages(messageList);
      return;
    }

    setTimeout(() => {
      message.getChannel().getMessages(100, messageRes[messageRes.length - 1].id, callback);
    }, 1000);
  };

  message.getChannel().getMessages(100, message.id, callback);
};

const restore = (reply, args, guildId, channelId, message) => {
  if (globals.restoring[channelId]) {
    return;
  }

  globals.restoring[channelId] = true;

  const id = getChannelIdByName(args[0], guildId);

  message.getChannel().typing();

  if (!id) {
    delete globals.restoring[channelId];
    reply(translations['restore.notfound'](args[0]));
    return;
  }

  fs.readFile(`data/${guildId}/${id}.json`, (_, file) => {
    const restoreMessages = JSON.parse(file).messages;

    const startTime = (new Date());
    let lastAuthor = '';

    if (!restoreMessages.length) {
      reply(translations['restore.empty']);
    }

    reply(translations['restore.start']((restoreMessages.length * 0.04) * 1000));
    let messageContent = '';

    restoreMessages.forEach((Rmessage, indexx) => {
      let nextLength = 0;
      if (restoreMessages[indexx + 1]) {
        nextLength = `\n${(new Date(restoreMessages[indexx + 1].time).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        }))} ${restoreMessages[indexx + 1].author}: ${restoreMessages[indexx + 1].content}
${restoreMessages[indexx + 1].attachments[0] ? restoreMessages[indexx + 1].attachments[0].url : ''}`.length;
      }

      messageContent += lastAuthor !== Rmessage.author ? `\n${(new Date(Rmessage.time).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }))} ${Rmessage.author}: \n ${Rmessage.content}
${Rmessage.attachments[0] ? Rmessage.attachments[0].url : ''}` : `${Rmessage.content || '⠀'}\n`;

      lastAuthor = Rmessage.author;

      if (Rmessage.attachments.length || Rmessage.embeds.length || !restoreMessages[indexx + 1] || (messageContent.length + nextLength > 2000)) {
        const body = {
          content: messageContent.length < 2000 ? messageContent : Rmessage.content,
          file: Rmessage.attachments[0],
          embed: Rmessage.embeds ? Rmessage.embeds[0] : null,
          nonce: `backupmessage${Math.floor(Math.random() * 10000000000)}`,
        };

        messageContent = '';

        message.getChannel().sendMessageBody(body, () => {
          if (indexx === restoreMessages.length - 1) {
            delete globals.restoring[channelId];
            reply(translations['restore.complete'](restoreMessages.length, ((new Date())) - startTime));
          }
        });
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

  fs.writeFileSync(`data/${guildId}.json`, JSON.stringify(settings));
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

const stop = (reply, args, guildId, channelId, message) => {
  if (!globals.restoring[channelId]) {
    reply(translations['stop.notactive']);
    return;
  }

  message.getChannel().emptyQueue();
};

module.exports = {
  set,
  delete: deletee,
  status,
  restore,
  index,
  stop,
};
