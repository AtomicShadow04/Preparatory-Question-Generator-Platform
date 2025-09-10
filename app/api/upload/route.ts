import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { VectorStoreService } from "@/lib/document-store";

interface DocumentStore {
  id: string;
  vectorStore: MemoryVectorStore;
  originalContent: string;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: Date;
    chunkCount: number;
  };
}

const loaderMap: Record<string, (filePath: string) => any> = {
  "application/pdf": (filePath) =>
    new PDFLoader(filePath, { splitPages: false }),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (
    filePath
  ) => new DocxLoader(filePath),
  "application/msword": (filePath) => new DocxLoader(filePath),
  "text/plain": (filePath) => new TextLoader(filePath),
};

class DocumentProcessor {
  static async processFile(
    filePath: string,
    fileName: string,
    fileType: string,
    fileSize: number
  ): Promise<{ documents: Document[]; fullContent: string }> {
    try {
      console.log(`Processing file: ${fileName}, type: ${fileType}`);

      const loaderFactory = loaderMap[fileType];
      if (!loaderFactory) {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      const loader = loaderFactory(filePath);
      let docs: Document[] = await loader.load();

      if (!docs.length) {
        throw new Error("No content could be loaded from file");
      }

      // Inject metadata into each Document
      docs = docs.map(
        (doc) =>
          new Document({
            pageContent: doc.pageContent,
            metadata: {
              ...doc.metadata,
              fileName,
              fileType,
              fileSize,
              uploadDate: new Date().toISOString(),
            },
          })
      );

      console.log(`Loaded ${docs.length} raw document(s)`);

      // Split into chunks
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const chunks = await splitter.splitDocuments(docs);
      console.log(`Created ${chunks.length} chunks`);

      return {
        documents: chunks,
        fullContent: docs.map((d) => d.pageContent).join("\n"),
      };
    } catch (error) {
      console.error("Error processing file:", error);
      throw error;
    }
  }
}

class VectorStoreServiceLocal {
  static async createDocumentStore(
    documents: Document[],
    documentId: string,
    fileName: string,
    fileType: string,
    fileSize: number
  ): Promise<DocumentStore> {
    try {
      console.log(`Creating vector store for ${documents.length} chunks`);

      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY!,
        modelName: "text-embedding-3-small",
      });

      const vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        embeddings
      );

      // Extract chunks with embeddings for SQLite storage
      const chunks = [];
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        // Get the embedding for this document
        const embedding = await embeddings.embedQuery(doc.pageContent);

        chunks.push({
          text: doc.pageContent,
          index: i,
          embedding: embedding,
          metadata: {
            ...doc.metadata,
            chunkIndex: i,
          },
        });
      }

      const documentStoreData = {
        documentId,
        originalContent: documents.map((doc) => doc.pageContent).join("\n"),
        chunks: chunks,
        metadata: {
          fileName,
          fileType,
          fileSize,
          uploadDate: new Date(),
          chunkCount: documents.length,
        },
      };

      VectorStoreService.setDocumentStore(documentId, documentStoreData);
      console.log(`Vector store created and stored with ID: ${documentId}`);

      // Return the original format for compatibility
      const documentStore: DocumentStore = {
        id: documentId,
        vectorStore,
        originalContent: documentStoreData.originalContent,
        metadata: documentStoreData.metadata,
      };

      return documentStore;
    } catch (error) {
      console.error("Error creating vector store:", error);
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Upload endpoint called");

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log(
      `File received: ${file.name}, size: ${file.size}, type: ${file.type}`
    );

    // Validate type
    if (!loaderMap[file.type]) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.",
        },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = path.join(uploadsDir, `${timestamp}_${safeName}`);

    fs.writeFileSync(filePath, buffer);

    const documentId = `doc_${timestamp}_${safeName.replace(/\s+/g, "_")}`;
    console.log(`Generated document ID: ${documentId}`);

    try {
      const { documents, fullContent } = await DocumentProcessor.processFile(
        filePath,
        file.name,
        file.type,
        file.size
      );

      const documentStore = await VectorStoreServiceLocal.createDocumentStore(
        documents,
        documentId,
        file.name,
        file.type,
        file.size
      );

      // cleanup temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return NextResponse.json({
        message: "File processed successfully",
        documentId,
        fileName: file.name,
        chunksCreated: documents.length,
        contentPreview: fullContent.substring(0, 200) + "...",
        metadata: documentStore.metadata,
        success: true,
      });
    } catch (processingError) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
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
