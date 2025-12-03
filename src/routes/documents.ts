import { Hono } from "hono";
import { uploadDocument, listDocumentsForJob, listDocumentsForDropCable, listDocumentsForLinkBuild, getSignedUrl, deleteDocument, getHappyLetterTemplate } from "../controllers/documents";

const documents = new Hono();

// Upload expects multipart/form-data with fields per uploadSchema and a File under key "file"
documents.post("/upload", uploadDocument);

// List all docs for a job - standard route
documents.get("/job/:jobType/:jobId", listDocumentsForJob);

// Convenience aliases for cleaner URLs
documents.get("/drop-cable/:jobId", listDocumentsForDropCable);
documents.get("/link-build/:jobId", listDocumentsForLinkBuild);

// Signed URL by document row id (query: ?id=...&expires=3600)
documents.get("/signed-url", getSignedUrl);

// Get signed URL for the happy letter template in storage
documents.get("/template/happy-letter", getHappyLetterTemplate);

// Delete document by id (removes from storage and row)
documents.delete(":id", deleteDocument);

export default documents;
