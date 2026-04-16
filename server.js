require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

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
function auth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(403);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.get("/", (req, res) => {
  res.send("Backend çalışıyor");
});

app.post("/register", async (req, res) => {
  try {
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
    res.status(500).send("Kayıt sırasında hata oluştu");
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(401).send("Hatalı giriş");

    const ok = await bcrypt.compare(req.body.password, user.password);
    if (!ok) return res.status(401).send("Hatalı giriş");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(500).send("Giriş sırasında hata oluştu");
  }
});

app.get("/posts", async (req, res) => {
  const posts = await Post.find();
  res.json(posts);
});

app.post("/posts", auth, async (req, res) => {
  const user = await User.findById(req.user.id);

  const post = new Post({
    title: req.body.title,
    content: req.body.content,
    username: user.username
  });

  await post.save();
  res.json(post);
});
app.delete("/posts/:id", auth, async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.send("Silindi");
});

app.post("/posts/:id/like", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).send("Post bulunamadı");

  post.likes += 1;
  await post.save();
  res.json(post);
});

app.get("/comments/:postId", async (req, res) => {
  const comments = await Comment.find({ postId: req.params.postId });
  res.json(comments);
});

app.post("/comments", auth, async (req, res) => {
  const user = await User.findById(req.user.id);

  const comment = new Comment({
    postId: req.body.postId,
    text: req.body.text,
    username: user.username
  });

  await comment.save();
  res.json(comment);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server çalışıyor: " + PORT);
});