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
const{allowInsecurePrototypeAccess}=require('@handlebars/allow-prototype-access');
const Handelbars=require('handlebars');
const hbs=require('express-handlebars');
const sharp=require('sharp');
const methodOverride = require('method-override');

var app=express();

app.engine(".hbs",hbs.engine({
  extname:"hbs",
  defaultLayout:false,
  layoutsDir:"views/layouts/",
  handlebars:allowInsecurePrototypeAccess(Handelbars)
}));

app.set("view engine",".hbs");
app.set("views","./views");
app.use(methodOverride('_method'));
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });


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
app.get("/add", async (req, res) => {
  res.render("add");
});

app.get('/mangass', async (req, res) => {
  try {
    const manga = await Manga.find();
    res.render("home", { manga });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách truyện' });
  }
});
app.get('/getmanga', async (req, res) => {
  try {
    const manga = await Manga.find();
    res.json(manga);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách truyện' });
  }
});

app.get('/mangas/:mangaId/chapters', async (req, res) => {
  try {
    const mangaName = req.params.mangaId;

    // Thực hiện truy vấn cơ sở dữ liệu để lấy danh sách các chương của manga với tên tương ứng.
    const chapters = await Chapter.find({ mangaName: { $regex: mangaName, $options: 'i' } });

    if (!chapters || chapters.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy danh sách chương cho manga này.' });
    }

    res.json(chapters);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách chương:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách chương.' });
  }
});

app.post('/mangas', upload.single('image'), async (req, res) => {
  try {
    const { manganame, author, content, category, view, like } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;
    const categoryObject = await Category.findOne({ categoryname: category })

    if (!categoryObject) {
      return res.status(404).json({ message: 'thể loại không tồn tại.' });
    }

    const manga = new Manga({ manganame, author, content,category, view, like});
    if (imageBuffer) {
      manga.image = imageBuffer.toString('base64');
    }
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
    const { manganame, author, content, category, view,like } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null; 

    const manga = await Manga.findByIdAndUpdate(mangaId, {
      manganame, author, content, category, view, like
    }, { new: true }); 
    if (imageBuffer) {
      manga.image = imageBuffer.toString('base64');
    }

    if (!manga) {
      return res.status(404).json({ message: 'Không tìm thấy truyện.' });
    }
    await Chapter.updateMany({ mangaName: manga.manganame }, { $set: { mangaName: manga.manganame } });

    res.json(manga);
  } catch (error) {
    console.error('Lỗi khi cập nhật truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật truyện' });
  }
});

//api get, post chapter
app.get("/addchap", async (req, res) => {
  res.render("addchap");
});
app.get("/getchap", async (req, res) => {
  const data = await Chapter.find().lean();
  res.render("chapter", { data });
});
app.get('/viporfrees', async (req, res) => {
  try {
    // Sử dụng mongoose để lấy danh sách các giá trị enum
    const enumValues = await Chapter.schema.path('viporfree').enumValues;
    res.json(enumValues);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách giá trị enum:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách giá trị enum' });
  }
});

app.post('/chapters', upload.array('image',30), async (req, res) => {
  try {
    const { mangaName, number, viporfree } = req.body;
    const images = req.files.map((file) => file.buffer.toString('base64'));

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
    const images = req.files.map((file) => file.buffer.toString('base64'));

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

app.post('/chapterdelete/:_id', async (req, res) => {
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
          res.status(500).json(payment.links[i].href);
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


app.post('/register', async (req, res) => {
    try {
      const { username, password, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user = new User({ username, password: hashedPassword, role });
      await user.save();
      
      const responseData = {
        success: user.success,
        data: {
          user: [
            {
              _id: user._id,
              username: user.username,
              password: user.password,
              role: user.role,
              __v: user.__v,
            },
          ],
        },
      };
  
  
      res.status(201).json(responseData);
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
      const responseData = {
        success: user.success,
        data: {
          user: [
            {
              _id: user._id,
              username: user.username,
              password: user.password,
              role: user.role,
              __v: user.__v,
            },
          ],
        },
      };
  
      const token = jwt.sign({ userId: user._id, role: user.role }, 'mysecretkey');
      responseData.token = token;
      res.status(200).json(responseData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Đã xảy ra lỗi.' });
    }
  });

app.listen(8080,()=>
console.log("Server is running on port 8080...")
);