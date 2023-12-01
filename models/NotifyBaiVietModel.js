const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: String,
  content: String,
  userId: {type:mongoose.Schema.Types.ObjectId,ref:'user'},
  date: { type: Date, default: Date.now },
  baivietId: {type:mongoose.Schema.Types.ObjectId,ref:'baiviet'}
});

const Notification = mongoose.model('notificationbaiviet', notificationSchema);
module.exports = Notification;