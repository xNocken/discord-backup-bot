module.exports = {
  'private.deactivate': 'Your messages will no longer be backed up. Contact the owner xNocken#9999 to get your already backupped messages removed.',
  'setting.invalid': 'Use "on" or "off".',
  'private.activate': 'Your messages will now be backed up.',
  nopermissions: 'You have insufficient permission(s) to use this command.',
  'index.start': 'Indexing channel messages. This may take a while.',
  'index.complete': (count) => `Done. Indexed ${count} messages.`,
  'restore.notfound': (name) => `No backup found with channel name ${name}.`,
  'restore.complete': (amount, time) => `Restored ${amount.length} messages in ${time} minutes.`,
  'setting.enable.guild': 'Messages in this channel will be backed up from now on.',
  'setting.disable.guild': 'Messages in this channel will no longer be backed up. Use #backup delete in this channel to delete the existing backup.',
  'delete.sure': 'Confirm the deletion of this backup.',
  'delete.completed': 'Backup successfully deleted.',
  'delete.error': 'Error while deleting backup. Contact the owner xNocken#9999 for more information.',
  'delete.abort': 'Deletion aborted.',
};
