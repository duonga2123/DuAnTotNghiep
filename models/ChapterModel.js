const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
mangaName:String,
number:String,
images: [String],
viporfree:{type:String,enum:['vip','free']},
price:Number
});

const Chapter = mongoose.model('chapter', chapterSchema);

module.exports = Chapter;