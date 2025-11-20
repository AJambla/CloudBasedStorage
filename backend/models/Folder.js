import mongoose from "mongoose";

const FolderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    parent: { type: String, default: null },
    userId: { type: String, required: true }, // 👈 ADD THIS
  },
  { timestamps: true }
);

export default mongoose.model("Folder", FolderSchema);
