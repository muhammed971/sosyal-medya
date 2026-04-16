import React, { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000";

function App() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [commentInputs, setCommentInputs] = useState({});
  const [comments, setComments] = useState({});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const getPosts = async () => {
    const res = await fetch(`${API}/posts`);
    const data = await res.json();
    setPosts(data);
  };

  useEffect(() => {
    getPosts();
  }, []);

  const register = async () => {
  try {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const text = await res.text();
    alert(text);
  } catch (error) {
    alert("Kayıt sırasında sunucuya ulaşılamadı");
  }
};
  const login = async () => {
  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text);
      return;
    }

    const data = await res.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", username);
    alert("Giriş başarılı");
  } catch (error) {
    alert("Sunucuya bağlanılamadı");
  }
};
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    alert("Çıkış yapıldı");
  };

  const addPost = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Önce giriş yap");
      return;
    }

    const res = await fetch(`${API}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ title, content }),
    });

    if (!res.ok) {
      alert("Post eklenemedi");
      return;
    }

    setTitle("");
    setContent("");
    getPosts();
  };

  const likePost = async (id) => {
    const res = await fetch(`${API}/posts/${id}/like`, {
      method: "POST",
    });

    if (!res.ok) {
      alert("Like çalışmadı");
      return;
    }

    getPosts();
  };

  const loadComments = async (postId) => {
    const res = await fetch(`${API}/comments/${postId}`);
    const data = await res.json();
    setComments((prev) => ({
      ...prev,
      [postId]: data,
    }));
  };

const addComment = async (postId) => {
  const text = commentInputs[postId];
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Yorum için önce giriş yap");
    return;
  }

  if (!text || !text.trim()) {
    return;
  }

  const res = await fetch(`${API}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      postId,
      text,
    }),
  });

    if (!res.ok) {
      alert("Yorum eklenemedi");
      return;
    }

    setCommentInputs((prev) => ({
      ...prev,
      [postId]: "",
    }));

    loadComments(postId);
  };

  return (
    <div className="page">
      <header className="hero">
        <h1>Sosyal Uygulama 🚀</h1>
        <p>Kendi sosyal medya uygulamanı kurdun. Şimdi onu güzelleştiriyoruz.</p>
      </header>

      <div className="top-grid">
        <section className="panel">
          <h2>Kayıt / Giriş</h2>

          <input
            className="input"
            placeholder="Kullanıcı adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="input"
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="button-row">
            <button className="btn" onClick={register}>Kayıt Ol</button>
            <button className="btn btn-dark" onClick={login}>Giriş Yap</button>
            <button className="btn btn-light" onClick={logout}>Çıkış</button>
          </div>

          <p className="small-text">
            Aktif kullanıcı: <b>{localStorage.getItem("username") || "Giriş yapılmadı"}</b>
          </p>
        </section>

        <section className="panel">
          <h2>Post Ekle</h2>

          <input
            className="input"
            placeholder="Başlık"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="textarea"
            placeholder="İçerik"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <button className="btn btn-primary" onClick={addPost}>Gönderiyi Paylaş</button>
        </section>
      </div>

      <section className="posts-section">
        <h2>Postlar</h2>

        {posts.length === 0 ? (
          <div className="empty-box">Henüz post yok.</div>
        ) : (
          posts.map((p) => (
  <div key={p._id} className="post-card">
    <h3>{p.title}</h3>
    <p className="author-text">Gönderen: {p.username || "Bilinmiyor"}</p>
    <p className="post-content">{p.content}</p>
              <div className="post-meta">
                <span>❤️ Beğeni: {p.likes || 0}</span>
              </div>

              <div className="button-row">
                <button className="btn btn-like" onClick={() => likePost(p._id)}>
                  Beğen
                </button>
                <button className="btn btn-light" onClick={() => loadComments(p._id)}>
                  Yorumları Göster
                </button>
              </div>

              <div className="comment-input-row">
                <input
                  className="input"
                  placeholder="Yorum yaz..."
                  value={commentInputs[p._id] || ""}
                  onChange={(e) =>
                    setCommentInputs((prev) => ({
                      ...prev,
                      [p._id]: e.target.value,
                    }))
                  }
                />
                <button className="btn btn-primary" onClick={() => addComment(p._id)}>
                  Gönder
                </button>
              </div>

              <div className="comments-list">
                {(comments[p._id] || []).map((c) => (
                  <div key={c._id} className="comment-box">
  <b>{c.username || "Bilinmiyor"}:</b> {c.text}
</div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default App;