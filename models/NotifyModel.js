const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: String,
  content: String,
  userId: String,
  isRead: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

const Notification = mongoose.model('notification', notificationSchema);
module.exports = Notification;