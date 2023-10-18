const express = require('express');
const mongoose = require('mongoose');
const User=require('./models/UserModel')
const bodyParser = require('body-parser');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const paypal=require('paypal-rest-sdk');
const Category=require('./models/CategoryModel')
const multer=require('multer')
const Manga=require('./models/MangaModel')
const Chapter=require('./models/ChapterModel')
const Payment=require('./models/PaymentModel')
const{allowInsecurePrototypeAccess}=require('@handlebars/allow-prototype-access');
const Handelbars=require('handlebars');
const hbs=require('express-handlebars');
const methodOverride = require('method-override');
const path=require('path')
const myId = new mongoose.Types.ObjectId();

var app=express();

app.engine(".hbs",hbs.engine({
  extname:"hbs",
  defaultLayout:false,
  layoutsDir:"views/layouts/",
  handlebars:allowInsecurePrototypeAccess(Handelbars)
}));

app.set("view engine",".hbs");
app.set("views", path.join(__dirname, "views"));
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


app.post('/categoryput/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { categoryname } = req.body;

    const category = await Category.findByIdAndUpdate(
      categoryId,
      { categoryname },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại.' });
    }

    res.json(category);
  } catch (error) {
    console.error('Lỗi khi cập nhật thể loại:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật thể loại.' });
  }
});

