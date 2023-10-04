const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
mangaName:String,
number:String,
images: [String],
viporfree:{type:String,enum:['vip','free']}
});

const Chapter = mongoose.model('chapter', chapterSchema);

module.exports = Chapter;