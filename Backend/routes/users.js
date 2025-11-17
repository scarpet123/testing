const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio, profilePicture } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePicture) updateData.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// @route   GET /api/users/enrolled-courses
// @desc    Get user's enrolled courses with details
// @access  Private
router.get('/enrolled-courses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'enrolledCourses.course',
        select: 'title subtitle thumbnail instructor totalHours level price',
        populate: {
          path: 'instructor',
          select: 'name profilePicture'
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Format the response
    const enrolledCourses = user.enrolledCourses.map(enrollment => ({
      _id: enrollment.course._id,
      title: enrollment.course.title,
      subtitle: enrollment.course.subtitle,
      thumbnail: enrollment.course.thumbnail,
      instructor: enrollment.course.instructor,
      totalHours: enrollment.course.totalHours,
      level: enrollment.course.level,
      price: enrollment.course.price,
      progress: enrollment.progress,
      completed: enrollment.completed,
      enrolledAt: enrollment.enrolledAt
    }));

    res.json({
      success: true,
      courses: enrolledCourses
    });
  } catch (error) {
    console.error('Get enrolled courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching enrolled courses'
    });
  }
});

// @route   PUT /api/users/course-progress/:courseId
// @desc    Update course progress
// @access  Private
router.put('/course-progress/:courseId', auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { progress, completed } = req.body;

    const user = await User.findById(req.user._id);
    
    const enrolledCourse = user.enrolledCourses.find(
      enrollment => enrollment.course.toString() === courseId
    );

    if (!enrolledCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in enrolled courses'
      });
    }

    // Update progress
    if (progress !== undefined) {
      enrolledCourse.progress = Math.min(Math.max(progress, 0), 100);
    }
    
    // Update completion status
    if (completed !== undefined) {
      enrolledCourse.completed = completed;
      if (completed) {
        enrolledCourse.progress = 100;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Progress updated successfully',
      progress: enrolledCourse.progress,
      completed: enrolledCourse.completed
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating progress'
    });
  }
});

// @route   GET /api/users/instructor-courses
// @desc    Get courses created by instructor
// @access  Private (Instructors only)
router.get('/instructor-courses', auth, async (req, res) => {
  try {
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Instructor role required.'
      });
    }

    const courses = await Course.find({ instructor: req.user._id })
      .select('title subtitle thumbnail price totalStudents averageRating isPublished createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Get instructor courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching instructor courses'
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get user learning statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('enrolledCourses.course');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const totalCourses = user.enrolledCourses.length;
    const completedCourses = user.enrolledCourses.filter(course => course.completed).length;
    const inProgressCourses = totalCourses - completedCourses;
    
    const totalProgress = user.enrolledCourses.reduce((sum, course) => sum + course.progress, 0);
    const averageProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;

    const totalLearningHours = user.enrolledCourses.reduce((sum, enrollment) => {
      const courseHours = enrollment.course?.totalHours || 0;
      return sum + (courseHours * (enrollment.progress / 100));
    }, 0);

    res.json({
      success: true,
      stats: {
        totalCourses,
        completedCourses,
        inProgressCourses,
        averageProgress,
        totalLearningHours: Math.round(totalLearningHours * 10) / 10
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user statistics'
    });
  }
});

// @route   GET /api/users/all
// @desc    Get all users (Admin only)
// @access  Private (Admin only)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// @route   DELETE /api/users/:userId
// @desc    Delete user (Admin only)
// @access  Private (Admin only)
router.delete('/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const user = await User.findByIdAndDelete(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
});

module.exports = router;