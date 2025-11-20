import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    name: String,
    size: Number,
    uploadedAt: String,
    url: String,
    folder: { type: String, default: null },
    userId: { type: String, required: true },   // 👈 ADD THIS
  },
  { timestamps: true }
);

export default mongoose.model("File", FileSchema);
