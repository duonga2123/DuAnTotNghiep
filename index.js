const express = require('express');
const mongoose = require('mongoose');
const User=require('./models/UserModel')
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const paypal=require('paypal-rest-sdk');
const Category=require('./models/CategoryModel')
const multer=require('multer')
const Manga=require('./models/MangaModel')
const Chapter=require('./models/ChapterModel')

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

var app=express();
const uri="mongodb+srv://totnghiepduan2023:MaNXmiIny7im1yjG@cluster0.tzx1qqh.mongodb.net/DuanTotNghiep?retryWrites=true&w=majority";
mongoose.connect(uri,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(console.log("kết nối thành công"));



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//api get, post category
app.get('/categorys', async (req, res) => {
  try {
    const category = await Category.find();
    res.json(category);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thể loại:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách thể loại' });
  }
});

app.post('/category', async (req, res) => {
  try {
    const { categoryname } = req.body;
    const category = new Category({categoryname});
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Lỗi khi tạo thể loại:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo thể loại' });
  }
});
//api get, post truyện
app.post('/mangas', upload.single('image'), async (req, res) => {
  try {
    const { manganame, author, content, category } = req.body;
    const image =req.file.originalname; 
    const categoryObject = await Category.findOne({ categoryname: category })

    if (!categoryObject) {
      return res.status(404).json({ message: 'thể loại không tồn tại.' });
    }

    const manga = new Manga({ manganame, author, content, image, category});
    await manga.save();
    res.status(201).json(manga);
  } catch (error) {
    console.error('Lỗi khi tạo truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo truyện' });
  }
});

app.put('/mangas/:_id', upload.single('image'), async (req, res) => {
  try {
    const mangaId = req.params._id;
    const { manganame, author, content, category } = req.body;
    const image = req.file.originalname; // Đường dẫn tới ảnh, sử dụng Multer để upload ảnh

    const manga = await Manga.findByIdAndUpdate(mangaId, {
      manganame, author, content, image, category
    }, { new: true }); // Trả về bản ghi mới sau khi cập nhật

    if (!manga) {
      return res.status(404).json({ message: 'Không tìm thấy truyện.' });
    }

    res.json(manga);
  } catch (error) {
    console.error('Lỗi khi cập nhật truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật truyện' });
  }
});

//api get, post chapter
app.post('/chapters', upload.array('image',30), async (req, res) => {
  try {
    const { mangaName, number, viporfree } = req.body;
    const images = req.files.map((file) => file.originalname);

    const manga = await Manga.findOne({manganame:mangaName});
    if (!manga) {
      return res.status(404).json({ message: 'Không tìm thấy truyện liên quan đến chương này.' });
    }

    const chapter = new Chapter({ mangaName, number, viporfree, images });
    await chapter.save();
   
    manga.chapters.push(chapter._id);
    await manga.save();

    res.status(201).json(chapter);
  } catch (error) {
    console.error('Lỗi khi tạo chương:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo chương' });
  }
});

app.put('/chapterput/:_id', upload.array('image'), async (req, res) => {
  try {
    const chapterId = req.params._id;
    const { mangaName, number, viporfree } = req.body;
    const images = req.files.map((file) => file.originalname);

    const chapter = await Chapter.findByIdAndUpdate(chapterId, {
      mangaName, number, viporfree, images
    }, { new: true }); // Trả về bản ghi mới sau khi cập nhật

    if (!chapter) {
      return res.status(404).json({ message: 'Không tìm thấy chương' });
    }
    const manga = await Manga.findOne({ chapters: chapterId });
    if (manga) {
      manga.chapters = manga.chapters.filter((id) => id.toString() !== chapterId);
      await manga.save();
    }
    res.json({ message: 'update thành công' });
  } catch (error) {
    console.error('Lỗi khi cập nhật chương:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật chương' });
  }
});

app.delete('/chapterdelete/:_id', async (req, res) => {
  try {
    const chapterId = req.params._id;

    // Xóa chương từ cơ sở dữ liệu
    const deletedChapter = await Chapter.findByIdAndRemove(chapterId);

    if (!deletedChapter) {
      return res.status(404).json({ message: 'Chương không tồn tại.' });
    }

    // Cập nhật danh sách chương của manga
    const manga = await Manga.findOne({ chapters: chapterId });
    if (manga) {
      manga.chapters = manga.chapters.filter((id) => id.toString() !== chapterId);
      await manga.save();
    }

    res.json({ message: 'Chương đã được xóa thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa chương:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa chương.' });
  }
});

//api thanh toán
paypal.configure({
  mode:'sandbox',
  client_id:'AUlNtwJMp7vBw_QhtxWma9R6hexiSDH3xQ7_o_AjV0gw5XTM9HyR0rRNGHUpjtJKRpF4S19P9VSDfWpN',
  client_secret:'EIfHAcScipust8EIlkT0ZMe9Ujag6KRz864VT2NTeQkOaCH1kED73c_GYeNyIoEj__w8PbuTJKKIp6Rz'
});

app.post('/pay',async(req,res)=>{
  const{totalAmount,currency}=req.body
  const createPaymentJson={
    intent:'sale',
    payer:{
      payment_method:'paypal'
    },
    transactions:[
      {
        amount:{
          total:totalAmount,
          currency:currency
        }
      }
    ],
    redirect_urls:{
      return_url: 'http://localhost:8080/success', 
      cancel_url: 'http://localhost:8080/cancel', 
    }
  };
  paypal.payment.create(createPaymentJson,(error,payment)=>{
    if(error){
      throw error;
    }
    else{
      for (let i=0 ;i<payment.links.length  ;i++ ){
        if(payment.links[i].rel=== 'approval_url'){
          res.redirect(payment.links[i].href);
        }
      }
    }
  });
});

app.get('/success', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const executePaymentJson = {
    payer_id: payerId,
  };

  paypal.payment.execute(paymentId, executePaymentJson, (error, payment) => {
    if (error) {
      console.error(error.response);
      throw error;
    } else {
      res.send('Thanh toán thành công!');
    }
  });
});

app.get('/cancel', (req, res) => {
  res.send('Thanh toán đã bị hủy.');
});

//api đăng kí
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

  //api đăng nhập
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