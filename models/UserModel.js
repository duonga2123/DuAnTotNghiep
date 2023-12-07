const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  success:{type:Boolean,enum:[true], default:true},
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar:{type:String},
  phone:{type:String},
  role: { type: String, enum: ['admin', 'user','nhomdich'], default: 'user' },
  payment:[{ type: mongoose.Schema.Types.ObjectId, ref: 'payment' }],
  coin:Number,
  purchasedChapters: [{
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'chapter' },
    isChapterFree: Boolean, 
  }],
  favoriteManga:[{
    mangaId: { type: mongoose.Schema.Types.ObjectId, ref: 'manga' },
    isLiked: { type: Boolean, default: false },
  }],
  baiviet:[{type:mongoose.Schema.Types.ObjectId,ref:'baiviet'}],
  favoriteBaiviet:[{
    baivietId: { type: mongoose.Schema.Types.ObjectId, ref: 'baiviet' },
    isLiked: { type: Boolean, default: false },
  }],
  follow:[{
    nhomdichId: {type:mongoose.Schema.Types.ObjectId,ref:'user'},
    isfollow:{type:Boolean, default:false}
  }],
  follownumber:{type:Number},
  banking:[{
    hovaten:{type:String},
    phuongthuc:{type:String},
    sotaikhoan:{type:String},
    maQR:{type:String}
  }]
});

const User = mongoose.model('user', userSchema);
module.exports = User;
