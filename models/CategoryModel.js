const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryname: { type: String, required: true, unique: true },
  manga: [{ type: mongoose.Schema.Types.ObjectId, ref: 'manga' }]
});

const Category = mongoose.model('category', categorySchema);

module.exports = Category;