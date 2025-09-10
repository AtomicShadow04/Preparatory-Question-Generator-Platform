import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "vector_store.db");

export class VectorStoreService {
  private static db: Database.Database | null = null;

  private static getDatabase(): Database.Database {
    if (!this.db) {
      this.db = new Database(dbPath);

      // Create tables if they don't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS document_stores (
          document_id TEXT PRIMARY KEY,
          original_content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vector_chunks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id TEXT NOT NULL,
          chunk_text TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          embedding TEXT, -- JSON string of the vector embedding
          metadata TEXT, -- JSON string of additional metadata
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES document_stores (document_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_vector_chunks_document_id ON vector_chunks (document_id);
        CREATE INDEX IF NOT EXISTS idx_vector_chunks_index ON vector_chunks (chunk_index);
      `);
    }
    return this.db;
  }

  static getDocumentStore(documentId: string): any | undefined {
    try {
      const db = this.getDatabase();

      // Get document store metadata
      const docStmt = db.prepare(
        "SELECT * FROM document_stores WHERE document_id = ?"
      );
      const document = docStmt.get(documentId) as any;

      if (!document) {
        return undefined;
      }

      // Get all chunks for this document
      const chunksStmt = db.prepare(`
        SELECT chunk_text, chunk_index, embedding, metadata
        FROM vector_chunks
        WHERE document_id = ?
        ORDER BY chunk_index
      `);
      const chunks = chunksStmt.all(documentId) as any[];

      // Reconstruct the vector store object
      const vectorStore = {
        documentId: document.document_id,
        originalContent: document.original_content,
        chunks: chunks.map((chunk) => ({
          text: chunk.chunk_text,
          index: chunk.chunk_index,
          embedding: chunk.embedding ? JSON.parse(chunk.embedding) : null,
          metadata: chunk.metadata ? JSON.parse(chunk.metadata) : {},
        })),
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      };

      return vectorStore;
    } catch (error) {
      console.error("Error reading document store:", error);
      return undefined;
    }
  }

  static setDocumentStore(documentId: string, store: any): void {
    try {
      const db = this.getDatabase();

      // Begin transaction
      const transaction = db.transaction(() => {
        // Insert or replace document store metadata
        const docStmt = db.prepare(`
          INSERT OR REPLACE INTO document_stores (document_id, original_content, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `);
        docStmt.run(documentId, store.originalContent || "");

        // Delete existing chunks for this document
        const deleteStmt = db.prepare(
          "DELETE FROM vector_chunks WHERE document_id = ?"
        );
        deleteStmt.run(documentId);

        // Insert new chunks
        if (store.chunks && Array.isArray(store.chunks)) {
          const chunkStmt = db.prepare(`
            INSERT INTO vector_chunks (document_id, chunk_text, chunk_index, embedding, metadata)
            VALUES (?, ?, ?, ?, ?)
          `);

          for (const chunk of store.chunks) {
            chunkStmt.run(
              documentId,
              chunk.text || "",
              chunk.index || 0,
              chunk.embedding ? JSON.stringify(chunk.embedding) : null,
              chunk.metadata ? JSON.stringify(chunk.metadata) : "{}"
            );
          }
        }
      });

      transaction();
    } catch (error) {
      console.error("Error writing document store:", error);
    }
  }

  static deleteDocumentStore(documentId: string): boolean {
    try {
      const db = this.getDatabase();

      // Delete document store (chunks will be deleted automatically due to CASCADE)
      const stmt = db.prepare(
        "DELETE FROM document_stores WHERE document_id = ?"
      );
      const result = stmt.run(documentId);

      return result.changes > 0;
    } catch (error) {
      console.error("Error deleting document store:", error);
      return false;
    }
  }

  static closeDatabase(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Utility method to get all document IDs
  static getAllDocumentIds(): string[] {
    try {
      const db = this.getDatabase();
      const stmt = db.prepare(
        "SELECT document_id FROM document_stores ORDER BY created_at DESC"
      );
      const rows = stmt.all() as any[];
      return rows.map((row) => row.document_id);
    } catch (error) {
      console.error("Error getting document IDs:", error);
      return [];
    }
  }

  // Utility method to get database stats
  static getDatabaseStats(): any {
    try {
      const db = this.getDatabase();
      const docCount = db
        .prepare("SELECT COUNT(*) as count FROM document_stores")
        .get() as any;
      const chunkCount = db
        .prepare("SELECT COUNT(*) as count FROM vector_chunks")
        .get() as any;

      return {
        totalDocuments: docCount.count,
        totalChunks: chunkCount.count,
        databasePath: dbPath,
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      return null;
    }
  }
}
