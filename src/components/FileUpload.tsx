// uploadFiles(fileList: FileList) -> sends files to backend
export async function uploadFilesToServer(fileList: FileList) {
  const form = new FormData();
  Array.from(fileList).forEach((f) => form.append("files", f));
  const res = await fetch("https://d3hsynlhookvwj.cloudfront.net/upload", {
    method: "POST",
    body: form,
  });
  return res.json(); // { success: true, files: [...] }
}
