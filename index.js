const express = require('express');
const mongoose = require('mongoose');
const User=require('./models/UserModel')
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
var app=express();
const uri="mongodb+srv://totnghiepduan2023:MaNXmiIny7im1yjG@cluster0.tzx1qqh.mongodb.net/DuanTotNghiep?retryWrites=true&w=majority";
mongoose.connect(uri,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(console.log("kết nối thành công"));

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/register', async (req, res) => {
    try {
      const { username, password, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user = new User({ username, password: hashedPassword, role });
      await user.save();
  
      res.status(201).json({ message: 'Tài khoản đã được tạo thành công.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Đã xảy ra lỗi.' });
    }
  });
  app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
  
      if (!user) {
        return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
      }
  
      const isPasswordValid = await bcrypt.compare(password, user.password);
  
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
      }
  
      const token = jwt.sign({ userId: user._id, role: user.role }, 'mysecretkey');
      res.status(200).json({ token, role: user.role,message: 'đăng nhập thành công.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Đã xảy ra lỗi.' });
    }
  });

app.listen(8080,()=>
console.log("Server is running on port 8080...")
);