const Discord = require('discord-module');
const fs = require('fs');
const Path = require('path');

const { User, Channel } = Discord;
const token = require('./token');
const translations = require('./messages');

const discord = new Discord({ token });

const reactions = {};

const deleteFolderRecursive = (path) => {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file) => {
      const curPath = Path.join(path, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

const backUpMessage = (message) => {
  const messages = JSON.parse(fs.readFileSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`));
  const settings = JSON.parse(fs.readFileSync('data/settings.json'));

  if (message.type !== 0
    || !message.author
    || (!settings.users[message.author.id] && !message.author.bot)
    || (message.nonce && message.nonce.match('backupmessage'))
    || !settings.channels[message.getChannel().id]) {
    return;
  }

  messages.push({
    author: `${message.author.username}#${message.author.discriminator}`,
    content: message.content,
    id: message.id,
    attachments: message.attachments,
    time: message.time,
    embeds: message.embeds,
  });

  fs.writeFileSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`, JSON.stringify(messages));
};

discord.onmessage = (message, reply) => {
  const args = message.content.split(' ');
  let allowed = false;

  args.splice(0, 2);

  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }

  if (!fs.existsSync('data/settings.json')) {
    fs.writeFileSync('data/settings.json', JSON.stringify({
      channels: {},
      guilds: {},
      users: {},
    }));
  }

  if (message.getChannel().type === Channel.types.DM) {
    if (!message.author) {
      return;
    }

    if (message.content.startsWith('#backup set')) {
      const settings = JSON.parse(fs.readFileSync('data/settings.json'));

      switch (args[0]) {
        case 'on':
          settings.users[message.author.id] = true;
          reply(translations['private.activate']);

          break;
        case 'off':
          settings.users[message.author.id] = false;
          reply(translations['private.deactivate']);

          break;
        default:
          reply(translations['setting.invalid']);
      }

      fs.writeFileSync('data/settings.json', JSON.stringify(settings));
    }

    return;
  }

  if (!fs.existsSync(`data/${message.getChannel().guildId}`)) {
    fs.mkdirSync(`data/${message.getChannel().guildId}`);
  }

  if (!fs.existsSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`)) {
    fs.writeFileSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`, '[]');
  }

  backUpMessage(message);

  if (message.content.startsWith('#backup')) {
    const perms = message.getChannel().getPermissionOverwrite(message.author.id);

    allowed = perms.MANAGE_MESSAGES;
  }

  if (message.content.startsWith('#backup index')) {
    if (!allowed) {
      reply(translations.nopermissions);
      return;
    }

    reply(translations['index.start']);

    if (fs.existsSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`)) {
      fs.writeFileSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`, '[]');
    }

    let count = 0;

    const callback = (messageRes) => {
      count += messageRes.length;
      const newmessageRes = messageRes.reverse();
      newmessageRes.forEach((item) => backUpMessage(item));

      if (messageRes.length !== 100) {
        reply(translations['index.complete'](count));
        return;
      }

      setTimeout(() => {
        message.getChannel().getMessages(100, newmessageRes[0].id, callback);
      }, 1000);
    };

    message.getChannel().getMessages(100, message.id, callback);
  }

  if (message.content.startsWith('#backup restore')) {
    if (!allowed) {
      reply(translations.nopermissions);
      return;
    }

    if (!fs.existsSync(`data/${message.getChannel().guildId}/${args[0]}.json`)) {
      reply(translations['restore.notfound'](args[0]));

      return;
    }
    const restoreMessages = JSON.parse(fs.readFileSync(`data/${message.getChannel().guildId}/${args[0]}.json`));

    const startTime = new Date();

    restoreMessages.forEach((Rmessage, index) => {
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
          reply(translations['restore.complete'](restoreMessages.length, (((new Date()) - startTime) / 1000 / 60).toFixed(2)));
        }
      });
    });
  }

  if (message.content.startsWith('#backup set')) {
    if (!allowed) {
      reply(translations.nopermissions);
      return;
    }

    const settings = JSON.parse(fs.readFileSync('data/settings.json'));

    switch (args[0]) {
      case 'on':
        settings.channels[message.getChannel().id] = true;
        reply(translations['setting.enable.guild']);

        break;
      case 'off':
        settings.channels[message.getChannel().id] = false;
        reply(translations['setting.disable.guild']);

        break;

      default:
        reply(translations['setting.invalid']);
    }

    fs.writeFileSync('data/settings.json', JSON.stringify(settings));
  }

  if (message.content.startsWith('#backup delete')) {
    if (!allowed) {
      reply(translations.nopermissions);
      return;
    }

    if (!fs.existsSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`)) {
      reply(translations['restore.notfound']);
    } else {
      reply(translations['delete.sure'], null, (response) => {
        response.react('✔️');
        setTimeout(() => {
          response.react('✖️');
        }, 500);

        reactions[message.author.id] = (willDelete) => {
          if (willDelete) {
            try {
              fs.unlinkSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`);
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
  }

  if (message.content.startsWith('#backup status')) {
    const settings = JSON.parse(fs.readFileSync('data/settings.json'));

    reply(`This channel will${settings.channels[message.getChannel().id] ? '' : ' not'} be backed up`);
  }
};

discord.on('MESSAGE_REACTION_ADD', (data) => {
  if (reactions[data.user_id]) {
    reactions[data.user_id](data.emoji.name.match('✔️'));
  }
});

discord.on('GUILD_DELETE', (data) => {
  const settings = JSON.parse(fs.readFileSync('data/settings.json'));

  settings.guilds[data.id] = new Date();

  fs.writeFileSync('data/settings.json', JSON.stringify(settings));
});

discord.on('GUILD_CREATE', (data) => {
  const settings = JSON.parse(fs.readFileSync('data/settings.json'));

  const members = Object.values(discord.getGuildById(data.id).members);

  members.forEach((member) => {
    if (settings.users[member.user.id] === undefined) {
      settings.users[member.user.id] = true;
    }
  });

  delete settings.guilds[data.id];

  fs.writeFileSync('data/settings.json', JSON.stringify(settings));
});

discord.on('GUILD_MEMBER_ADD', (data) => {
  const settings = JSON.parse(fs.readFileSync('data/settings.json'));

  settings.users[data.user.id] = true;

  fs.writeFileSync('data/settings.json', JSON.stringify(settings));

  const user = discord.getUserById(data.user.id);

  if (!user) {
    User.getUserById(data.user.id, (newUser) => {
      newUser.getPrivateChannelId((id) => {
        setTimeout(() => {
          discord.getChannelById(id).sendMessage('By joining this server you agree that I can backup messages sent by you in this server. You can deactivate that your messages get backed up by sending "#backup set off" to me in this channel\n\nYou can check if a channel gets backed up by sending #backup status', false, () => { });
        }, 1000);
      });
    });
  }

  user.getPrivateChannelId((id) => {
    setTimeout(() => {
      discord.getChannelById(id).sendMessage('By joining this server you agree that I can backup messages sent by you in this server. You can deactivate that your messages get backed up by sending "#backup set off" to me in this channel\n\nYou can check if a channel gets backed up by sending #backup status', false, () => { });
    }, 1000);
  });
});

setInterval(() => {
  const settings = JSON.parse(fs.readFileSync('data/settings.json'));

  Object.entries(settings.guilds).forEach((guild) => {
    if ((new Date(guild[1]).getTime() + 1000 * 60 * 60 * 24) < new Date()) {
      deleteFolderRecursive(`data/${guild[0]}`);
    }

    delete settings.guilds[guild[0]];
  });

  fs.writeFileSync('data/settings.json', JSON.stringify(settings));
}, 1000 * 60 * 30);
