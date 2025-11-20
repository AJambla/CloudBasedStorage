// uploadFiles(fileList: FileList) -> sends files to backend
export async function uploadFilesToServer(fileList: FileList) {
  const form = new FormData();
  Array.from(fileList).forEach((f) => form.append("files", f));
  const res = await fetch("http://localhost:5000/upload", {
    method: "POST",
    body: form,
  });
  return res.json(); // { success: true, files: [...] }
}
