const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
mangaName:String,
number:Number,
images: [String],
viporfree:{type:String,enum:['vip','free']},
price:Number
});

const Chapter = mongoose.model('chapter', chapterSchema);

module.exports = Chapter;