const express = require('express');
const Course = require('../models/Course');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @route   GET /api/courses
// @desc    Get all published courses
// @access  Public
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true, isApproved: true })
      .populate('instructor', 'name profilePicture')
      .select('title subtitle description instructor category price originalPrice isFree thumbnail totalHours level averageRating totalStudents hasAssignments hasMaterials')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching courses' 
    });
  }
});

// @route   GET /api/courses/:id
// @desc    Get single course
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name profilePicture bio')
      .populate('ratings.user', 'name profilePicture');

    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }

    // Only return full course details if published and approved, or if user is instructor/admin
    if (!course.isPublished || !course.isApproved) {
      // Check if user is instructor or admin (you might want to add auth middleware here)
      return res.status(403).json({
        success: false,
        message: 'Course is not available'
      });
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Get course error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching course' 
    });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course
// @access  Private
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if course exists and is published
    const course = await Course.findOne({ 
      _id: id, 
      isPublished: true, 
      isApproved: true 
    });

    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found or not available for enrollment' 
      });
    }

    const user = await User.findById(req.user._id);
    
    // Check if already enrolled
    const alreadyEnrolled = user.enrolledCourses.some(
      enrollment => enrollment.course.toString() === id
    );

    if (alreadyEnrolled) {
      return res.status(400).json({ 
        success: false,
        message: 'You are already enrolled in this course' 
      });
    }

    // For paid courses, check if user has paid (in real app, you'd check payment status)
    if (!course.isFree && course.price > 0) {
      // In a real application, you would check payment status here
      // For now, we'll allow enrollment but in production you'd integrate with payment gateway
      console.log(`User ${user.email} enrolling in paid course: ${course.title}`);
    }

    // Add to user's enrolled courses
    user.enrolledCourses.push({
      course: id,
      progress: 0,
      completed: false,
      enrolledAt: new Date(),
      lastAccessed: new Date()
    });

    await user.save();

    // Add to course's students if not already there
    if (!course.studentsEnrolled.includes(req.user._id)) {
      course.studentsEnrolled.push(req.user._id);
      await course.save();
    }

    // Populate the course details for response
    await user.populate({
      path: 'enrolledCourses.course',
      select: 'title subtitle thumbnail instructor totalHours level'
    });

    const enrolledCourse = user.enrolledCourses.find(e => e.course._id.toString() === id);

    res.json({ 
      success: true,
      message: `Successfully enrolled in "${course.title}"!`,
      enrolledCourse: {
        ...enrolledCourse.toObject(),
        course: enrolledCourse.course
      }
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error during enrollment' 
    });
  }
});

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Instructors only)
router.post('/', auth, upload.single('thumbnail'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.role !== 'instructor' && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Instructor role required to create courses.' 
      });
    }

    const courseData = {
      ...req.body,
      instructor: req.user._id,
      thumbnail: req.file ? req.file.path : req.body.thumbnail || ''
    };

    // Parse sections if they are sent as JSON string
    if (typeof courseData.sections === 'string') {
      courseData.sections = JSON.parse(courseData.sections);
    }

    // Set originalPrice if not provided
    if (!courseData.originalPrice && courseData.price > 0) {
      courseData.originalPrice = Math.round(courseData.price * 1.2); // 20% more as original price
    }

    const course = new Course(courseData);
    await course.save();

    // Populate instructor details
    await course.populate('instructor', 'name profilePicture');
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: errors.join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error creating course' 
    });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Private (Instructors only)
router.put('/:id', auth, upload.single('thumbnail'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.role !== 'instructor' && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied.' 
      });
    }

    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found' 
      });
    }

    // Check if user is the course instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only update your own courses.' 
      });
    }

    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.thumbnail = req.file.path;
    }

    // Parse sections if they are sent as JSON string
    if (typeof updateData.sections === 'string') {
      updateData.sections = JSON.parse(updateData.sections);
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('instructor', 'name profilePicture');

    res.json({
      success: true,
      message: 'Course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating course' 
    });
  }
});

// @route   GET /api/courses/instructor/my-courses
// @desc    Get courses created by instructor
// @access  Private (Instructors only)
router.get('/instructor/my-courses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.role !== 'instructor' && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied.' 
      });
    }

    const courses = await Course.find({ instructor: req.user._id })
      .select('title subtitle thumbnail price totalStudents averageRating isPublished isApproved createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    console.error('Get instructor courses error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching courses' 
    });
  }
});

module.exports = router;