app.post('/categorydelete/:_id', async (req, res) => {
  try {
    const categoryId = req.params._id;

   
    const deletedCategory = await Category.findByIdAndRemove(categoryId);

    if (!deletedCategory) {
      return res.status(404).json({ message: 'thể loại không tồn tại.' });
    }
    res.json({ message: 'thể loại đã được xóa thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa thể loại:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa thể loại.' });
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

app.get('/mangas', async (req, res) => {
  try {
    const mangaList = await Manga.find().select('manganame image category chapters').populate('chapters', 'number').exec();
    const formattedMangaList = mangaList.map(manga => ({
      id: manga._id,
      manganame: manga.manganame,
      image: manga.image,
      category:manga.category,
      totalChapters: manga.chapters.length
    }));
    res.json(formattedMangaList);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách truyện' });
  }
});

app.post('/mangapost', upload.single('image'), async (req, res) => {
  try {
    const { manganame, author, content, category, view, like } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;
    const categoryObject = await Category.findOne({ categoryname: category });

    if (!categoryObject) {
      return res.status(404).json({ message: 'Thể loại không tồn tại.' });
    }

    const manga = new Manga({ manganame, author, content, category, view, like });
    if (imageBuffer) {
      manga.image = imageBuffer.toString('base64');
    }
    await manga.save();

    categoryObject.manga.push(manga._id);
    await categoryObject.save();

    res.status(201).json(manga);
  } catch (error) {
    console.error('Lỗi khi tạo truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo truyện' });
  }
});

app.post('/mangaput/:_id', upload.single('image'), async (req, res) => {
  try {
    const mangaId = req.params._id;
    const { manganame, author, content, category, view, like } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null; 

    const manga = await Manga.findById(mangaId);

    if (!manga) {
      return res.status(404).json({ message: 'Không tìm thấy truyện.' });
    }

    if (manga.category !== category) {
      const oldCategory = await Category.findOne({ categoryname: manga.category });
      if (oldCategory) {
        oldCategory.manga = oldCategory.manga.filter((id) => id.toString() !== mangaId);
        await oldCategory.save();
      }

      const newCategory = await Category.findOne({ categoryname: category });
      if (newCategory) {
        newCategory.manga.push(mangaId);
        await newCategory.save();
      }
    }

    manga.manganame = manganame;
    manga.author = author;
    manga.content = content;
    manga.category = category;
    manga.view = view;
    manga.like = like;

    if (imageBuffer) {
      manga.image = imageBuffer.toString('base64');
    }

    await manga.save();

    res.json(manga);
  } catch (error) {
    console.error('Lỗi khi cập nhật truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật truyện' });
  }
});
app.post('/mangadelete/:_id', async (req, res) => {
  try {
    const mangaId = req.params._id;

   
    const deletedManga = await Manga.findByIdAndRemove(mangaId);

    if (!deletedManga) {
      return res.status(404).json({ message: 'truyện không tồn tại.' });
    }

   
    const category = await Category.findOne({ manga: mangaId });
    if (category) {
      category.manga = category.manga.filter((id) => id.toString() !== mangaId);
      await category.save();
    }

    res.json({ message: 'truyện đã được xóa thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa truyện:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa truyện.' });
  }
});

app.get('/mangachitiet/:mangaId', async (req, res) => {
  try {
    const mangaId = req.params.mangaId;
    const manga = await Manga.findById(mangaId).populate('chapters', 'number viporfree');

    if (!manga) {
      return res.status(404).json({ message: 'Không tìm thấy truyện.' });
    }

    const { manganame, author, content, image, category, view, like, chapters } = manga;

    const response = {
      manganame: manganame,
      author: author,
      content: content,
      image: image,
      category: category,
      view: view,
      like: like,
      totalChapters: chapters.length,
      chapters: chapters.map(chapter => ({
        idchap: chapter._id,
        namechap: chapter.number,
        viporfree:chapter.viporfree
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy chi tiết truyện.' });
  }
});

app.get('/mangas/category/:categoryName', async (req, res) => {
  try {
    const categoryName = req.params.categoryName;
    const category = await Category.findOne({ categoryname: categoryName });

    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại.' });
    }

    const mangaList = await Manga.find({ category: categoryName });

    if (mangaList.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy truyện trong thể loại này.' });
    }

    const formattedMangaList = mangaList.map(manga => ({
      id: manga._id,
      manganame: manga.manganame,
      image: manga.image,
      category: manga.category,
      totalChapters: manga.chapters.length
    }));

    res.json(formattedMangaList);
  } catch (error) {
    console.error('Lỗi khi lấy truyện theo thể loại:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy truyện theo thể loại.' });
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

app.get('/chap', async (req, res) => {
  try {
    const chap = await Chapter.find();
    res.status(201).json(chap);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách truyện' });
  }
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

app.get("/chapterput/:_id",upload.array('image'), async (req, res) => {
  const id = req.params._id;
  Chapter.findById(id)
    .then(data => {
      res.render("editchap", { data });
    })
    .catch(error => {
      console.error(error);
      res.status(500).send("Internal server error");
    });
});

app.post('/chapterput/:_id', upload.array('image'), async (req, res) => {
  try {
    const chapterId = req.params._id;
    const { mangaName, number, viporfree } = req.body;
    const images = req.files.map((file) => file.buffer.toString('base64'));

    const chapter = await Chapter.findByIdAndUpdate(chapterId, {
      mangaName, number, viporfree, images
    }, { new: true });

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

   
    const deletedChapter = await Chapter.findByIdAndRemove(chapterId);

    if (!deletedChapter) {
      return res.status(404).json({ message: 'Chương không tồn tại.' });
    }

   
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

app.get('/mangas/:manganame/chapters', async (req, res) => {
  try {
    const mangaName = req.params.manganame; 
    const chapters = await Chapter.find({ mangaName: { $regex: mangaName, $options: 'i' } }).select('number viporfree -_id');

    if (!chapters || chapters.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy danh sách chương cho manga này.' });
    }

    res.json(chapters);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách chương:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách chương.' });
  }
});

app.get('/chapter/:_id/images', async (req, res) => {
  try {
    const chapterid = req.params._id;
    
    const chapter = await Chapter.findById(chapterid);

    if (!chapter) {
      return res.status(404).json({ message: 'Không tìm thấy chap.' });
    }

    // Trả về danh sách ảnh của chương
    res.json(chapter.images);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ảnh chap:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách ảnh chap.' });
  }
});

app.post('/search', async(req, res)=> {
  const { mangaName } = req.body;
  const data = await Chapter.find({ mangaName });
  res.render('chapter', { data });
  });

//api thanh toán
paypal.configure({
  mode:'sandbox',
  client_id:'AUlNtwJMp7vBw_QhtxWma9R6hexiSDH3xQ7_o_AjV0gw5XTM9HyR0rRNGHUpjtJKRpF4S19P9VSDfWpN',
  client_secret:'EIfHAcScipust8EIlkT0ZMe9Ujag6KRz864VT2NTeQkOaCH1kED73c_GYeNyIoEj__w8PbuTJKKIp6Rz'
});

app.post('/pay/:_userId',async(req,res)=>{
  const{totalAmount,currency}=req.body
  const userId=req.params._userId
  let coin=totalAmount*10
  const success="đợi thanh toán"
  const paymentData = new Payment({
    userID:userId,
    currency:currency,
    totalAmount:totalAmount,
    coin:coin,
    date: new Date(),
    success:success
  });
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
      return_url: `http://du-an-2023.vercel.app/success/${paymentData._id}`, 
      cancel_url: `http://du-an-2023.vercel.app/cancel`, 
    }
  };
  const user= await User.findById(userId)
 
  paypal.payment.create(createPaymentJson, async(error,payment)=>{
    if(error){
      throw error;
    }
    else{
      for (let i=0 ;i<payment.links.length  ;i++ ){
        if(!user){
          res.status(500).json("không tìm thấy người dùng")
        }
        else{
          
          if(payment.links[i].rel=== 'approval_url'){
            await paymentData.save();
            res.status(500).json(payment.links[i].href);
          }
        }  
      }
    }
  });
  // req.connection.on('close', async () => {
  //   await Payment.findOneAndDelete({ _id: paymentData._id }); // Xóa paymentData khi trang bị tắt
  // });
});

app.get('/success/:id', async(req, res) => {
  try{

    const payerId = req.query.PayerID
    const paymentId = req.query.paymentId
    const id=req.params.id
    let success="thanh toán thành công"
    
  
    const executePaymentJson = {
      payer_id: payerId,
    };
  
    paypal.payment.execute(paymentId, executePaymentJson, async(error, payment) => {
      if (error) {
        console.error(error.response);
        throw error;
      } else { 
        res.send('Thanh toán thành công!');
        const updatePayment = await Payment.findOneAndUpdate({ _id: id}, { success:success },{new:true});
        if (!updatePayment) {
          res.status(404).json({ message: 'Không tìm thấy thanh toán.' });
        }  
      }
    });
  }
    catch(error){
      console.error('Lỗi khi xử lý thanh toán:', error);
      res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý thanh toán.' });
    }
  
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

  app.post('/userdelete/:_id', async (req, res) => {
    try {
      const userId = req.params._id;
  
     
      const deletedUser = await User.findByIdAndRemove(userId);
  
      if (!deletedUser) {
        return res.status(404).json({ message: 'user không tồn tại.' });
      }
      res.json({ message: 'user đã được xóa thành công.' });
    } catch (error) {
      console.error('Lỗi khi xóa user:', error);
      res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa user.' });
    }
  });

  app.post('/userput/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const { username,password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user= await User.findByIdAndUpdate(
        userId,
        { username,
          password:hashedPassword },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy user.' });
      }
  
      res.json(user);
    } catch (error) {
      console.error('Lỗi khi cập nhật user:', error);
      res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật user.' });
    }
  });

app.listen(8080,()=>
console.log("Server is running on port 8080...")
);