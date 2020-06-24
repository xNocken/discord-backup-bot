const Discord = require('discord-module');
const fs = require('fs');

const token = require('./token');

const discord = new Discord({ token });

const reactions = {};

discord.onmessage = (message, reply) => {
  const args = message.content.split(' ');
  args.splice(0, 2);
  let messages = [];

  if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
  }

  if (!fs.existsSync(`data/${message.getChannel().guildId}`)) {
    fs.mkdirSync(`data/${message.getChannel().guildId}`);
  }

  if (!fs.existsSync('data/settings.json')) {
    fs.writeFileSync('data/settings.json', JSON.stringify({
      channels: {},
    }));
  }

  if (fs.existsSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`)) {
    messages = JSON.parse(fs.readFileSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`));
  }

  if (message.content.startsWith('#backup index')) {
    reply('Indexing channel messages. This may take a while.');

    if (fs.existsSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`)) {
      fs.unlinkSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`);
    }

    let messagess = [];

    const callback = (messageRes) => {
      const newmessageRes = messageRes.reverse();
      messagess = [
        ...newmessageRes.map((item) => ({
          author: `${item.author.username}#${item.author.discriminator}`,
          content: item.content,
          id: item.id,
          attachments: item.attachments,
          time: item.time,
          embeds: item.embeds,
        })),
        ...messagess,
      ];

      if (messageRes.length !== 50) {
        if (fs.existsSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`)) {
          messages = JSON.parse(fs.readFileSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`));
        }

        fs.writeFileSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`, JSON.stringify([...messagess, ...messages]));
        reply(`Done. Indexed ${messagess.length} messages.`);
        return;
      }

      setTimeout(() => {
        message.getChannel().getMessages(50, messagess[0].id, callback);
      }, 1000);
    };

    message.getChannel().getMessages(50, message.id, callback);
  }

  if (message.content.startsWith('#backup restore')) {
    if (!fs.existsSync(`data/${message.getChannel().guildId}/${args[0]}.json`)) {
      reply(`No backup found with channel name ${args[0]}.`);

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
          reply(`Restored ${restoreMessages.length} messages in ${(((new Date()) - startTime) / 1000 / 60).toFixed(2)} minutes.`);
        }
      });
    });
  }

  discord.on('MESSAGE_REACTION_ADD', (data) => {
    console.log(data);
    if (reactions[data.user_id]) {
      reactions[data.user_id](data.emoji.name.match('👍'));
    }
  });

  if (message.content.startsWith('#backup set')) {
    const settings = JSON.parse(fs.readFileSync('data/settings.json'));

    switch (args[0]) {
      case 'on':
        settings.channels[message.getChannel().id] = true;
        reply('Messages in this channel will be backed up.');

        break;
      case 'off':
        settings.channels[message.getChannel().id] = false;
        reply('Messages in this channel will no longer be backed up. Use #backup delete in this channel to delete the existing backup.');

        break;

      default:
        reply('Use "on" or "off".');
    }

    fs.writeFileSync('data/settings.json', JSON.stringify(settings));
  }

  if (message.content.startsWith('#backup delete')) {
    if (!fs.existsSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`)) {
      reply('No backup for this channel found.');
      return;
    }

    reply('Are you sure?', null, (response) => {
      response.react('👍');
      setTimeout(() => {
        response.react('👎');
      }, 500);

      reactions[message.author.id] = (willDelete) => {
        if (willDelete) {
          try {
            fs.unlinkSync(`data/${message.getChannel().guildId}/${message.getChannel().name}.json`);
            reply('Backup successfully deleted.');
          } catch (err) {
            reply('Error while deleting backup. Contact the Owner xNocken#9999 for information.');
          }
        } else {
          reply('Delete aborted.');
        }
      };
    });
  }

  if (message.type !== 0 || !message.author || (message.nonce && message.nonce.match('backupmessage')) || !JSON.parse(fs.readFileSync('data/settings.json')).channels[message.getChannel().id]) {
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
