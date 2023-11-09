const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/UserModel')
const bodyParser = require('body-parser');
const Category = require('./models/CategoryModel')
const Manga = require('./models/MangaModel')
const Baiviet = require('./models/BaiVietModel')
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const Handelbars = require('handlebars');
const hbs = require('express-handlebars');
const methodOverride = require('method-override');
const path = require('path')


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



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'mysecretkey',
  resave: false,
  saveUninitialized: true,
}));



//api get, post bài viết 
app.post('/postbaiviet/:userId', async (req, res) => {
  try {
    const userId = req.params.userId
    const { content } = req.body
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'user không tồn tại' })
    }
    if (user.role === "user") {
      return res.status(403).json({ message: 'bạn không có quyền đăng bài viết' })
    }

    const baiviet = new Baiviet({ userId, content, like: 0 })
    await baiviet.save()
    user.baiviet.push(baiviet._id)
    await user.save()
    return res.status(200).json({ message: 'post bài viết thành công' })

  } catch (err) {
    console.error('Lỗi khi đăng bài viết:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi đăng bài viết.' });
  }

})

app.get('/getbaiviet', async (req, res) => {
  try {
    const baiviet = await Baiviet.find({}).populate("userId", "username")
    const formattedBaiviet = baiviet.map(item => ({
      _id: item._id,
      userId: item.userId._id,
      username: item.userId.username,
      content: item.content,
      like: item.like,
      __v: item.__v
    }));
    res.json(formattedBaiviet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy thông tin bài viết' });
  }
})

app.post('/deletebaiviet/:baivietid/:userId', async (req, res) => {
  try {
    const baivietid = req.params.baivietid
    const userId=req.params.userId
    await Baiviet.findByIdAndDelete(baivietid)
    const user=await User.findById(userId)
    if(!user){
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
      category: manga.category,
      totalChapters: manga.chapters.length
    }));
    res.json(formattedMangaList);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách truyện' });
  }
});

app.post('/mangapost', async (req, res) => {
  try {
    const { manganame, author, content, category, view, like, image } = req.body;
    const categoryObject = await Category.findOne({ categoryname: category });

    if (!categoryObject) {
      return res.status(404).json({ message: 'Thể loại không tồn tại.' });
    }

    const manga = new Manga({ manganame, author, content, category, view, like, image });
    await manga.save();

    categoryObject.manga.push(manga._id);
    await categoryObject.save();

    res.status(201).json(manga);
  } catch (error) {
    console.error('Lỗi khi tạo truyện:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo truyện' });
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

app.listen(8080, () =>
  console.log("Server is running on port 8080...")
);
