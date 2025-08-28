"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface UploadResponse {
  message: string;
  documentId: string;
  fileName: string;
  chunksCreated: number;
  contentPreview: string;
  error?: string;
  details?: string;
}

export default function DocumentUploadPage() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(
      (file) =>
        file.type === "application/pdf" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword" ||
        file.type === "text/plain"
    );

    if (validFile) {
      setSelectedFile(validFile);
      setUploadedFile({
        name: validFile.name,
        size: validFile.size,
        type: validFile.type,
      });
      setError(null);
    } else {
      setError("Please select a valid PDF, DOC, DOCX, or TXT file.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      setError(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  };

  const handleUpload = async () => {
    if (!uploadedFile || !selectedFile) {
      setError("No file selected. Please select a file first.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(
        "Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files."
      );
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      console.log(
        "Uploading file:",
        selectedFile.name,
        selectedFile.type,
        selectedFile.size
      );

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResponse = await response.json();

      console.log("Upload response:", data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.documentId) {
        setDocumentId(data.documentId);
        setUploadSuccess(true);

        console.log(
          "Upload successful, redirecting to test page with documentId:",
          data.documentId
        );

        const url = `/test?documentId=${encodeURIComponent(data.documentId)}`;
        console.log("Redirecting to:", url);

        if (typeof window !== "undefined") {
          window.location.href = url;
        }
      } else {
        throw new Error("No document ID received from server");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(
        error.message || "Upload failed. Please check your file and try again."
      );
      setUploadSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setSelectedFile(null);
    setError(null);
    setDocumentId(null);
    setUploadSuccess(false);
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-balance text-foreground">
            Document Upload & Processing
          </h1>
          <p className="text-muted-foreground text-pretty">
            Upload your PDF or Word document to generate questions and test your
            knowledge
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Display */}
        {uploadSuccess && documentId && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <p className="text-sm font-medium">
                  Document processed successfully! Redirecting to test page...
                </p>
              </div>
              <div className="mt-2">
                <p className="text-xs text-green-700">
                  Document ID: {documentId}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Document
            </CardTitle>
            <CardDescription>
              Drag and drop your file here, or click to browse. Supports PDF,
              Word, and text documents (max 10MB).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragOver ? "border-primary bg-primary/5" : "border-border",
                uploadedFile ? "border-green-500 bg-green-50" : "",
                error ? "border-red-500 bg-red-50" : ""
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadedFile ? (
                <div className="space-y-2">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {uploadedFile.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(uploadedFile.size)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {uploadedFile.type}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetUpload}
                    disabled={uploading}
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div className="space-y-2">
                    <p className="text-foreground font-medium">
                      Drop your document here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PDF, DOC, DOCX, or TXT files up to 10MB
                    </p>
                  </div>
                  <div>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      disabled={uploading}
                    />
                    <Label
                      htmlFor="file-upload"
                      className="justify-center flex items-center"
                    >
                      <Button
                        variant="outline"
                        className="cursor-pointer bg-transparent"
                        asChild
                        disabled={uploading}
                      >
                        <span>Browse Files</span>
                      </Button>
                    </Label>
                  </div>
                </div>
              )}
            </div>

            {uploadedFile && !uploadSuccess && (
              <div className="mt-6 space-y-4">
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="w-full"
                >
                  {uploading
                    ? "Processing Document..."
                    : "Upload and Generate Questions"}
                </Button>

                {uploading && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>
                      This may take a few moments depending on document size...
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual redirect option */}
            {documentId && !uploading && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  If you weren't redirected automatically, click below:
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = `/test?documentId=${encodeURIComponent(
                      documentId
                    )}`;
                    window.location.href = url;
                  }}
                  className="w-full"
                >
                  Go to Test Page
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug info (remove in production) */}
        {process.env.NODE_ENV === "development" && (
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">File Information</CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              <p>Upload State: {uploadedFile ? "File Selected" : "No File"}</p>
              <p>Selected File: {selectedFile ? selectedFile.name : "None"}</p>
              <p>Uploading: {uploading ? "Yes" : "No"}</p>
              <p>Document ID: {documentId || "None"}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
