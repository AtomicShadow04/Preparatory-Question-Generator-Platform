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
import { Upload, FileText, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export default function DocumentUploadPage() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

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
      setUploadedFile({
        name: validFile.name,
        size: validFile.size,
        type: validFile.type,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
      });
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
    if (!uploadedFile) return;

    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.documentId) {
        setDocumentId(data.documentId);
        // Redirect to test page with documentId
        window.location.href = `/test?documentId=${data.documentId}`;
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
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

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Document
            </CardTitle>
            <CardDescription>
              Drag and drop your file here, or click to browse. Supports PDF,
              Word, and text documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragOver ? "border-primary bg-primary/5" : "border-border",
                uploadedFile ? "border-green-500 bg-green-50" : ""
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
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
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
                    />
                    <Label
                      htmlFor="file-upload"
                      className="justify-center flex items-center"
                    >
                      <Button
                        variant="outline"
                        className="cursor-pointer bg-transparent"
                        asChild
                      >
                        <span>Browse Files</span>
                      </Button>
                    </Label>
                  </div>
                </div>
              )}
            </div>

            {uploadedFile && (
              <div className="mt-6">
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading
                    ? "Processing..."
                    : "Upload and Generate Questions"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
