import { Hono } from "hono";
import { uploadDocument, listDocumentsForJob, getSignedUrl, deleteDocument } from "../controllers/documents";

const documents = new Hono();

// Upload expects multipart/form-data with fields per uploadSchema and a File under key "file"
documents.post("/upload", uploadDocument);

// List all docs for a job
documents.get("/job/:jobType/:jobId", listDocumentsForJob);

// Signed URL by document row id (query: ?id=...&expires=3600)
documents.get("/signed-url", getSignedUrl);

// Delete document by id (removes from storage and row)
documents.delete(":id", deleteDocument);

export default documents;
