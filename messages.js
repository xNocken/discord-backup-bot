const { prefix } = require('./config');

const parseTime = (time) => {
  const parsedTime = new Date(time);

  return `${parsedTime.getMinutes() + 60 * (parsedTime.getHours() - 1)}:${(parsedTime.getSeconds().toString().length === 1 ? '0' : '') + parsedTime.getSeconds()}`;
};

module.exports = {
  'backup.status': (enabled) => `This channel will${enabled ? '' : ' not'} be backed up`,
  'private.deactivate': 'Your messages will no longer be backed up. Contact the owner xNocken#9999 to get your already backupped messages removed.',
  'setting.invalid': 'Use "on" or "off".',
  'private.activate': 'Your messages will now be backed up.',
  nopermissions: 'You have insufficient permission(s) to use this command.',
  notfound: `Command not found. Use "${prefix}backup help" for help`,
  'index.start': 'Indexing channel messages. This may take a while.',
  'index.complete': (count) => `Done. Indexed ${count} messages.`,
  'index.busy': 'You are already indexing this channel.',
  'index.disabled': `Indexing in this channel is disabled. Type "${prefix}backup set on" to activate indexing in this channel.`,
  'restore.notfound': (name) => `No backup found with channel name ${name}.`,
  'restore.start': (time) => `Restore started. This will take approximatly ${parseTime(time)} minutes`,
  'restore.complete': (amount, time) => `Restored ${amount} messages in ${parseTime(time)} minutes.`,
  'restore.empty': 'Your backup has no messages. Are you sure indexing is enabled?',
  'setting.enable.guild': 'Messages in this channel will be backed up from now on.',
  'setting.disable.guild': `Messages in this channel will no longer be backed up. Use "${prefix}backup delete" in this channel to delete the existing backup.`,
  'delete.sure': (name) => `Confirm the deletion of this backup in channel ${name}.`,
  'delete.completed': 'Backup successfully deleted.',
  'delete.error': 'Error while deleting backup. Contact the owner xNocken#9999 for more information.',
  'delete.abort': 'Deletion aborted.',
  'private.tos': `By joining this server you agree that I can backup messages sent by you in this server. You can deactivate that your messages get backed up by sending "${prefix}backup set off" to me in this channel\n\nYou can check if a channel gets backed up by sending ${prefix}backup status.\nIf you want to know about all messages I have backed up, you can follow the steps below.\n\nHow to see all messages: \n1. Visit https://vortexbot.wtf\n2. Create an account\n3. Go to Backup Bot in the navigation\n4. Link your Discord account to verify its you.\n5. You now get a list of all servers that have messages stored sent by you.`,
  'stop.notactive': 'You cant stop something that isn\'t there',
  'help.message': 'You can find a list of all commands here: \nhttps://vortexbot.wtf/commands',
};
