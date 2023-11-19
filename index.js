const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/UserModel')
const bodyParser = require('body-parser');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const paypal = require('paypal-rest-sdk');
const cheerio = require('cheerio');
const moment = require('moment');
const momenttimezone = require('moment-timezone');
const session = require('express-session');
const Category = require('./models/CategoryModel')
const multer = require('multer')
const Manga = require('./models/MangaModel')
const Chapter = require('./models/ChapterModel')
const Payment = require('./models/PaymentModel')
const Baiviet = require('./models/BaiVietModel')
const Notification = require('./models/NotifyModel')
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const Handelbars = require('handlebars');
const hbs = require('express-handlebars');
const methodOverride = require('method-override');
const path = require('path')
const myId = new mongoose.Types.ObjectId();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');



var app = express();

app.engine(".hbs", hbs.engine({
  extname: "hbs",
  defaultLayout: false,
  layoutsDir: "views/layouts/",
  handlebars: allowInsecurePrototypeAccess(Handelbars)
}));

app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "views"));
app.use(methodOverride('_method'));
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });


const uri = "mongodb+srv://totnghiepduan2023:MaNXmiIny7im1yjG@cluster0.tzx1qqh.mongodb.net/DuanTotNghiep?retryWrites=true&w=majority";
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(console.log("kết nối thành công"));
const mongoStoreOptions = {
  mongooseConnection: mongoose.connection,
  mongoUrl: uri,
  collection: 'sessions', // Tên collection lưu trữ session trong MongoDB
};


app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'mysecretkey',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create(mongoStoreOptions),
  cookie: { 
    secure: false,
   }
}));
app.use(cors());

const checkAuth = (req, res, next) => {
  if (!req.session.token) {
    return res.redirect('/loginadmin');
  }
  try {
    const decoded = jwt.verify(req.session.token, 'mysecretkey', { expiresIn: '1h' });
    req.userData = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // Token đã hết hạn, thực hiện các hành động phù hợp ở đây
      // Ví dụ: đăng nhập lại hoặc chuyển hướng đến trang đăng nhập
      req.session.destroy(); // Xóa phiên làm việc
      return res.redirect('/loginadmin');
    } else {
      console.error(error);
      return res.status(500).json({ message: 'Đã xảy ra lỗi.' });
    }
  }
};

app.get("/admin", checkAuth, async (req, res) => {
  console.log("Session:", req.session);
  res.render("admin");
});
app.get("/logout", async (req, res) => {
  res.redirect('/loginadmin');
});

app.get('/nhomdich', checkAuth, async (req, res) => {
  console.log("Session:", req.session);
  res.render("nhomdich", { userId: req.session.userId })
})

//api get, post bài viết 
app.post('/postbaiviet/:userId', async (req, res) => {
  try {
    const userId = req.params.userId
    const { content } = req.body
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'không tìm thấy user' })
    }
    const vietnamTime = momenttimezone().add(7, 'hours').toDate();
    const baiviet = new Baiviet({ userId, content, like: 0, date: vietnamTime })
    await baiviet.save()
    user.baiviet.push(baiviet._id)
    await user.save()
    return res.status(200).json({ message: 'post bài viết thành công' })

  } catch (err) {
    console.error('Lỗi khi đăng bài viết:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi đăng bài viết.' });
  }

})
app.post('/post/:userId', upload.array('images', 3), async (req, res) => {
  try {
    const userId = req.params.userId;
    const { content } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }

    if (user.role === 'user') {
      return res.status(403).json({ message: 'Bạn không có quyền đăng bài viết' });
    }

    const images = [];

    // Lặp qua mảng các tệp đã tải lên và lưu chúng vào mảng images
    const currentDate = moment().utc();

    for (const file of req.files) {
      // Thêm đường dẫn tạm thời (buffer) của ảnh vào mảng images
      images.push(file.buffer);
    }

    const baiviet = new Baiviet({ userId, content, like: 0, images,date: currentDate });
    await baiviet.save();
    user.baiviet.push(baiviet._id);
    await user.save();

    return res.status(200).json({ message: 'Đăng bài viết thành công' });
  } catch (err) {
    console.error('Lỗi khi đăng bài viết:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi đăng bài viết.' });
  }
});

app.get('/getbaiviet/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    const baiviet = await Baiviet.find({}).sort({ date:-1 }).populate("userId", "username")
    const formattedBaiviet = await Promise.all(baiviet.map(async (item) => {
      const isLiked = user.favoriteBaiviet.some(favorite => favorite.baivietId.toString() === item._id.toString());
      const formattedDate = moment(item.date).format('DD/MM/YYYY HH:mm:ss');
      const comments = await Promise.all(item.comment.map(async (commentItem) => {
        const usercmt = await User.findById(commentItem.userID);
        return {
          _id:commentItem._id,
          userId: commentItem.userID._id,
          cmt: commentItem.cmt,
          username: usercmt.username, 
        };
      }));
      return {
        _id: item._id,
        userId: item.userId._id,
        username: item.userId.username,
        content: item.content,
        like: item.like,
        isLiked: isLiked,
        date: formattedDate,
        comment: comments,
        commentCount: item.comment.length
      };
    }));
    res.json(formattedBaiviet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy thông tin bài viết' });
  }
})

