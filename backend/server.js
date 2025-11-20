import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth } from "./middleware/auth.js";
import User from "./models/Users.js";



// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, { dbName: "cloudbox" })
  .then(() => console.log("🍃 MongoDB Atlas Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// Fix __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// STORAGE FOLDER
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = uuid();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  },
});
const upload = multer({ storage });

// Serve uploaded files
app.use("/uploads", express.static(UPLOAD_DIR));

/* -------------------------
        MODELS
------------------------- */
import FileModel from "./models/File1.js";
import FolderModel from "./models/Folder.js";


/* -------------------------
        GET FILES  (per user)
------------------------- */
app.get("/files", auth, async (req, res) => {
  const folder = req.query.folder || null;
  const userId = req.user.userId;

  const query = { userId };
  if (folder) query.folder = folder;
  else query.folder = null;

  const found = await FileModel.find(query);

  res.json(
    found.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      size: f.size,
      uploadedAt: f.uploadedAt,
      url: f.url,
      folder: f.folder || null,
    }))
  );
});



/* -------------------------
        GET FOLDERS
------------------------- */
/* -------------------------
        GET FOLDERS (per user)
------------------------- */
app.get("/folders", auth, async (req, res) => {
  const userId = req.user.userId;

  const found = await FolderModel.find({ userId });

  res.json(
    found.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      parent: f.parent || null,
    }))
  );
});


+
/* -------------------------
        CREATE FOLDER (per user)
------------------------- */
app.post("/folders", auth, async (req, res) => {
  const folder = await FolderModel.create({
    name: req.body.name,
    parent: req.body.parent || null,
    userId: req.user.userId,  // ALWAYS take from token, not body
  });

  res.json({
    id: folder._id,
    name: folder.name,
    parent: folder.parent,
  });
});

/* -------------------------
        RENAME FOLDER
------------------------- */
app.put("/folders/:id", async (req, res) => {
  const updated = await FolderModel.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    { new: true }
  );

  res.json({
    id: updated._id.toString(),
    name: updated.name,
    parent: updated.parent || null,
  });
});


/* -------------------------
        DELETE FOLDER
------------------------- */
app.delete("/folders/:id", async (req, res) => {
  const id = req.params.id;

  await FolderModel.findByIdAndDelete(id);

  const filesInside = await FileModel.find({ folder: id });

  filesInside.forEach((file) => {
    const filePath = path.join(UPLOAD_DIR, path.basename(file.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  await FileModel.deleteMany({ folder: id });

  res.json({ message: "Folder deleted" });
});

/* -------------------------
         UPLOAD FILES (per user)
------------------------- */
app.post("/upload", auth, upload.array("files"), async (req, res) => {
  const folder = req.body.folder || null;
  const userId = req.user.userId;

  const uploadedFiles = await Promise.all(
    req.files.map((file) =>
      FileModel.create({
        name: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        url: `http://localhost:5000/uploads/${file.filename}`,
        folder,
        userId,
      })
    )
  );

  res.json(
    uploadedFiles.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      size: f.size,
      uploadedAt: f.uploadedAt,
      url: f.url,
      folder: f.folder || null,
    }))
  );
});


/* -------------------------
        RENAME FILE
------------------------- */
app.put("/files/:id", async (req, res) => {
  const updated = await FileModel.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    { new: true }
  );
  res.json(updated);
});

/* -------------------------
        DELETE FILE
------------------------- */
app.delete("/delete-file/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "File ID is required" });
  }

  try {
    const file = await FileModel.findById(id);  // FIXED
    if (!file) return res.status(404).json({ error: "File not found" });

    // DELETE PHYSICAL FILE
    const filePath = path.join(UPLOAD_DIR, path.basename(file.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // DELETE FROM DATABASE
    await file.deleteOne();

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
/* -------------------------
        AUTH - SIGNUP
------------------------- */
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
    });

    res.json({ message: "User registered", userId: user._id.toString() });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

/* -------------------------
        AUTH - LOGIN
------------------------- */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
  token,
  user: {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  },
  message: "Login success",
});

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});


/* -------------------------
         START SERVER
------------------------- */
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
