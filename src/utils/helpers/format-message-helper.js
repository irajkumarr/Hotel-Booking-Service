function formatMessage(msg) {
  if (!msg) return "";
  msg = msg.replace(/\"/g, "");
  return msg.charAt(0).toUpperCase() + msg.slice(1);
}

module.exports = formatMessage;