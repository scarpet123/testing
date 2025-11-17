const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure storage for videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const videosDir = 'uploads/videos/';
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + fileExtension);
  }
});

// Configure storage for materials
const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const materialsDir = 'uploads/materials/';
    if (!fs.existsSync(materialsDir)) {
      fs.mkdirSync(materialsDir, { recursive: true });
    }
    cb(null, materialsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'material-' + uniqueSuffix + fileExtension);
  }
});

// Configure storage for assignment files
const assignmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const assignmentsDir = 'uploads/assignments/';
    if (!fs.existsSync(assignmentsDir)) {
      fs.mkdirSync(assignmentsDir, { recursive: true });
    }
    cb(null, assignmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'assignment-' + uniqueSuffix + fileExtension);
  }
});

// Configure storage for submission files
const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const submissionsDir = 'uploads/submissions/';
    if (!fs.existsSync(submissionsDir)) {
      fs.mkdirSync(submissionsDir, { recursive: true });
    }
    cb(null, submissionsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'submission-' + uniqueSuffix + fileExtension);
  }
});

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files (MP4, MOV, AVI, MKV, WEBM) are allowed'), false);
  }
};

// File filter for materials
const materialFileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only document files (PDF, DOC, DOCX, PPT, PPTX, TXT, ZIP) are allowed'), false);
  }
};

// File filter for assignment files
const assignmentFileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.jpg', '.jpeg', '.png'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only document and image files (PDF, DOC, DOCX, TXT, ZIP, JPG, PNG) are allowed'), false);
  }
};

// File filter for submission files
const submissionFileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.jpg', '.jpeg', '.png'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only document and image files (PDF, DOC, DOCX, TXT, ZIP, JPG, PNG) are allowed'), false);
  }
};

// Configure multer instances
const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for videos
  }
});

const uploadMaterial = multer({
  storage: materialStorage,
  fileFilter: materialFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for materials
  }
});

const uploadAssignment = multer({
  storage: assignmentStorage,
  fileFilter: assignmentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for assignments
  }
});

const uploadSubmission = multer({
  storage: submissionStorage,
  fileFilter: submissionFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for submissions
  }
});

// Upload video endpoint
router.post('/video', uploadVideo.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: error.message
    });
  }
});

// Upload material endpoint
router.post('/material', uploadMaterial.single('material'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No material file uploaded'
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/materials/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Material uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Material upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload material',
      error: error.message
    });
  }
});

// Upload assignment file endpoint
router.post('/assignment', uploadAssignment.single('assignment'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No assignment file uploaded'
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/assignments/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Assignment file uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Assignment upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload assignment file',
      error: error.message
    });
  }
});

// Upload submission file endpoint
router.post('/submission', uploadSubmission.single('submission'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No submission file uploaded'
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/submissions/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Submission uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Submission upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload submission',
      error: error.message
    });
  }
});

// Get uploaded files info (optional - for debugging)
router.get('/files', (req, res) => {
  try {
    const videosDir = 'uploads/videos';
    const materialsDir = 'uploads/materials';
    const assignmentsDir = 'uploads/assignments';
    const submissionsDir = 'uploads/submissions';
    
    const videoFiles = fs.existsSync(videosDir) ? fs.readdirSync(videosDir).map(file => ({
      name: file,
      type: 'video',
      url: `${req.protocol}://${req.get('host')}/uploads/videos/${file}`
    })) : [];
    
    const materialFiles = fs.existsSync(materialsDir) ? fs.readdirSync(materialsDir).map(file => ({
      name: file,
      type: 'material',
      url: `${req.protocol}://${req.get('host')}/uploads/materials/${file}`
    })) : [];
    
    const assignmentFiles = fs.existsSync(assignmentsDir) ? fs.readdirSync(assignmentsDir).map(file => ({
      name: file,
      type: 'assignment',
      url: `${req.protocol}://${req.get('host')}/uploads/assignments/${file}`
    })) : [];
    
    const submissionFiles = fs.existsSync(submissionsDir) ? fs.readdirSync(submissionsDir).map(file => ({
      name: file,
      type: 'submission',
      url: `${req.protocol}://${req.get('host')}/uploads/submissions/${file}`
    })) : [];

    res.json({
      success: true,
      videos: videoFiles,
      materials: materialFiles,
      assignments: assignmentFiles,
      submissions: submissionFiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reading uploads directory',
      error: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large'
      });
    }
  }
  res.status(400).json({
    success: false,
    message: error.message
  });
});

module.exports = router;