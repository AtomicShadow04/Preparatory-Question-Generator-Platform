import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const storePath = path.join(dataDir, "document-stores.json");

export class VectorStoreService {
  static getDocumentStore(documentId: string): any | undefined {
    try {
      if (!fs.existsSync(storePath)) {
        return undefined;
      }

      const data = fs.readFileSync(storePath, "utf-8");
      const stores = JSON.parse(data);
      return stores[documentId];
    } catch (error) {
      console.error("Error reading document store:", error);
      return undefined;
    }
  }

  static setDocumentStore(documentId: string, store: any): void {
    try {
      let stores: Record<string, any> = {};
      if (fs.existsSync(storePath)) {
        const data = fs.readFileSync(storePath, "utf-8");
        stores = JSON.parse(data);
      }

      stores[documentId] = store;
      fs.writeFileSync(storePath, JSON.stringify(stores, null, 2));
    } catch (error) {
      console.error("Error writing document store:", error);
    }
  }

  static deleteDocumentStore(documentId: string): boolean {
    try {
      if (!fs.existsSync(storePath)) {
        return false;
      }

      const data = fs.readFileSync(storePath, "utf-8");
      const stores: Record<string, any> = JSON.parse(data);

      if (stores[documentId]) {
        delete stores[documentId];
        fs.writeFileSync(storePath, JSON.stringify(stores, null, 2));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting document store:", error);
      return false;
    }
  }
}
