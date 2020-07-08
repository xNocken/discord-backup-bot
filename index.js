const Discord = require('discord-module');
const fs = require('fs');
const Path = require('path');

const { User, Channel } = Discord;
const token = require('./token');
const translations = require('./messages');
const commands = require('./commands');
const { backUpMessage } = require('./helper');

const discord = new Discord({ token });

const reactions = {};

if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

if (!fs.existsSync('data/users')) {
  fs.mkdirSync('data/users');
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

const commandsList = {
  set: {
    func: commands.set,
    admin: true,
  },
  delete: {
    func: commands.delete,
    admin: true,
  },
  index: {
    func: commands.index,
    admin: true,
  },
  status: {
    func: commands.status,
    admin: true,
  },
  restore: {
    func: commands.restore,
    admin: true,
  },
};

discord.onmessage = (message, reply) => {
  const { guildId, id: channelId } = message.getChannel();
  const args = message.content.split(' ');

  args.splice(0, 1);

  if (!message.author) {
    return;
  }

  if (message.getChannel().type === Channel.types.DM) {
    if (message.content.startsWith('#backup set')) {
      const settings = JSON.parse(fs.readFileSync('data/users.json'));

      switch (args[1]) {
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

  if (!fs.existsSync(`data/${guildId}`)) {
    fs.mkdirSync(`data/${guildId}`);
  }

  if (!fs.existsSync(`data/${guildId}/${channelId}.json`)) {
    fs.writeFileSync(`data/${guildId}/${channelId}.json`, JSON.stringify({
      name: message.getChannel().name,
      messages: [],
    }));
  }

  backUpMessage(message);

  if (message.content.startsWith('*backup')) {
    const perms = message.getChannel().getPermissionOverwrite(message.author.id);

    const allowed = perms.MANAGE_MESSAGES;
    const command = args.splice(0, 1)[0];

    if (commandsList[command]) {
      if (commandsList[command].admin) {
        if (allowed) {
          commandsList[command].func(reply, args, guildId, channelId, message);
        } else {
          reply(translations.nopermissions);
        }
      } else {
        commandsList[command].func(reply, args, guildId, channelId, message);
      }
    } else {
      reply(translations.notfound);
    }
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
      channels: {},
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

  settings[data.user.id] = true;

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

  console.log(`Username: ${data.user.username}#${data.user.discriminator}`);
  console.log('Bot startet. Send messages to start indexing');
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
