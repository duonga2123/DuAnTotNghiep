const mongoose = require('mongoose');

const baivietSchema = new mongoose.Schema({
userId:{type:mongoose.Schema.Types.ObjectId, ref:'user'},
content:String,
like:Number,
content:String,
comment:String,
isLiked:{type:Boolean,default:false}
});

const Baiviet = mongoose.model('baiviet', baivietSchema);
module.exports = Baiviet;