const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userID: String,
    currency:Number,
    total:String,
    coin:Number,
    date:Date
});

const Payment = mongoose.model('payment', PaymentSchema);
module.exports = Payment;