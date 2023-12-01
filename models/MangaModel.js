const mongoose = require('mongoose');

const mangaSchema = new mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  manganame: { type: String, required: true },
  author: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String },
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'chapter' }],
  category: String,
  view: Number,
  like: Number,
  comment: [{
    userID: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    cmt: { type: String },
    date:{type:Date}
  }],
  isRead:{type:Boolean},
  isApproved: { type: Boolean, default: false }, // Trường mới để đánh dấu trạng thái được duyệt hay không
  pendingChanges: {
    // Trường mới để lưu trữ các thay đổi đang chờ
    manganame: { type: String },
    author: { type: String },
    content: { type: String },
    category: { type: String },
    view: { type: Number },
    like: { type: Number },
    image: { type: String },
    link:{type:String}
  },
  link:{type:String}
});

const Manga = mongoose.model('manga', mangaSchema);

module.exports = Manga;