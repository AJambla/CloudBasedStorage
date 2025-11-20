// src/pages/Dashboard.tsx
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Cloud,
  Upload,
  LogOut,
  File,
  FileImage,
  FileVideo,
  FileText,
  FileArchive,
  FileCode,
  Trash2,
  Folder,
  Download,
  Pencil,
  ArrowLeft,
  Star,
  Clock,
  HardDrive,
  Plus,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const API_BASE = "http://localhost:5000";
const user = JSON.parse(localStorage.getItem("user") || "{}");


// Ensure axios always uses latest token
axios.defaults.headers.common["Authorization"] =
  `Bearer ${localStorage.getItem("token")}`;



// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

export interface FileItem {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  url: string;
  folder?: string | null;
  starred?: boolean;
  lastOpened?: number;
  type?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parent: string | null;
}

// ----------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------

const Dashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [view, setView] = useState<"drive" | "starred" | "recent" | "storage">("drive");

  // Storage
  const totalStorageLimit = 1024 * 1024 * 300;
  const [usedStorage, setUsedStorage] = useState(0);

  // Search filters
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "pdf" | "video" | "text">("all");
  const [filterFolder, setFilterFolder] = useState<string>("all");

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  // store all folders (not just current)
const [allFolders, setAllFolders] = useState<FolderItem[]>([]);


  // ----------------------------------------------------------------------
  // INLINE RENAME STATES
  // ----------------------------------------------------------------------

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return; // prevent empty request

    loadFiles();
    loadFolders();
  }, [currentFolder]);

  const loadFiles = async () => {
    try {
      const res = await axios.get(`${API_BASE}/files`, {
        params: { folder: currentFolder || "" },
      });

      const loaded: FileItem[] = res.data.map((f: any) => ({
        id: f.id || f._id, // FIXED
        name: f.name,
        size: f.size,
        uploadedAt: f.uploadedAt,
        url: f.url,
        folder: f.folder ?? null,
        starred: f.starred || false,
        lastOpened: f.lastOpened || 0,
        type: f.type || "",
      }));

      setFiles(loaded);
      setUsedStorage(loaded.reduce((sum, f) => sum + (f.size || 0), 0));
    } catch (err) {
      console.error("loadFiles error:", err);
      toast.error("Could not load files");
    }
  };
 const getFolderPath = (folderId) => {
  let path = [];
  let current = allFolders.find(f => f.id === folderId);

  while (current) {
    path.unshift(current);
    current = allFolders.find(f => f.id === current.parent);
  }

  return path;
};


 const loadFolders = async () => {
  try {
    const res = await axios.get(`${API_BASE}/folders`);

    const formatted = res.data.map((f: any) => ({
      id: f.id || f._id,
      name: f.name,
      parent: f.parent || null,
    }));

    setAllFolders(formatted);
    setFolders(formatted.filter((f) => f.parent === currentFolder));
  } catch (err) {
    console.error("loadFolders error:", err);
    toast.error("Could not load folders");
  }
};

  const handleUpload = async (selectedFiles: File[]) => {
    const formData = new FormData();
    selectedFiles.forEach((f) => formData.append("files", f));
    formData.append("folder", currentFolder || "");

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData);
      // backend returns array of created files (with _id) — normalize to id
      const uploaded: FileItem[] = res.data.map((f: any) => ({
        id: f._id || f.id,
        name: f.name,
        size: f.size,
        uploadedAt: f.uploadedAt,
        url: f.url,
        folder: f.folder ?? null,
        starred: f.starred || false,
        lastOpened: f.lastOpened || 0,
        type: f.type || "",
      }));

      setFiles((prev) => [...uploaded, ...prev]);
      setUsedStorage((prev) => prev + uploaded.reduce((s, x) => s + (x.size || 0), 0));
      toast.success("Uploaded successfully");
    } catch (err) {
      console.error("upload error:", err);
      toast.error("Upload failed");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleUpload(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleUpload(Array.from(e.dataTransfer.files));
  };

 const createFolder = async () => {
  try {
    const tempName = "New Folder";

    const res = await axios.post(`${API_BASE}/folders`, {
      name: tempName,
      parent: currentFolder || null,  // IMPORTANT
      user: user?.id || null
    });

    const newFolder = {
      id: res.data._id || res.data.id,
      name: res.data.name,
      parent: res.data.parent || null,
    };

    // Update all folders globally
    setAllFolders(prev => [...prev, newFolder]);

    // Update visible folders (children of current)
    setFolders(prev => [...prev, newFolder].filter(f => f.parent === currentFolder));

    toast.success("Folder created");
  } catch (err) {
    toast.error("Failed to create folder");
    console.log(err);
  }
};


  // ----------------------- RENAME FOLDER (USED FOR INLINE) ----------------------
  const renameFolderInline = async (folder: FolderItem, newName: string) => {
    if (!newName.trim()) return;
    try {
      await axios.put(`${API_BASE}/folders/${folder.id}`, { name: newName });
      await loadFolders(); // FIXED refresh
      toast.success("Folder renamed");
    } catch (err) {
      console.error("renameFolderInline error:", err);
      toast.error("Rename failed");
    }
  };

  // Delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "file" | "folder"; item: any } | null>(null);

  // ----------------------- RENAME FILE (INLINE) ----------------------
  // Use id consistently and update state after successful API call
  const renameFile = async (file: FileItem, newName: string) => {
    if (!file || !file.id || !newName.trim()) return;

    try {
      await axios.put(`${API_BASE}/files/${file.id}`, { name: newName });
      await loadFiles(); // FIXED refresh
      toast.success("Renamed successfully");
    } catch (err) {
      console.error("renameFile error:", err);
      toast.error("Rename failed");
    }
  };

  const renameFileInline = renameFile;

  // Delete folder
  const deleteFolder = async (folder: FolderItem) => {
    try {
      await axios.delete(`${API_BASE}/folders/${folder.id}`);
      await loadFolders(); // FIXED refresh
      toast.success("Folder deleted");
    } catch (err) {
      console.error("deleteFolder error:", err);
      toast.error("Delete failed");
    }
  };

  // File actions
  const handleDownload = (file: FileItem) => window.open(file.url, "_blank");

  const deleteFile = async (file: FileItem) => {
    if (!file || !file.id) return;

    try {
      await axios.delete(`${API_BASE}/delete-file/${file.id}`);
      await loadFiles(); // FIXED refresh
      toast.success("File deleted");
    } catch (err) {
      console.error("deleteFile error:", err);
      toast.error("Delete failed");
    }
  };

  const toggleStar = (file: FileItem) => {
    // local toggle only (no backend here)
    setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, starred: !f.starred } : f)));
  };

  // Filtering
  const matchesQuery = (f: FileItem) => f.name.toLowerCase().includes(query.toLowerCase());
  const matchesType = (f: FileItem) => {
    const n = f.name.toLowerCase();
    if (filterType === "image") return /\.(png|jpe?g|gif)$/i.test(n);
    if (filterType === "pdf") return /\.pdf$/i.test(n);
    if (filterType === "video") return /\.(mp4|webm)$/i.test(n);
    if (filterType === "text") return /\.(txt|md|json)$/i.test(n);
    return true;
  };
  const matchesFolder = (f: FileItem) => filterFolder === "all" || f.folder === filterFolder;

  let displayedFiles = files.filter((f) => matchesQuery(f) && matchesType(f) && matchesFolder(f));

  if (view === "starred") displayedFiles = displayedFiles.filter((f) => f.starred);
  if (view === "recent") displayedFiles = displayedFiles.slice().sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));

  // Preview
  const openPreview = async (file: FileItem) => {
    setPreviewFile(file);
    setPreviewOpen(true);

    if (/\.(txt|md|json)$/i.test(file.name)) {
      try {
        const resp = await fetch(file.url);
        setPreviewText(await resp.text());
      } catch {
        setPreviewText("Could not load preview");
      }
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];

    window.location.replace("/auth"); // forces fresh reload
  };


  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
    setPreviewText(null);
  };

  const getFileIcon = (name: string) => {
    const n = name.toLowerCase();
    if (/\.(png|jpe?g|gif)$/i.test(n)) return <FileImage className="text-blue-500 w-5 h-5" />;
    if (/\.pdf$/i.test(n)) return <FileArchive className="text-red-500 w-5 h-5" />;
    if (/\.(mp4|webm)$/i.test(n)) return <FileVideo className="text-purple-500 w-5 h-5" />;
    if (/\.txt|md|json$/i.test(n)) return <FileText className="text-green-500 w-5 h-5" />;
    return <File className="w-5 h-5 text-primary" />;
  };

  // ----------------------------------------------------------------------
  // UI
  // ----------------------------------------------------------------------

  return (
    <div className="flex min-h-screen">

      {/* LEFT SIDEBAR */}
      <aside className="w-64 border-r p-4 bg-card flex flex-col">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Cloud className="text-primary-foreground" />
          </div>
          <h1 className="font-bold text-xl">CloudBox</h1>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <SearchIcon className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-3 mt-3">
          <button onClick={() => { setView("drive"); setCurrentFolder(null); }} className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg">
            <Folder /> My Drive
          </button>
          <button onClick={() => setView("starred")} className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg">
            <Star /> Starred
          </button>
          <button onClick={() => setView("recent")} className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg">
            <Clock /> Recent
          </button>
        </nav>

        {/* Storage Box */}
        <div className="mt-6 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold flex items-center gap-2">
              <HardDrive className="w-5 h-5" /> Storage
            </span>
            <span className="text-sm text-muted-foreground">
              {(usedStorage / 1024 / 1024).toFixed(1)} / 300 MB
            </span>
          </div>

          <div className="w-full bg-muted h-3 rounded-full">
            <div
              className="bg-primary h-3"
              style={{ width: `${Math.min(100, (usedStorage / totalStorageLimit) * 100)}%` }}
            />
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6">

        {/* Header */}
        <header className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3 text-base font-semibold">


            {/* My Drive root */}
            <span
              className="cursor-pointer hover:underline"
              onClick={() => setCurrentFolder(null)}
            >
              My Drive
            </span>

            {/* Nested folders */}
            {getFolderPath(currentFolder).map((f) => (
              <span key={f.id} className="flex items-center gap-2">
                /
                <span
                  className="cursor-pointer hover:underline"
                  onClick={() => setCurrentFolder(f.id)}
                >
                  {f.name}
                </span>
              </span>
            ))}

          </div>


          <div className="flex items-center gap-3">
            <span className="font-medium">Hello, {user.name}</span>
            <ThemeToggle />
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2" /> Logout
            </Button>
          </div>

        </header>

        {/* Upload box */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border border-dashed p-6 text-center rounded-xl mb-6 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileInput} />
          <Upload className="mx-auto mb-3 w-8 h-8" />
          <p>Drag & drop files or click to upload</p>
        </div>


        {/* FOLDER SECTION */}
        {view === "drive" && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Folders</h3>
              <Button size="sm" onClick={createFolder}>
                <Plus className="mr-2" /> New Folder
              </Button>
            </div>

            <div className="border rounded-lg divide-y mb-6">
              {allFolders.filter(f => f.parent === currentFolder).map(folder =>(
                <div
                  key={folder.id}
                  className="group flex items-center justify-between px-4 py-2 hover:bg-accent cursor-pointer"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setCurrentFolder(folder.id);
                    await loadFiles();
                    await loadFolders();
                  }}
                >
                  {/* LEFT: ICON + NAME */}
                  <div className="flex items-center gap-2">
                    <Folder className="text-primary w-5 h-5" />

                    {editingFolderId === folder.id ? (
                      <input
                        value={editingFolderName}
                        autoFocus
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onBlur={() => {
                          renameFolderInline(folder, editingFolderName);
                          setEditingFolderId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renameFolderInline(folder, editingFolderName);
                            setEditingFolderId(null);
                          }
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        className="border px-2 py-1 text-sm rounded"
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingFolderId(folder.id);
                          setEditingFolderName(folder.name);
                        }}
                        className="cursor-pointer"
                      >
                        {folder.name}
                      </span>
                    )}
                  </div>

                  {/* RIGHT: ACTIONS ON HOVER ONLY */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolderId(folder.id);
                        setEditingFolderName(folder.name);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFolder(folder);
                      }}
                    >
                      <Trash2 className="text-destructive w-4 h-4" />
                    </Button>
                  </div>

                </div>
              ))}
            </div>


            {/* FILE SECTION */}
            <h3 className="text-lg font-semibold mb-3">Files</h3>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="text-left py-2 px-4">Name</th>
                    <th className="text-left py-2 px-4">Size</th>
                    <th className="text-left py-2 px-4">Uploaded</th>
                    <th className="text-right py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedFiles.map((file) => (
                    <tr key={file.id} className="border-t hover:bg-accent/20">
                      <td className="py-2 px-4 flex items-center gap-2">

                        {getFileIcon(file.name)}

                        {/* INLINE FILE RENAME */}
                        {editingFileId === file.id ? (
                          <input
                            value={editingFileName}
                            autoFocus
                            onChange={(e) => setEditingFileName(e.target.value)}
                            onBlur={() => {
                              renameFileInline(file, editingFileName);
                              setEditingFileId(null);
                              loadFiles();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                renameFileInline(file, editingFileName);
                                setEditingFileId(null);
                                loadFiles();
                              }
                              if (e.key === "Escape") setEditingFileId(null);
                            }}
                            className="border px-2 py-1 text-sm rounded"
                          />

                        ) : (
                          <span
                            className="underline cursor-pointer"
                            onClick={() => openPreview(file)}
                            onDoubleClick={() => {
                              setEditingFileId(file.id || "");
                              setEditingFileName(file.name);
                            }}
                          >
                            {file.name}
                          </span>
                        )}

                      </td>

                      <td className="py-2 px-4">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </td>

                      <td className="py-2 px-4">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </td>

                      <td className="py-2 px-4 flex gap-2 justify-end">

                        <Button size="sm" variant="ghost" onClick={() => toggleStar(file)}>
                          <Star className={`w-4 h-4 ${file.starred ? "text-yellow-400" : ""}`} />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4" />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingFileId(file.id || "");
                          setEditingFileName(file.name);
                        }}>
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button size="sm" variant="ghost" onClick={() => deleteFile(file)}>
                          <Trash2 className="text-destructive w-4 h-4" />
                        </Button>

                      </td>
                    </tr>
                  ))}

                  {displayedFiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No files to show
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Preview Modal */}
            {previewOpen && previewFile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="bg-card rounded-lg w-full max-w-4xl overflow-auto relative">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <File /> <span className="font-semibold">{previewFile.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => window.open(previewFile.url, "_blank")}>
                        Open in new tab
                      </Button>
                      <Button size="sm" variant="ghost" onClick={closePreview}>
                        <X />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4">
                    {/\.(png|jpe?g|gif)$/i.test(previewFile.name) && (
                      <img src={previewFile.url} className="max-w-full max-h-[70vh] mx-auto" />
                    )}

                    {/\.(mp4|webm)$/i.test(previewFile.name) && (
                      <video src={previewFile.url} controls className="w-full max-h-[70vh]" />
                    )}

                    {/\.(pdf)$/i.test(previewFile.name) && (
                      <iframe src={previewFile.url} className="w-full h-[70vh]" />
                    )}

                    {(previewText || /\.(txt|md|json)$/i.test(previewFile.name)) && (
                      <div className="max-h-[70vh] overflow-auto bg-muted p-4 rounded">
                        <pre className="whitespace-pre-wrap">{previewText ?? "Loading..."}</pre>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}
          </>)}
      </main>
    </div>
  );
};

export default Dashboard;
