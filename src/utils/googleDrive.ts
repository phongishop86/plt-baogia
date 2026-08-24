export const GOOGLE_CLIENT_ID = "980949107297-foi8cte6ujtlj56q0366pkqqe0sa5oe6.apps.googleusercontent.com";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "plt-backup.json";

/**
 * Tìm file backup trong thư mục ẩn appDataFolder
 */
export async function findBackupFile(accessToken: string): Promise<string | null> {
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) throw new Error("Không thể kiểm tra Google Drive.");
  
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Tải file backup từ Google Drive về
 */
export async function downloadBackup(accessToken: string, fileId: string): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) throw new Error("Không thể tải dữ liệu từ Google Drive.");
  return await response.json();
}

/**
 * Upload dữ liệu (ghi đè nếu đã có, hoặc tạo mới nếu chưa)
 */
export async function uploadBackup(accessToken: string, fileId: string | null, jsonData: any): Promise<void> {
  const fileContent = JSON.stringify(jsonData);
  
  const metadata = {
    name: FILE_NAME,
    parents: fileId ? undefined : ["appDataFolder"],
  };

  const formData = new FormData();
  formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  formData.append("file", new Blob([fileContent], { type: "application/json" }));

  let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  let method = "POST";

  if (fileId) {
    // Cập nhật file đã có
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = "PATCH";
  }

  const response = await fetch(url, {
    method,
    headers: { 
      Authorization: `Bearer ${accessToken}`
    },
    body: formData,
  });

  if (!response.ok) throw new Error("Không thể upload dữ liệu lên Google Drive.");
}
