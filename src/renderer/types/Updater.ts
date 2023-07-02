export interface DownloadInfo {
    percent: number;
    transferredBytes: number;
    totalBytes: number;
}

export interface CompletedInfo {
    fileName: string;
    filename: string;
    path: string;
    fileSize: number;
    mimeType: string;
    url: string;
}
