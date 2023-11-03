const mongoose = require('mongoose');

const mangaSchema = new mongoose.Schema({

  manganame: { type: String, required: true},
  author: { type: String, required: true },
  content: { type: String, required: true },
  image: { type:String },
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'chapter' }],
  category: String,
  view:Number,
  like:Number,
  comment:[{
    userID:{type:mongoose.Schema.Types.ObjectId,ref:'user'},
    cmt:{type: String}
  }]
});

const Manga = mongoose.model('manga', mangaSchema);

module.exports = Manga;