const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/UserModel')
const bodyParser = require('body-parser');
const Category = require('./models/CategoryModel')
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


app.get("/logout", async (req, res) => {
  res.redirect('/loginadmin');
});




//api get, post category

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
  res.render("login");
});
app.post('/loginadmin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.render('login', {
        UserError: 'bạn nhập sai tên đăng nhập'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.render('login', {
        PassError: 'Mật khẩu không đúng'
      });
    }

    if (user.role === 'admin') {
      const token = jwt.sign({ userId: user._id, role: user.role }, 'mysecretkey');
      req.session.token = token;
      return res.status(200).send(`
        <script>
          window.location.href = '/admin'; 
        </script>
      `);
    } else if (user.role === 'nhomdich') {
      const token = jwt.sign({ userId: user._id, role: user.role }, 'mysecretkey');
      req.session.token = token;
      return res.status(200).send(`
        <script>
          window.location.href = '/nhomdich'; 
        </script>
      `);
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



app.listen(8080, () =>
  console.log("Server is running on port 8080...")
);
