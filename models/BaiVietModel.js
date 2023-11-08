const mongoose = require('mongoose');

const baivietSchema = new mongoose.Schema({
userId:String,
content:String,
like:Number,
content:String,
comment:String
});

const Baiviet = mongoose.model('baiviet', baivietSchema);
module.exports = Baiviet;