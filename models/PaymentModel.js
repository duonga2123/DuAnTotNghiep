const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userID: String,
    currency:String,
    totalAmount:Number,
    coin:Number,
    date:Date,
    success:String
});
const Payment = mongoose.model('payment', PaymentSchema);
module.exports = Payment;