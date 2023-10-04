const mongoose = require('mongoose');

const mangaSchema = new mongoose.Schema({
  manganame: { type: String, required: true},
  author: { type: String, required: true },
  content: { type: String, required: true },
  image: { type:String, required: true },
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'chapter' }],
  category: String
});

const Manga = mongoose.model('manga', mangaSchema);

module.exports = Manga;