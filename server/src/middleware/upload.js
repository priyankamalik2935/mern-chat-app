import multer from "multer";
import path from "path";
import fs from "fs";
import env from "../config/env.js";


const uploadDir = path.join(process.cwd(), env.UPLOAD_PATH);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});


const fileFilter = (req, file, cb) => {
  const allowedImages = /jpeg|jpg|png|gif|webp/;
  const allowedFiles = /pdf|doc|docx|txt|zip/;

  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  const mimetype = file.mimetype;

  if (
    allowedImages.test(ext) ||
    allowedFiles.test(ext) ||
    mimetype.startsWith("image/") ||
    mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}`), false);
  }
};


export const uploadAvatar = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    if (isImage) cb(null, true);
    else cb(new Error("Only image files are allowed for avatar"), false);
  },
}).single("avatar");


export const uploadAttachments = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE, files: 5 },
  fileFilter,
}).array("attachments", 5);


export const uploadSingle = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter,
}).single("file");


export const buildFileUrl = (req, file) => {
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}/${env.UPLOAD_PATH}/${file.filename}`;
};