app.get('/getbaiviet', async (req, res) => {
  try {
    const baiviet = await Baiviet.find({}).sort({date:-1}).populate("userId", "username")
    const formattedBaiviet = await Promise.all(baiviet.map(async (item) => {
      const formattedDate = moment(item.date).format('DD/MM/YYYY HH:mm:ss');
      const comments = await Promise.all(item.comment.map(async (commentItem) => {
        const usercmt = await User.findById(commentItem.userID);
        return {
          _id:commentItem._id,
          userId: commentItem.userID._id,
          cmt: commentItem.cmt,
          username: usercmt.username, // Nếu bạn muốn lấy username từ usercmt
          // Thêm thông tin khác của usercmt nếu cần
        };
      }));
      return {
        _id: item._id,
        userId: item.userId._id,
        username: item.userId.username,
        content: item.content,
        like: item.like,
        isLiked: item.isLiked,
        date: formattedDate,
        comment: comments,
        commentCount: item.comment.length
      };
    }));
    res.json(formattedBaiviet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy thông tin bài viết' });
  }
})


app.post('/addfavoritebaiviet/:userId/:baivietId', async(req,res)=>{
  try{
    const userId=req.params.userId;
    const baivietId=req.params.baivietId;
    const user=await User.findById(userId)
    if(!user){
      res.status(403).json({message:'không tìm thấy user'})
    }
    const baivietIndex = user.favoriteBaiviet.findIndex(baiviet => baiviet._id === baivietId);

    if (baivietIndex === -1) {
      user.favoriteBaiviet.push({ baivietId, isLiked: true });
    } else {
      user.favoriteBaiviet[baivietIndex].isLiked = true;
    }

    const baiviet = await Baiviet.findById(baivietId);
    if (baiviet) {
      baiviet.like += 1;
      await baiviet.save();
    }
    await user.save();

    res.json({ message: 'bài viết đã được thêm vào danh sách yêu thích.' });
  }catch(err){
    console.error('Lỗi khi yêu thích bài viết:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi yêu thích bài viết.' });
  }
})

app.post('/deletebaiviet/:baivietid/:userId', async (req, res) => {
  try {
    const baivietid = req.params.baivietid
    const userId = req.params.userId
    const baiviet = await Baiviet.findByIdAndDelete(baivietid)
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json("không tìm thấy user")
    }
    const baivietIndex = user.baiviet.indexOf(baivietid);
    if (baivietIndex !== -1) {
      user.baiviet.splice(baivietIndex, 1);
      await user.save();
    }
    return res.status(200).json({ message: 'xóa bài viết thành công' })
  } catch (err) {
    console.error('lỗi xóa bài viết', err)
    res.status(500).json({ error: "lỗi xóa bài viết" })
  }
})

