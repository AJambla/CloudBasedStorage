import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { File, Download, Trash2, FileText, Image, FileVideo, FileAudio } from "lucide-react";
import { FileItem } from "@/pages/Dashboard";

interface FileListProps {
  files: FileItem[];
  onDelete: (id: string) => void;
  onDownload: (file: FileItem) => void;
}

const FileList = ({ files, onDelete, onDownload }: FileListProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-5 h-5 text-primary" />;
    if (type.startsWith("video/")) return <FileVideo className="w-5 h-5 text-primary" />;
    if (type.startsWith("audio/")) return <FileAudio className="w-5 h-5 text-primary" />;
    if (type.includes("pdf") || type.includes("document")) return <FileText className="w-5 h-5 text-primary" />;
    return <File className="w-5 h-5 text-primary" />;
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <File className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No files yet. Upload your first file!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {files.map((file) => (
        <Card key={file.id} className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)} •{formatDate(new Date(file.uploadedAt))}

                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(file)}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(file.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FileList;
