const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EduKendra Backend is running 🚀'
  });
});

app.use('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working ✅' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/users', require('./routes/users'));
app.use('/api/uploads', require('./routes/uploads')); // Add uploads route

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');

    // Create uploads directory if it doesn't exist
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, 'uploads');
    const videosDir = path.join(uploadsDir, 'videos');
    const materialsDir = path.join(uploadsDir, 'materials');
    
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir);
    if (!fs.existsSync(materialsDir)) fs.mkdirSync(materialsDir);

    app.listen(PORT, () => {
      console.log('\n🎉 ==================================');
      console.log('🚀 EduKendra Backend Server Started!');
      console.log('📡 Port:', PORT);
      console.log('🌐 URL: http://localhost:' + PORT);
      console.log('🔄 Environment:', process.env.NODE_ENV || 'development');
      console.log('📁 Uploads available at: http://localhost:' + PORT + '/uploads');
      console.log('==================================\n');
      
      console.log('📋 Available Routes:');
      console.log('   GET  /              - Server status');
      console.log('   GET  /api/test      - Test endpoint');
      console.log('   POST /api/auth/register - User registration');
      console.log('   POST /api/auth/login    - User login');
      console.log('   GET  /api/auth/me       - Get current user');
      console.log('   GET  /api/courses       - Get all courses');
      console.log('   GET  /api/users/enrolled-courses - Get user courses');
      console.log('   POST /api/uploads/video - Upload video file');
      console.log('   POST /api/uploads/material - Upload material file');
    });
  })
  .catch(error => {
    console.error('❌ MongoDB connection error:', error);
  });