app.post('/postcmtbaiviet/:baivietId/:userId', async(req,res)=>{
  try {
    const baivietId=req.params.baivietId;
    const userId=req.params.userId;
    const { comment } = req.body;
    const user= await User.findById(userId)
    if(!user){
      res.status(403).json({message:'không tìm thấy user'})
    }
    const baiviet=await Baiviet.findById(baivietId);
    if(!baiviet){
      res.status(404).json({message:'không tìm thấy bài viết'})
    }
    const newComment = {
      userID: userId,
      cmt: comment
    };
    baiviet.comment.push(newComment)
    await baiviet.save()
    res.status(200).json({ message: 'Đã thêm bình luận thành công' });
  } catch (error) {
    console.error('Lỗi khi post bình luận:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi post bình luận.' });
  }
})
app.post('/deletecmtbaiviet/:commentId/:baivietId/:userId', async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const baivietId = req.params.baivietId;
    const userId = req.params.userId

    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ message: 'không tìm thấy user' })
    }

    const baiviet = await Baiviet.findById(baivietId)
    if (!baiviet) {
      res.status(404).json({ message: 'không tìm thấy bài viết này' });
    }

    const commentToDelete = baiviet.comment.find((cmt) => cmt._id == commentId && cmt.userID == userId);

    if (!commentToDelete) {
      res.status(403).json({ message: 'Bạn không có quyền xóa comment này' });
      return;
    }
    const commentIndex = baiviet.comment.findIndex(cmt => cmt._id == commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy comment với ID cung cấp' });
    }

    baiviet.comment.splice(commentIndex, 1); // Xóa comment từ mảng

    // Lưu lại thay đổi vào cơ sở dữ liệu
    await baiviet.save();


    res.status(200).json({ message: 'Xóa comment thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa comment:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa comment.' });
  }
});
//api get, post category
app.get('/categorys', async (req, res) => {
  try {
    const categories = await Category.find().populate('manga');
    const result = categories.map(category => {
      return {
        categoryid: category._id,
        categoryname: category.categoryname,
        manga: category.manga.map(manga => {
          return {
            id: manga._id,
            manganame: manga.manganame,
            image: manga.image,
            category: category.categoryname,
            totalChapters: manga.chapters.length
          };
        })
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thể loại:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách thể loại' });
  }
});

app.get('/categoryscreen', async (req, res) => {
  try {
    const category = await Category.find();
    res.render("category", { category });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thể loại:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách thể loại' });
  }
});

app.post('/category', async (req, res) => {
  try {
    const { categoryname } = req.body;
    const category = new Category({ categoryname });
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
  res.render("add", { userId: req.session.userId });
});

app.get('/mangass', async (req, res) => {
  try {
    const manga = await Manga.find({ isRead: true });
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
    const mangaList = await Manga.find({ isRead: true }).select('manganame image category chapters').populate('chapters', 'number').exec();
    const formattedMangaList = mangaList.map(manga => ({
      id: manga._id,
      manganame: manga.manganame,
      image: manga.image,
      category: manga.category,
      totalChapters: manga.chapters.length
    }));
    res.json(formattedMangaList);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách truyện' });
  }
});

app.post('/mangapost/:userId', async (req, res) => {
  try {
    const userId = req.params.userId
    const { manganame, author, content, category, view, like, image } = req.body;
    const categoryObject = await Category.findOne({ categoryname: category });
    const user = await User.findById(userId)
    if (!user) {
      return res.status(403).json({ message: 'user không tồn tại' })
    }

    if (!categoryObject) {
      return res.status(404).json({ message: 'Thể loại không tồn tại.' });
    }
    const manga = new Manga({ userID: userId, manganame, author, content, category, view, like, image });

    if (user.role === 'nhomdich') {
      const notification = new Notification({
        adminId: '653a20c611295a22062661f9',
        title: 'Truyện cần duyệt',
        content: `Truyện ${manganame} cần được duyệt.`,
        userId: userId,
        mangaId: manga._id
      });


      await notification.save();

      manga.isRead = false;
    }
    else {
      manga.isRead = true
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

app.get('/rendernotifi', async (req, res) => {
  const notification = await Notification.find({ title: { $regex: /Truyện cần duyệt|Chap cần duyệt/ } });
  res.render('notification', { notification });
});
app.get('/rendernotifinhomdich', async (req, res) => {
  try {
    const notifications = await Notification.find({ title: 'được phê duyệt' });
    res.json(notifications);
  } catch (error) {
    console.error('Lỗi khi lấy thông báo:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thông báo' });
  }
});
app.post('/delete-selected-notifications', async (req, res) => {
  try {
      const selectedIds = req.body.ids;
      if (!selectedIds || !Array.isArray(selectedIds)) {
          return res.status(400).json({ error: 'Danh sách ID không hợp lệ.' });
      }

      // Xóa các thông báo có ID trong danh sách đã chọn
      await Notification.deleteMany({ _id: { $in: selectedIds } });

      res.render("nhomdich")
  } catch (error) {
      console.error('Lỗi khi xóa thông báo:', error);
      res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa thông báo.' });
  }
});

app.post('/approveManga/:mangaId', async (req, res) => {
  try {
    const mangaId = req.params.mangaId;

    // Tìm truyện dựa trên ID
    const manga = await Manga.findById(mangaId);

    if (!manga) {
      return res.status(404).send('Không tìm thấy truyện');
    }

    // Kiểm tra xem truyện đã được duyệt chưa, nếu chưa thì cập nhật trạng thái và lưu truyện
    if (!manga.isRead) {
      manga.isRead = true;
      await manga.save();
      await Notification.deleteOne({ mangaId: mangaId });

      const newNotification = new Notification({
        adminId: req.session.userId, // Thay đổi đây thành adminId tương ứng
        title: 'được phê duyệt',
        content: `Truyện ${manga.manganame} của bạn đã được duyệt và đăng thành công, giờ đây bạn có thể đăng chap của truyện.`,
        userId: manga.userID, // Thay đổi đây thành userId tương ứng với nhóm dịch
        mangaId: mangaId
      });


      await newNotification.save();
      return res.status(202).send({ message: 'Duyệt thành công' })
    } else {
      return res.status(200).send('Truyện đã được duyệt trước đó');
    }
  } catch (error) {
    console.error('Lỗi khi duyệt truyện:', error);
    res.status(500).send('Đã xảy ra lỗi khi duyệt truyện');
  }
});

app.get('/unread-count', async (req, res) => {
  try {
    // Đếm số lượng thông báo chưa đọc
    const unreadCount = await Notification.countDocuments({ title: { $regex: /Truyện cần duyệt|Chap cần duyệt/ } });

    res.json({ unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/unread-count-nhomdich', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Đếm số lượng thông báo chưa đọc
    const unreadCount = await Notification.countDocuments({ title: 'được phê duyệt' });

    res.json({ unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/manganotifi/:mangaId', async (req, res) => {
  try {
    const mangaId = req.params.mangaId;

    const notification = await Notification.findOne({ mangaId });

    if (!notification) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo cho truyện này.' });
    }
    const mangaDetail = await Manga.findById(mangaId);

    if (!mangaDetail) {
      return res.status(404).json({ error: 'Không tìm thấy truyện chi tiết.' });
    }

    res.json({
      title:notification.title,
      image: mangaDetail.image,
      content: mangaDetail.content,
      author: mangaDetail.author,
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy chi tiết truyện.' });
  }
});

app.get("/mangaput/:_id", async (req, res) => {
  const id = req.params._id;
  Manga.findById(id)
    .then(manga => {
      res.render("editmanga", { manga });
    })
    .catch(error => {
      console.error(error);
      res.status(500).send("Internal server error");
    });
});

app.post('/mangaput/:_id', async (req, res) => {
  try {
    const mangaId = req.params._id;
    const { manganame, author, content, category, view, like, image } = req.body;

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
    manga.image = image;

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


app.get('/mangachitiet/:mangaId/:userId', async (req, res) => {
  try {
    const mangaId = req.params.mangaId;
    const userId = req.params.userId;
    const manga = await Manga.findById(mangaId).populate('chapters', 'number viporfree price');

    if (!manga) {
      return res.status(404).json({ message: 'Không tìm thấy truyện.' });
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const { manganame, author, content, image, category, view, like, chapters, comment } = manga;

    const chapterSet = new Set(); // Sử dụng Set để lưu tránh chapter bị lặp
    const uniqueChapters = [];

    manga.chapters.forEach(chapter => {
      if (!chapterSet.has(chapter._id)) {
        chapterSet.add(chapter._id);
        uniqueChapters.push(chapter);
        let viporfree = chapter.viporfree;
        let price = chapter.price;
        user.purchasedChapters.forEach(purchased => {
          if (purchased.chapterId.toString() === chapter._id.toString()) {
            viporfree = "free"
            price = 0
          }
        });
        chapter.viporfree = viporfree
        chapter.price = price
      }
    });

    let isLiked = false;
    user.favoriteManga.forEach(favorite => {
      if (favorite.mangaId.toString() === mangaId) {
        isLiked = favorite.isLiked;

      }
    });

    const allComments = [];
    for (const com of comment) {
      const userComment = await User.findById(com.userID);
      const username = userComment.username;
      const commentInfo = {
        cmt_id: com._id,
        userID: com.userID,
        username: username,
        cmt: com.cmt
      };
      allComments.push(commentInfo);
    }

    const response = {
      mangaID: mangaId,
      manganame: manganame,
      author: author,
      content: content,
      image: image,
      category: category,
      view: view,
      like: like,
      totalChapters: uniqueChapters.length,
      chapters: uniqueChapters.map(chapter => ({
        idchap: chapter._id,
        namechap: chapter.number,
        viporfree: chapter.viporfree,
        price: chapter.price
      })),
      isLiked: isLiked,
      comments: allComments,
      totalcomment: allComments.length
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

app.get('/top5manga', async (req, res) => {
  try {
    const topManga = await Manga.aggregate([
      { $sort: { view: -1 } }, // Sắp xếp theo lượt xem giảm dần
      { $limit: 5 } // Lấy 5 bản ghi đầu tiên
    ]);
    res.json(topManga);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách top 10 truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách top 10 truyện' });
  }
});

app.post('/user/addFavoriteManga/:userId/:mangaId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const mangaId = req.params.mangaId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const mangaIndex = user.favoriteManga.findIndex(manga => manga._id === mangaId);

    if (mangaIndex === -1) {
      user.favoriteManga.push({ mangaId, isLiked: true });
    } else {
      user.favoriteManga[mangaIndex].isLiked = true;
    }
    await user.save();

    res.json({ message: 'Truyện đã được thêm vào danh sách yêu thích.' });
  } catch (error) {
    console.error('Lỗi khi thêm truyện yêu thích:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi thêm truyện yêu thích.' });
  }
});

app.get('/user/favoriteManga/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId).populate({
      path: 'favoriteManga',
      populate: {
        path: 'mangaId',
        model: 'manga'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const favoriteMangaList = user.favoriteManga.map(manga => {
      return {
        id: manga.mangaId._id,
        manganame: manga.mangaId.manganame,
        image: manga.mangaId.image,
        category: manga.mangaId.category,
        totalChapters: manga.mangaId.chapters.length
      };
    });

    res.json(favoriteMangaList);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách truyện yêu thích:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách truyện yêu thích.' });
  }
});

app.post('/user/removeFavoriteManga/:userId/:mangaId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const mangaId = req.params.mangaId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    if (!user.favoriteManga.some(manga => manga.mangaId.toString() === mangaId)) {
      return res.status(400).json({ message: 'Truyện không tồn tại trong danh sách yêu thích.' });
    }

    user.favoriteManga = user.favoriteManga.filter(manga => manga.mangaId.toString() !== mangaId); // Xóa truyện yêu thích khỏi danh sách

    await user.save();

    res.json({ message: 'Truyện đã được xóa khỏi danh sách yêu thích.' });
  } catch (error) {
    console.error('Lỗi khi xóa truyện yêu thích:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa truyện yêu thích.' });
  }
});

app.post('/postcomment/:userId/:mangaId', async (req, res) => {
  try {
    const userId = req.params.userId
    const mangaId = req.params.mangaId
    const { comment } = req.body;
    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ message: 'không tìm thấy user' })
    }
    const manga = await Manga.findById(mangaId)
    if (!manga) {
      res.status(404).json({ message: 'không tìm thấy truyện' })
    }
    const newComment = {
      userID: userId,
      cmt: comment
    };
    manga.comment.push(newComment)
    await manga.save()
    res.status(200).json({ message: 'Đã thêm bình luận thành công' });
  } catch (error) {
    console.error('Lỗi khi post bình luận:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi post bình luận.' });
  }
})
app.post('/deletecomment/:commentId/:mangaID/:userId', async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const mangaId = req.params.mangaID;
    const userId = req.params.userId

    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ message: 'không tìm thấy user' })
    }

    const manga = await Manga.findById(mangaId)
    if (!manga) {
      res.status(404).json({ message: 'không tìm thấy truyện này' });
    }

    const commentToDelete = manga.comment.find((cmt) => cmt._id == commentId && cmt.userID == userId);

    if (!commentToDelete) {
      res.status(403).json({ message: 'Bạn không có quyền xóa comment này' });
      return;
    }
    const commentIndex = manga.comment.findIndex(cmt => cmt._id == commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy comment với ID cung cấp' });
    }

    manga.comment.splice(commentIndex, 1); // Xóa comment từ mảng

    // Lưu lại thay đổi vào cơ sở dữ liệu
    await manga.save();


    res.status(200).json({ message: 'Xóa comment thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa comment:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa comment.' });
  }
});
//api get, post chapter
app.get("/addchap", async (req, res) => {
  console.log("Session:", req.session);
  res.render("addchap", { userId: req.session.userId });
});

app.get("/getchap", async (req, res) => {
  const data = await Chapter.find({ isChap: true }).lean();
  console.log("Session:", req.session);
  res.render("chapter", { data, userId: req.session.userId });
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

app.post('/purchaseChapter/:userId/:chapterId', async (req, res) => {
  try {
    const { userId, chapterId } = req.params;

    // Kiểm tra người dùng và chương có tồn tại hay không
    const user = await User.findById(userId);
    const chapter = await Chapter.findById(chapterId);

    if (!user || !chapter) {
      return res.status(404).json({ message: 'Người dùng hoặc chương không tồn tại' });
    }


    const chapterPurchased = user.purchasedChapters.includes(chapterId);

    if (chapterPurchased) {
      return res.status(400).json({ message: 'Chương đã được mua trước đó' });
    }

    const chapterPrice = chapter.price;

    if (isNaN(user.coin)) {
      return res.status(500).json({ message: 'Lỗi: Giá trị coin không hợp lệ' });
    }

    if (user.coin < chapterPrice) {
      return res.status(400).json({ message: 'Không đủ coin để mua chương' });
    }


    user.coin -= chapterPrice;
    await user.save();

    const purchasedChapter = {
      chapterId: chapterId,
      isChapterFree: true
    };

    user.purchasedChapters.push(purchasedChapter);
    await user.save();

    res.status(200).json({ message: 'Mua chương thành công và cập nhật trạng thái chương' });
  } catch (error) {
    console.error('Lỗi khi mua chương:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi mua chương' });
  }
});

app.post('/chapters', async (req, res) => {
  try {
    const userId = req.session.userId
    const { mangaName, number, viporfree, images } = req.body;
    const user = await User.findById(userId)
    if (!userId || typeof userId !== 'string') {
      console.log("Session:", req.session);
      return res.status(403).json({ message: 'Không có id.' });
    }
    if (!user) {
      console.log("Session:", req.session);
      return res.status(403).json({ message: 'Không tìm thấy user.' });
    }

    const imageArray = images.split('\n')

    const manga = await Manga.findOne({ manganame: mangaName });
    if (!manga) {
      return res.status(404).json({ message: 'Không tìm thấy truyện liên quan đến chương này.' });
    }

    const chapter = new Chapter({ mangaName, number, viporfree, images: imageArray });
    if (user.role === 'nhomdich') {
      const notification = new Notification({
        adminId: '653a20c611295a22062661f9',
        title: 'Chap cần duyệt',
        content: `Chap ${number} - Truyện ${mangaName} cần được duyệt.`,
        userId: userId,
        mangaId: chapter._id
      });
      await notification.save();

      chapter.isChap = false;
    }
    else {
      chapter.isChap = true
    }
    await chapter.save();


    manga.chapters.push(chapter._id);
    await manga.save();

    res.status(201).json(chapter);
  } catch (error) {
    console.error('Lỗi khi tạo chương:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo chương' });
  }
});

app.get("/chapterput/:_id", async (req, res) => {
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

app.post('/chapterput/:_id', async (req, res) => {
  try {

    const chapterId = req.params._id;
    let { mangaName, number, viporfree, price, images } = req.body;
    const imageArray = images.split('\n')
    number = number.toString();
    const chapter = await Chapter.findByIdAndUpdate(chapterId, {
      mangaName, number, viporfree, price, images: imageArray, isChap: true
    }, { new: true });

    if (!chapter) {
      return res.status(404).json({ message: 'Không tìm thấy chương' });
    }
    const manga = await Manga.findOne({ chapters: chapterId });
    if (manga) {
      manga.chapters = manga.chapters.filter((id) => id.toString() !== chapterId);
      manga.chapters.push(chapterId);
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

    res.redirect("/admin")
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

app.get('/chapterchitiet/:_id', async (req, res) => {
  try {
    const chapterid = req.params._id;

    const chapter = await Chapter.findById(chapterid);

    if (!chapter) {
      return res.status(404).json({ message: 'Không tìm thấy chap.' });
    }
    const htmlToParse = '<html><head>...</head>' + chapter.images + '</html>';

    // Kiểm tra dữ liệu trước khi sử dụng cheerio
    console.log('Raw HTML data:', chapter.images);

    const imageLinks = [];
    const $ = cheerio.load(htmlToParse, { normalizeWhitespace: true, xmlMode: true });

    $('img').each((index, element) => {
      const src = $(element).attr('src');
      if (src) {
        imageLinks.push(src);
      } else {
        console.error('Không tìm thấy thuộc tính src trong thẻ img');
      }
    });

    res.json(imageLinks);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ảnh chap:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách ảnh chap.' });
  }
});

app.post('/approvechap/:chapid', async (req, res) => {
  try {
    const chapterId = req.params.chapid;

    // Tìm truyện dựa trên ID
    const chapter = await Chapter.findById(chapterId);

    if (!chapter) {
      return res.status(404).send('Không tìm thấy chương');
    }

    // Kiểm tra xem truyện đã được duyệt chưa, nếu chưa thì cập nhật trạng thái và lưu truyện
    if (!chapter.isChap) {
      chapter.isChap = true;
      await chapter.save();
      const notify = await Notification.findOneAndDelete({ mangaId: chapterId })
      const newNotification = new Notification({
        adminId: req.session.userId, // Thay đổi đây thành adminId tương ứng
        title: 'được phê duyệt',
        content: `Chap ${chapter.number} - truyện ${chapter.mangaName} của bạn đã được duyệt và đăng thành công`,
        userId: notify.userId, // Thay đổi đây thành userId tương ứng với nhóm dịch
        mangaId: chapterId
      });


      await newNotification.save();
      return res.status(202).send({ message: 'Duyệt thành công' })
    } else {
      return res.status(200).send('Truyện đã được duyệt trước đó');
    }
  } catch (error) {
    console.error('Lỗi khi duyệt truyện:', error);
    res.status(500).send('Đã xảy ra lỗi khi duyệt truyện');
  }
});


app.get('/chapter/:_id/:userid/images', async (req, res) => {
  try {
    const chapterid = req.params._id;
    const userid = req.params.userid

    const chapter = await Chapter.findById(chapterid);

    if (!chapter) {
      return res.status(404).json({ message: 'Không tìm thấy chap.' });
    }

    const chapters = await Chapter.find({ mangaName: chapter.mangaName }).sort({ number: 1 }).lean(); // Thêm .lean() để đảm bảo kết quả trả về là plain JavaScript objects, không phải Mongoose Documents.

    // Chuyển đổi kiểu dữ liệu của trường number sang số
    chapters.forEach(chap => chap.number = parseInt(chap.number));

    // Sắp xếp theo number
    chapters.sort((a, b) => a.number - b.number);
    const currentChapterIndex = chapters.findIndex(ch => ch._id.toString() === chapterid);
    let nextChapter = null;
    let prevChapter = null;
    const user = await User.findById(userid);

    if (currentChapterIndex < chapters.length - 1) {
      nextChapter = {
        _id: chapters[currentChapterIndex + 1]._id,
        chapname: chapters[currentChapterIndex + 1].number.toString(),
        images: chapters[currentChapterIndex + 1].images,
        viporfree: chapters[currentChapterIndex + 1].viporfree,
        price: chapters[currentChapterIndex + 1].price
      };

      // Kiểm tra xem id của nextChapter có trong mảng purchasedChapters của user hay không

      const isNextPurchased = user.purchasedChapters.some(item => item.chapterId.toString() === nextChapter._id.toString());
      if (isNextPurchased) {
        nextChapter.viporfree = "free";
        nextChapter.price = 0
      }
    }

    if (currentChapterIndex > 0) {
      prevChapter = {
        _id: chapters[currentChapterIndex - 1]._id,
        chapname: chapters[currentChapterIndex - 1].number.toString(),
        images: chapters[currentChapterIndex - 1].images,
        viporfree: chapters[currentChapterIndex - 1].viporfree,
        price: chapters[currentChapterIndex - 1].price
      };


      const isPrevPurchased = user.purchasedChapters.some(item => item.chapterId.toString() === prevChapter._id.toString());
      if (isPrevPurchased) {
        prevChapter.viporfree = "free";
        prevChapter.price = 0
      }
    }

    const isPurchased = user.purchasedChapters.some(item => item.chapterId.toString() === chapterid);
    if (isPurchased) {
      chapter.viporfree = "free";
      chapter.price = 0
    }

    const responseData = {
      _id: chapterid,
      images: chapter.images,
      chapname: chapter.number,
      viporfree: chapter.viporfree,
      price: chapter.price,
      nextchap: nextChapter,
      prevchap: prevChapter
    };

    res.json(responseData);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ảnh chap:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách ảnh chap.' });
  }
});

app.post('/search', async (req, res) => {
  const { mangaName } = req.body;
  const data = await Chapter.find({ mangaName });
  res.render('chapter', { data });
});

//api thanh toán
paypal.configure({
  mode: 'sandbox',
  client_id: 'Ab2EPlIe3lWg5riH2gsCt2CYrm4y8kI3S6oyZ7D6HGea8hVjG0YKsVItk6WcCR_rPpzpoqGLw-GsjNqh',
  client_secret: 'EKUv6YK2PjVSGGYKIHlpiRMvuMn1xhDVa8_QMmJ90REtNiFTblsVp6aqvVCDVGXQGqXcZuZqSt6SEl2f'
});

app.post('/pay/:_userId', async (req, res) => {
  try {
    const { totalAmount, currency } = req.body;
    const userId = req.params._userId;
    let coin = totalAmount * 10;
    const success = "đợi thanh toán";
    const paymentData = new Payment({
      userID: userId,
      currency: currency,
      totalAmount: totalAmount,
      coin: coin,
      date: new Date(),
      success: success
    });

    const createPaymentJson = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      transactions: [
        {
          amount: {
            total: totalAmount,
            currency: currency
          }
        }
      ],
      redirect_urls: {
        return_url: `http://du-an-2023.vercel.app/success/${paymentData._id}`,
        cancel_url: `http://du-an-2023.vercel.app/cancel`,
      }
    };

    const user = await User.findById(userId);

    paypal.payment.create(createPaymentJson, async (error, payment) => {
      if (error) {
        // Bắt lỗi và trả về response 500
        console.error('Lỗi khi tạo thanh toán:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo thanh toán.' });
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (!user) {
            // Trả về response 500 nếu không tìm thấy người dùng
            return res.status(500).json("Không tìm thấy người dùng");
          } else {
            if (payment.links[i].rel === 'approval_url') {
              await paymentData.save();
              user.payment.push(paymentData._id);
              await user.save();
              // Trả về URL để chuyển hướng đến trang thanh toán PayPal
              return res.json(payment.links[i].href);
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Lỗi khi xử lý thanh toán:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý thanh toán.' });
  }
});

app.get('/success/:id', async (req, res) => {
  try {

    const payerId = req.query.PayerID
    const paymentId = req.query.paymentId
    const id = req.params.id
    let success = "thanh toán thành công"


    const executePaymentJson = {
      payer_id: payerId,
    };

    paypal.payment.execute(paymentId, executePaymentJson, async (error, payment) => {
      if (error) {
        console.error(error.response);
        throw error;
      } else {

        const updatePayment = await Payment.findOneAndUpdate({ _id: id }, { success: success }, { new: true });

        if (!updatePayment) {
          res.status(404).json({ message: 'Không tìm thấy thanh toán.' });
        }
        const totalAmount = updatePayment.totalAmount;
        const userId = updatePayment.userID;

        const user = await User.findById(userId);
        const updatedCoin = totalAmount * 10 + (user.coin || 0);


        await User.findOneAndUpdate(
          { _id: userId },
          { coin: updatedCoin },
          { new: true }
        );

        res.status(200).json({ totalAmount, message: 'Thanh toán thành công!' });
      }
    });
  }
  catch (error) {
    console.error('Lỗi khi xử lý thanh toán:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý thanh toán.' });
  }

});

app.get('/paymentdetail/:userid', async (req, res) => {
  try {
    const userid = req.params.userid
    const user = await User.findById(userid);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    const paymentDetails = await Payment.find({ userID: userid, success: 'thanh toán thành công' });

    if (!paymentDetails || paymentDetails.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin thanh toán' });
    }

    // Phản hồi với dữ liệu theo cấu trúc mô hình
    const formattedPaymentDetails = paymentDetails.map(paymentDetail => ({
      userID: paymentDetail.userID,
      currency: paymentDetail.currency,
      totalAmount: paymentDetail.totalAmount,
      coin: paymentDetail.coin,
      date: paymentDetail.date,
      success: paymentDetail.success
    }));

    res.json(formattedPaymentDetails);

  }
  catch (error) {
    console.error('Lỗi lấy lịch sử giao dịch:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi lấy lịch sử giao dịch.' });
  }

});


app.get('/getrevenue', async (req, res) => {
  try {
    const payments = await Payment.find({ success: "thanh toán thành công" });

    res.json(payments);
  } catch (error) {
    console.error('Đã xảy ra lỗi:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi.' });
  }
});
app.get("/revenue", async (req, res) => {
  res.render("revenue");
});

app.get('/cancel', (req, res) => {
  res.send('Thanh toán đã bị hủy.');
});

app.get('/topUsers', async (req, res) => {
  try {
    const topUsers = await Payment.aggregate([
      {
        $match: { success: 'thanh toán thành công' },
      },
      {
        $group: {
          _id: '$userID',
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    const extendedTopUsers = await Promise.all(
      topUsers.map(async (user) => {
        const userInfo = await User.findById(user._id).select('username role');;

        return {
          userID: user._id,
          username: userInfo.username,
          role: userInfo.role,
          totalAmount: user.totalAmount,
          coin: user.totalAmount * 10
        };
      })
    );

    res.json(extendedTopUsers);
  } catch (error) {
    console.error('Lỗi khi lấy top người dùng:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy top người dùng' });
  }
});



//api đăng kí
app.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, password: hashedPassword, role, coin: 0 });
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
            coin: user.coin,
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
            coin: user.coin,
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

app.get("/loginadmin", async (req, res) => {
  console.log("Session:", req.session);
  res.render("login");
});
app.post('/loginadmin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.render('login', {
        UserError: 'Tên đăng nhập không đúng'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.render('login', {
        PassError: 'Mật khẩu không đúng'
      });
    }

    if (user.role === 'admin') {
      const token = jwt.sign({ userId: user._id, role: user.role }, 'mysecretkey', { expiresIn: '1h' });
      req.session.userId = user._id;
      req.session.token = token;
      return res.redirect('/admin')
    } else if (user.role === 'nhomdich') {
      const token = jwt.sign({ userId: user._id, role: user.role }, 'mysecretkey', { expiresIn: '1h' });
      req.session.userId = user._id;
      req.session.token = token;
      return res.redirect('/nhomdich')
    } else {
      return res.render('login', {
        RoleError: 'Bạn không có quyền truy cập trang web'
      });
    }
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
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        username,
        password: hashedPassword,
        role
      },
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

app.get('/userscreen', async (req, res) => {
  try {
    const users = await User.find({ $or: [{ role: 'user' }, { role: 'nhomdich' }] });
    res.render("user", { user: users });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách người dùng' });
  }
});
app.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId
    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ message: 'user không tồn tại' })
    }
    res.json({
      userId: userId,
      username: user.username,
      role: user.role,
      coin: user.coin
    })
  } catch (err) {
    console.error('Lỗi khi tìm user:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi tìm user.' });
  }
})
app.get("/doctruyen", async (req, res) => {
  try {
    const manga = await Manga.find().lean();
    res.render('doctruyen', { manga })
  } catch (err) {
    console.error("Lỗi chuyển màn", err)
  }
})
app.get('/manga/:id/chapters', async (req, res) => {
  try {
    const mangaId = req.params.id;
    const manga = await Manga.findById(mangaId).populate('chapters');

    if (!manga) {
      return res.status(404).json({ message: 'Truyện không tồn tại' });
    }

    res.render('docchap', { manga });
  } catch (err) {
    console.error('Lỗi khi lấy danh sách chương', err);
    res.status(500).json({ message: 'Đã xảy ra lỗi' });
  }
});
app.get('/chapter/:_id/images', async (req, res) => {
  try {
    const chapterid = req.params._id;

    const chapter = await Chapter.findById(chapterid);

    if (!chapter) {
      return res.status(404).json({ message: 'Không tìm thấy chap.' });
    }
    const htmlToParse = '<html><head>...</head>' + chapter.images + '</html>';

    // Kiểm tra dữ liệu trước khi sử dụng cheerio
    console.log('Raw HTML data:', chapter.images);

    const imageLinks = [];
    const $ = cheerio.load(htmlToParse, { normalizeWhitespace: true, xmlMode: true });

    $('img').each((index, element) => {
      const src = $(element).attr('src');
      if (src) {
        imageLinks.push(src);
      } else {
        console.error('Không tìm thấy thuộc tính src trong thẻ img');
      }
    });

    res.render('anhchap', { imageLinks, chapter });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ảnh chap:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách ảnh chap.' });
  }
});


app.listen(8080, () =>
  console.log("Server is running on port 8080...")
);
