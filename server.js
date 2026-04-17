require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// =========================
// MongoDB Bağlantısı
// =========================
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    });

    console.log("MongoDB bağlandı");

    app.listen(PORT, () => {
      console.log("Server çalışıyor: " + PORT);
    });
  } catch (error) {
    console.error("MongoDB bağlantı hatası:", error);
    process.exit(1);
  }
}

// =========================
// Modeller
// =========================
const User = mongoose.model("User", {
  username: String,
  password: String,
});

const Post = mongoose.model("Post", {
  title: String,
  content: String,
  likes: { type: Number, default: 0 },
  username: String,
});

const Comment = mongoose.model("Comment", {
  postId: String,
  text: String,
  username: String,
});

// =========================
// Auth Middleware
// =========================
function auth(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(403).send("Token gerekli");
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send("Geçersiz token");
    }

    req.user = user;
    next();
  });
}

// =========================
// Test Route
// =========================
app.get("/", (req, res) => {
  res.send("API çalışıyor");
});

// =========================
// Auth Routes
// =========================
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send("Kullanıcı adı ve şifre gerekli");
    }

    const existing = await User.findOne({ username });

    if (existing) {
      return res.status(400).send("Bu kullanıcı adı zaten kayıtlı");
    }

    const hash = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hash,
    });

    await user.save();

    res.send("Kayıt başarılı");
  } catch (error) {
    console.error("Register hata:", error);
    res.status(500).send("Kayıt sırasında hata oluştu");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send("Kullanıcı adı ve şifre gerekli");
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).send("Hatalı giriş");
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).send("Hatalı giriş");
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ token });
  } catch (error) {
    console.error("Login hata:", error);
    res.status(500).send("Giriş sırasında hata oluştu");
  }
});

// =========================
// Post Routes
// =========================
app.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ _id: -1 });
    res.json(posts);
  } catch (error) {
    console.error("Posts hata:", error);
    res.status(500).send("Postlar alınamadı");
  }
});

app.post("/posts", auth, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).send("Başlık ve içerik gerekli");
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).send("Kullanıcı bulunamadı");
    }

    const post = new Post({
      title,
      content,
      username: user.username,
    });

    await post.save();

    res.json(post);
  } catch (error) {
    console.error("Post ekleme hata:", error);
    res.status(500).send("Post eklenemedi");
  }
});

app.delete("/posts/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).send("Post bulunamadı");
    }

    if (post.username !== undefined) {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).send("Kullanıcı bulunamadı");
      }

      if (post.username !== user.username) {
        return res.status(403).send("Bu postu silemezsin");
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    res.send("Silindi");
  } catch (error) {
    console.error("Post silme hata:", error);
    res.status(500).send("Post silinemedi");
  }
});

app.post("/posts/:id/like", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).send("Post bulunamadı");
    }

    post.likes += 1;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error("Like hata:", error);
    res.status(500).send("Like işlemi başarısız");
  }
});

// =========================
// Comment Routes
// =========================
app.get("/comments/:postId", async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId }).sort({ _id: 1 });
    res.json(comments);
  } catch (error) {
    console.error("Comments hata:", error);
    res.status(500).send("Yorumlar alınamadı");
  }
});

app.post("/comments", auth, async (req, res) => {
  try {
    const { postId, text } = req.body;

    if (!postId || !text) {
      return res.status(400).send("Post ID ve yorum gerekli");
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).send("Kullanıcı bulunamadı");
    }

    const comment = new Comment({
      postId,
      text,
      username: user.username,
    });

    await comment.save();

    res.json(comment);
  } catch (error) {
    console.error("Comment hata:", error);
    res.status(500).send("Yorum eklenemedi");
  }
});

// =========================
// Server Başlat
// =========================
startServer();