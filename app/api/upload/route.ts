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
      switch (fileType) {
        case "application/pdf":
          text = await this.extractFromPDF(filePath);
          break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          text = await this.extractFromDocx(filePath);
          break;
        case "text/plain":
          text = fs.readFileSync(filePath, "utf-8");
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

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

      return {
        documents: chunks,
        fullContent: text,
      };
    } catch (error) {
      console.error("Error processing file:", error);
      throw new Error("Failed to process file");
    }
  }

  private static async extractFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error("PDF parsing error:", error);
      // Fallback: try to read the file as text if PDF parsing fails
      try {
        return fs.readFileSync(filePath, "utf-8");
      } catch (fallbackError) {
        console.error("Fallback text reading error:", fallbackError);
        throw new Error("Failed to extract text from PDF");
      }
    }
  }

  private static async extractFromDocx(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error("Failed to extract text from DOCX");
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
      return documentStore;
    } catch (error) {
      console.error("Error creating vector store:", error);
      throw new Error("Failed to create vector store");
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
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
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload PDF, DOCX, or TXT files.",
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
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
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, file.name);
    fs.writeFileSync(filePath, buffer);

    const documentId = `doc_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

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
    fs.unlinkSync(filePath);

    return NextResponse.json({
      message: "File processed successfully",
      documentId,
      fileName: file.name,
      chunksCreated: documents.length,
      contentPreview: fullContent.substring(0, 200) + "...",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error instanceof Error ? error.message : "Unknown error",
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
