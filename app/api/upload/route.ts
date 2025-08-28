import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { VectorStoreService } from "@/lib/document-store";

class DocumentProcessor {
  static async processFile(
    filePath: string,
    fileName: string,
    fileType: string
  ): Promise<{
    documents: Document[];
    fullContent: string;
  }> {
    let text = "";
    try {
      console.log(`Processing file: ${fileName}, type: ${fileType}`);

      switch (fileType) {
        case "application/pdf":
          text = await this.extractFromPDF(filePath);
          break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        case "application/msword":
          text = await this.extractFromDocx(filePath);
          break;
        case "text/plain":
          text = fs.readFileSync(filePath, "utf-8");
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No text content could be extracted from the file");
      }

      console.log(`Extracted text length: ${text.length} characters`);

      const document = new Document({
        pageContent: text,
        metadata: {
          source: fileName,
          type: fileType,
          uploadDate: new Date().toISOString(),
        },
      });

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const chunks = await textSplitter.splitDocuments([document]);
      console.log(`Created ${chunks.length} chunks`);

      return {
        documents: chunks,
        fullContent: text,
      };
    } catch (error) {
      console.error("Error processing file:", error);
      throw new Error(
        `Failed to process file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private static async extractFromPDF(filePath: string): Promise<string> {
    try {
      console.log("Extracting from PDF...");
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error(
          "PDF appears to be empty or contains no extractable text"
        );
      }

      return data.text;
    } catch (error) {
      console.error("PDF parsing error:", error);
      // Fallback: try to read the file as text if PDF parsing fails
      try {
        console.log("Trying fallback text extraction...");
        return fs.readFileSync(filePath, "utf-8");
      } catch (fallbackError) {
        console.error("Fallback text reading error:", fallbackError);
        throw new Error(
          "Failed to extract text from PDF - file may be password protected or corrupted"
        );
      }
    }
  }

  private static async extractFromDocx(filePath: string): Promise<string> {
    try {
      console.log("Extracting from DOCX...");
      const result = await mammoth.extractRawText({ path: filePath });

      if (!result.value || result.value.trim().length === 0) {
        throw new Error(
          "DOCX appears to be empty or contains no extractable text"
        );
      }

      return result.value;
    } catch (error) {
      console.error("DOCX extraction error:", error);
      throw new Error(
        `Failed to extract text from DOCX: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

class VectorStoreServiceLocal {
  static async createDocumentStore(
    documents: Document[],
    documentId: string,
    fileName: string
  ): Promise<any> {
    try {
      console.log(`Creating vector store for ${documents.length} documents`);

      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY!,
        modelName: "text-embedding-3-small",
      });

      const vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        embeddings
      );

      const documentStore: any = {
        id: documentId,
        vectorStore,
        originalContent: documents.map((doc) => doc.pageContent).join("\n"),
        metadata: {
          fileName,
          uploadDate: new Date(),
          chunkCount: documents.length,
        },
      };

      VectorStoreService.setDocumentStore(documentId, documentStore);
      console.log(`Vector store created and stored with ID: ${documentId}`);

      return documentStore;
    } catch (error) {
      console.error("Error creating vector store:", error);
      throw new Error(
        `Failed to create vector store: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Upload endpoint called");

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is not configured");
      return NextResponse.json(
        {
          error: "OpenAI API key is not configured",
        },
        { status: 500 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error("No file uploaded");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log(
      `File received: ${file.name}, size: ${file.size}, type: ${file.type}`
    );

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error(`Unsupported file type: ${file.type}`);
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.",
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      console.error(`File size too large: ${file.size} bytes`);
      return NextResponse.json(
        {
          error: "File size exceeds 10MB limit",
        },
        { status: 400 }
      );
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      console.log("Creating uploads directory");
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate a unique filename to avoid conflicts
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = path.join(uploadsDir, `${timestamp}_${safeName}`);

    console.log(`Saving file to: ${filePath}`);
    fs.writeFileSync(filePath, buffer);

    const documentId = `doc_${timestamp}_${safeName.replace(/\s+/g, "_")}`;
    console.log(`Generated document ID: ${documentId}`);

    try {
      const { documents, fullContent } = await DocumentProcessor.processFile(
        filePath,
        file.name,
        file.type
      );

      const documentStore = await VectorStoreServiceLocal.createDocumentStore(
        documents,
        documentId,
        file.name
      );

      // Clean up temporary file
      console.log("Cleaning up temporary file");
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const response = {
        message: "File processed successfully",
        documentId,
        fileName: file.name,
        chunksCreated: documents.length,
        contentPreview: fullContent.substring(0, 200) + "...",
        success: true,
      };

      console.log("Upload successful:", response);
      return NextResponse.json(response);
    } catch (processingError) {
      // Clean up temporary file even if processing fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw processingError;
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
