const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  adminId:String,
  title: String,
  content: String,
  userId: {type:mongoose.Schema.Types.ObjectId,ref:'user'},
  isRead: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  mangaId: {type:mongoose.Schema.Types.ObjectId,ref:'manga'}
});

const Notification = mongoose.model('notification', notificationSchema);
module.exports = Notification;