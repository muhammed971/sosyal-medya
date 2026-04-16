require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

// Mongo bağlantısını daha görünür loglayalım
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB bağlandı"))
  .catch((err) => console.error("MongoDB hata:", err));

// MODELS
const User = mongoose.model("User", {
  username: String,
  password: String
});

const Post = mongoose.model("Post", {
  title: String,
  content: String,
  likes: { type: Number, default: 0 },
  username: String
});

const Comment = mongoose.model("Comment", {
  postId: String,
  text: String,
  username: String
});

// AUTH MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).send("Token gerekli");

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send("Geçersiz token");
    req.user = user;
    next();
  });
}

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("API çalışıyor");
});

// REGISTER
app.post("/register", async (req, res) => {
  try {
    if (!req.body.username || !req.body.password) {
      return res.status(400).send("Kullanıcı adı ve şifre gerekli");
    }

    const existing = await User.findOne({ username: req.body.username });
    if (existing) {
      return res.status(400).send("Bu kullanıcı adı zaten kayıtlı");
    }

    const hash = await bcrypt.hash(req.body.password, 10);

    const user = new User({
      username: req.body.username,
      password: hash
    });

    await user.save();
    res.send("Kayıt başarılı");
  } catch (error) {
    console.error("Register hata:", error);
    res.status(500).send("Kayıt sırasında hata oluştu");
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    if (!req.body.username || !req.body.password) {
      return res.status(400).send("Kullanıcı adı ve şifre gerekli");
    }

    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(401).send("Hatalı giriş");

    const ok = await bcrypt.compare(req.body.password, user.password);
    if (!ok) return res.status(401).send("Hatalı giriş");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    console.error("Login hata:", error);
    res.status(500).send("Giriş sırasında hata oluştu");
  }
});

// GET POSTS
app.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ _id: -1 });
    res.json(posts);
  } catch (error) {
    console.error("Posts hata:", error);
    res.status(500).send("Postlar alınamadı");
  }
});

// ADD POST
app.post("/posts", auth, async (req, res) => {
  try {
    if (!req.body.title || !req.body.content) {
      return res.status(400).send("Başlık ve içerik gerekli");
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).send("Kullanıcı bulunamadı");

    const post = new Post({
      title: req.body.title,
      content: req.body.content,
      username: user.username
    });

    await post.save();
    res.json(post);
  } catch (error) {
    console.error("Post ekleme hata:", error);
    res.status(500).send("Post eklenemedi");
  }
});

// DELETE POST
app.delete("/posts/:id", auth, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.send("Silindi");
  } catch (error) {
    console.error("Post silme hata:", error);
    res.status(500).send("Post silinemedi");
  }
});

// LIKE POST
app.post("/posts/:id/like", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post bulunamadı");

    post.likes += 1;
    await post.save();
    res.json(post);
  } catch (error) {
    console.error("Like hata:", error);
    res.status(500).send("Like işlemi başarısız");
  }
});

// GET COMMENTS
app.get("/comments/:postId", async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId });
    res.json(comments);
  } catch (error) {
    console.error("Comments hata:", error);
    res.status(500).send("Yorumlar alınamadı");
  }
});

// ADD COMMENT
app.post("/comments", auth, async (req, res) => {
  try {
    if (!req.body.postId || !req.body.text) {
      return res.status(400).send("Post ID ve yorum gerekli");
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).send("Kullanıcı bulunamadı");

    const comment = new Comment({
      postId: req.body.postId,
      text: req.body.text,
      username: user.username
    });

    await comment.save();
    res.json(comment);
  } catch (error) {
    console.error("Comment hata:", error);
    res.status(500).send("Yorum eklenemedi");
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server çalışıyor: " + PORT);
});