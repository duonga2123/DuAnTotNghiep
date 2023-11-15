const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
mangaName:String,
number:String,
images: [String],
viporfree:{type:String,enum:['vip','free']},
price:Number,
isChap:{type:Boolean,default:false}
});

const Chapter = mongoose.model('chapter', chapterSchema);

module.exports = Chapter;