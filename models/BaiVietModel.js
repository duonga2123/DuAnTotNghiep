const mongoose = require('mongoose');

const baivietSchema = new mongoose.Schema({

});

const Baiviet = mongoose.model('baiviet', baivietSchema);
module.exports = Baiviet;