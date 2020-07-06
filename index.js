const Discord = require('discord-module');
const fs = require('fs');
const Path = require('path');

const { User, Channel } = Discord;
const token = require('./token');
const translations = require('./messages');

const discord = new Discord({ token });

const reactions = {};

const limit = 10000;

if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

if (!fs.existsSync('data/settings.json')) {
  fs.writeFileSync('data/settings.json', JSON.stringify({
    channels: {},
    guilds: {},
  }));
}

if (!fs.existsSync('data/left.json')) {
  fs.writeFileSync('data/left.json', '{}');
}

if (!fs.existsSync('data/users.json')) {
  fs.writeFileSync('data/users.json', '{}');
}

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

const backUpMessage = (message) => {
  const channel = JSON.parse(fs.readFileSync(`data/${message.getChannel().guildId}/${message.getChannel().id}.json`));
  const settings = JSON.parse(fs.readFileSync(`data/${message.getChannel().guildId}.json`));
  const users = JSON.parse(fs.readFileSync('data/users.json'));

  if (message.type !== 0
    || !message.author
    || (!users[message.author.id] && !message.author.bot)
    || (message.nonce && message.nonce.match('backupmessage'))
    || !settings.channels[message.getChannel().id]) {
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

  if (channel.messages.length > limit) {
    channel.messages.splice(0, 1);
  }

  fs.writeFileSync(`data/${message.getChannel().guildId}/${message.getChannel().id}.json`, JSON.stringify(channel));
};

discord.onmessage = (message, reply) => {
  const args = message.content.split(' ');
  let allowed = false;

  args.splice(0, 2);

  if (message.getChannel().type === Channel.types.DM) {
    if (!message.author) {
      return;
    }

    if (message.content.startsWith('#backup set')) {
      const settings = JSON.parse(fs.readFileSync('data/users.json'));

      switch (args[0]) {
        case 'on':
          settings[message.author.id] = true;
          reply(translations['private.activate']);

          break;
        case 'off':
          settings[message.author.id] = false;
          reply(translations['private.deactivate']);

          break;
        default:
          reply(translations['setting.invalid']);
      }

      fs.writeFileSync('data/users.json', JSON.stringify(settings));
    }

    return;
  }

  if (!fs.existsSync(`data/${message.getChannel().guildId}`)) {
    fs.mkdirSync(`data/${message.getChannel().guildId}`);
  }

  if (!fs.existsSync(`data/${message.getChannel().guildId}/${message.getChannel().id}.json`)) {
    fs.writeFileSync(`data/${message.getChannel().guildId}/${message.getChannel().id}.json`, JSON.stringify({
      name: message.getChannel().name,
      messages: [],
    }));
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

    let count = 0;
    const messageList = [];

    const callback = (messageRes) => {
      count += messageRes.length;
      const newmessageRes = messageRes.reverse();
      newmessageRes.reverse();
      newmessageRes.forEach((item) => messageList.push(item));

      if (messageRes.length !== 100 || messageList.length >= limit) {
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
  }

  if (message.content.startsWith('#backup restore')) {
    if (!allowed) {
      reply(translations.nopermissions);
      return;
    }

    const id = getChannelIdByName(args[0], message.getChannel().guildId);

    if (!id) {
      reply(translations['restore.notfound'](args[0]));
      return;
    }

    const restoreMessages = JSON.parse(fs.readFileSync(`data/${message.getChannel().guildId}/${id}.json`)).messages;

    const startTime = (new Date());

    reply(translations['restore.start']((restoreMessages.length * 1) * 1000));

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
          reply(translations['restore.complete'](restoreMessages.length, ((new Date())) - startTime));
        }
      });
    });
  }

  if (message.content.startsWith('#backup set')) {
    if (!allowed) {
      reply(translations.nopermissions);
      return;
    }

    const settings = JSON.parse(fs.readFileSync(`data/${message.getChannel().guildId}.json`));

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

    console.log(settings, `data/${message.getChannel().guildId}.json`);

    console.log(fs.writeFileSync(`data/${message.getChannel().guildId}.json`, JSON.stringify(settings)));
  }

  if (message.content.startsWith('#backup delete')) {
    if (!allowed) {
      reply(translations.nopermissions);
      return;
    }

    if (!fs.existsSync(`data/${message.getChannel().guildId}/${message.getChannel().id}.json`)) {
      reply(translations['restore.notfound']);
    } else {
      reply(translations['delete.sure'](message.getChannel().name), null, (response) => {
        response.react('✔️');
        setTimeout(() => {
          response.react('✖️');
        }, 500);

        reactions[message.author.id] = (willDelete) => {
          if (willDelete) {
            try {
              fs.unlinkSync(`data/${message.getChannel().guildId}/${message.getChannel().id}.json`);
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
    const settings = JSON.parse(fs.readFileSync(`data/${message.getChannel().guildId}.json`));

    reply(translations['backup.status'](settings.channels[message.getChannel().id]));
  }
};

discord.on('MESSAGE_REACTION_ADD', (data) => {
  if (reactions[data.user_id]) {
    reactions[data.user_id](data.emoji.name.match('✔️'));
  }
});

discord.on('GUILD_DELETE', (data) => {
  const settings = JSON.parse(fs.readFileSync('data/left.json'));

  settings.left[data.id] = new Date();

  fs.writeFileSync('data/left.json', JSON.stringify(settings));
});

discord.on('GUILD_CREATE', (data) => {
  if (!fs.existsSync(`data/${data.id}.json`)) {
    fs.writeFileSync(`data/${data.id}.json`, JSON.stringify({
      channels: [],
      left: '',
    }));
  }

  const settings = JSON.parse(fs.readFileSync(`data/${data.id}.json`));
  const left = JSON.parse(fs.readFileSync('data/left.json'));
  const membersSettings = JSON.parse(fs.readFileSync('data/users.json'));

  const members = Object.values(discord.getGuildById(data.id).members);

  members.forEach((member) => {
    if (membersSettings[member.user.id] === undefined) {
      membersSettings[member.user.id] = true;
    }
  });

  delete left[data.id];

  fs.writeFileSync(`data/${data.id}.json`, JSON.stringify(settings));
  fs.writeFileSync('data/users.json', JSON.stringify(membersSettings));
  fs.writeFileSync('data/left.json', JSON.stringify(left));
});

discord.on('GUILD_MEMBER_ADD', (data) => {
  const settings = JSON.parse(fs.readFileSync('data/users.json'));

  settings.users[data.user.id] = true;

  fs.writeFileSync('data/users.json', JSON.stringify(settings));

  const user = discord.getUserById(data.user.id);

  if (!user) {
    User.getUserById(data.user.id, (newUser) => {
      newUser.getPrivateChannelId((id) => {
        setTimeout(() => {
          discord.getChannelById(id).sendMessage(translations['private.tos'], false, () => { });
        }, 1000);
      });
    });
  }

  user.getPrivateChannelId((id) => {
    setTimeout(() => {
      discord.getChannelById(id).sendMessage(translations['private.tos'], false, () => { });
    }, 1000);
  });
});

discord.on('CHANNEL_UPDATE', (channel) => {
  if (fs.existsSync(`data/${channel.guild_id}/${channel.id}.json`)) {
    const jsonChannel = JSON.parse(fs.readFileSync(`data/${channel.guild_id}/${channel.id}.json`));

    jsonChannel.name = channel.name;

    fs.writeFileSync(`data/${channel.guild_id}/${channel.id}.json`, JSON.stringify(jsonChannel));
  }
});

discord.on('READY', (data) => {
  if (!data.user.bot) {
    console.error('User needs to be a bot');
    process.exit();
  }

  console.log('Successfully started bot');
  console.log(`Username: ${data.user.username}#${data.user.discriminator}`);
});

setInterval(() => {
  const settings = JSON.parse(fs.readFileSync('data/left.json'));

  Object.entries(settings).forEach((guild) => {
    if ((new Date(guild[1]).getTime() + 1000 * 60 * 60 * 24) < new Date()) {
      deleteFolderRecursive(`data/${guild[0]}`);
    }

    delete settings[guild[0]];
  });

  fs.writeFileSync('data/left.json', JSON.stringify(settings));
}, 1000 * 60 * 30);
