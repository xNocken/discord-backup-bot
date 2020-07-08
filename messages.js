const parseTime = (time) => {
  const parsedTime = new Date(time);

  return `${parsedTime.getMinutes()}:${(parsedTime.getSeconds().toString().length === 1 ? '0' : '') + parsedTime.getSeconds()}`;
};

module.exports = {
  'backup.status': (enabled) => `This channel will${enabled ? '' : ' not'} be backed up`,
  'private.deactivate': 'Your messages will no longer be backed up. Contact the owner xNocken#9999 to get your already backupped messages removed.',
  'setting.invalid': 'Use "on" or "off".',
  'private.activate': 'Your messages will now be backed up.',
  nopermissions: 'You have insufficient permission(s) to use this command.',
  notfound: 'Command not found. Use \'#backup help\' for help',
  'index.start': 'Indexing channel messages. This may take a while.',
  'index.complete': (count) => `Done. Indexed ${count} messages.`,
  'restore.notfound': (name) => `No backup found with channel name ${name}.`,
  'restore.start': (time) => `Restore started. This will take approximatly ${parseTime(time)} minutes`,
  'restore.complete': (amount, time) => `Restored ${amount} messages in ${parseTime(time)} minutes.`,
  'setting.enable.guild': 'Messages in this channel will be backed up from now on.',
  'setting.disable.guild': 'Messages in this channel will no longer be backed up. Use #backup delete in this channel to delete the existing backup.',
  'delete.sure': (name) => `Confirm the deletion of this backup in channel ${name}.`,
  'delete.completed': 'Backup successfully deleted.',
  'delete.error': 'Error while deleting backup. Contact the owner xNocken#9999 for more information.',
  'delete.abort': 'Deletion aborted.',
  'private.tos': 'By joining this server you agree that I can backup messages sent by you in this server. You can deactivate that your messages get backed up by sending "#backup set off" to me in this channel\n\nYou can check if a channel gets backed up by sending #backup status',
};
