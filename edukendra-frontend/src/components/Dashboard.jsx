import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadService } from '../services/uploadService';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [showEditContentModal, setShowEditContentModal] = useState(false);
  const [showCourseStatsModal, setShowCourseStatsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [courseStats, setCourseStats] = useState(null);
  const [showExistingContent, setShowExistingContent] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [showViewAssignmentModal, setShowViewAssignmentModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [instructorReview, setInstructorReview] = useState('');
  const [pointsObtained, setPointsObtained] = useState(0);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [newCourseData, setNewCourseData] = useState({
    title: '',
    subtitle: '',
    description: '',
    category: 'web-development',
    price: 0,
    totalSeats: 50,
    level: 'Beginner',
    totalHours: 0,
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop'
  });

  const [newContent, setNewContent] = useState({
    type: 'lecture',
    title: '',
    description: '',
    duration: '',
    videoFile: null,
    materials: [],
    assignment: {
      title: '',
      description: '',
      instructions: '',
      points: 10,
      dueDate: '',
      file: null
    },
    quiz: {
      title: '',
      description: '',
      instructions: '',
      totalQuestions: 5,
      timeLimit: 10,
      points: 10,
      questions: []
    },
    materialFile: null
  });

  const thumbnailOptions = [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop'
  ];

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
      checkBackendAvailability();
    }
  }, [currentUser]);

  const checkBackendAvailability = async () => {
    const available = await uploadService.checkBackend();
    setBackendAvailable(available);
    console.log('Backend available:', available);
  };

  const fetchDashboardData = async () => {
    try {
      const userEnrollments = JSON.parse(localStorage.getItem(`user_enrollments_${currentUser._id}`) || '[]');
      
      // Get all courses from localStorage - REMOVE DEFAULT COURSES
      const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
      
      // Filter out any default/demo courses - only keep courses created by actual instructors
      const validCourses = allCourses.filter(course => 
        course._id && 
        course.title && 
        course.instructor && 
        course.instructor._id && 
        course.thumbnail &&
        // Ensure it's not a demo course by checking if it has proper structure
        (course.createdAt || course.lectures || course.assignments || course.quizzes || course.materials)
      );

      console.log('Valid courses found:', validCourses.length);

      const enrolledCoursesData = validCourses.filter(course => 
        userEnrollments.includes(course._id)
      ).map(course => {
        const userProgress = JSON.parse(localStorage.getItem(`user_progress_${currentUser._id}_${course._id}`) || '{}');
        const enrollmentDate = userProgress.enrolledAt ? new Date(userProgress.enrolledAt) : new Date();
        const currentDate = new Date();
        const daysSinceEnrollment = Math.floor((currentDate - enrollmentDate) / (1000 * 60 * 60 * 24));
        
        return {
          ...course,
          progress: userProgress.progress || 0,
          enrolledAt: userProgress.enrolledAt || new Date().toISOString(),
          canUnregister: daysSinceEnrollment <= 2 // Can unregister within 2 days
        };
      });

      let createdCoursesData = [];
      if (currentUser?.role === 'instructor') {
        createdCoursesData = validCourses.filter(course => 
          course.instructor?._id === currentUser._id
        );
      }

      // Only calculate stats for students
      let statsData = null;
      if (currentUser?.role === 'student') {
        const totalCourses = enrolledCoursesData.length;
        const completedCourses = enrolledCoursesData.filter(course => course.progress === 100).length;
        const inProgressCourses = totalCourses - completedCourses;
        const totalProgress = enrolledCoursesData.reduce((acc, course) => acc + course.progress, 0);
        const averageProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;
        const totalLearningHours = enrolledCoursesData.reduce((sum, course) => sum + course.totalHours, 0);

        statsData = {
          totalCourses,
          completedCourses,
          inProgressCourses,
          averageProgress,
          totalLearningHours: Math.round(totalLearningHours * 10) / 10
        };
      }

      const activityData = generateRecentActivity(enrolledCoursesData, currentUser);

      setEnrolledCourses(enrolledCoursesData);
      setCreatedCourses(createdCoursesData);
      setUserStats(statsData);
      setRecentActivity(activityData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setEnrolledCourses([]);
      setCreatedCourses([]);
      setRecentActivity([]);
      if (currentUser?.role === 'student') {
        setUserStats({
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          averageProgress: 0,
          totalLearningHours: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivity = (courses, user) => {
    const activities = [];
    
    if (courses.length > 0) {
      const latestEnrollment = courses[courses.length - 1];
      activities.push({
        type: 'enrollment',
        message: `You enrolled in "${latestEnrollment.title}"`,
        time: 'Recently',
        icon: '🎯'
      });

      if (courses[0].progress > 0) {
        activities.push({
          type: 'progress',
          message: `You're ${courses[0].progress}% through "${courses[0].title}"`,
          time: 'In progress',
          icon: '📚'
        });
      }
    }

    if (activities.length === 0) {
      activities.push({
        type: 'welcome',
        message: `${user.firstLogin ? 'Welcome to EduKendra' : 'Welcome back to EduKendra'}, ${user.name}! Start by exploring courses.`,
        time: 'Just now',
        icon: '👋'
      });
    }

    return activities.slice(0, 3);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleCreateCourse = () => {
    setShowCreateCourseModal(true);
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setNewCourseData({
      title: course.title,
      subtitle: course.subtitle || '',
      description: course.description || '',
      category: course.category || 'web-development',
      price: course.price || 0,
      totalSeats: course.totalSeats || 50,
      level: course.level || 'Beginner',
      totalHours: course.totalHours || 0,
      thumbnail: course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop'
    });
    setShowEditCourseModal(true);
  };

  const handleEditCourseSubmit = (e) => {
    e.preventDefault();
    
    if (!newCourseData.title.trim()) {
      alert('Please enter a course title');
      return;
    }

    try {
      const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
      const updatedCourses = allCourses.map(course => {
        if (course._id === editingCourse._id) {
          return {
            ...course,
            title: newCourseData.title,
            subtitle: newCourseData.subtitle,
            description: newCourseData.description,
            category: newCourseData.category,
            price: newCourseData.price,
            originalPrice: newCourseData.price > 0 ? Math.round(newCourseData.price * 1.2) : 0,
            isFree: newCourseData.price === 0,
            thumbnail: newCourseData.thumbnail,
            totalHours: newCourseData.totalHours,
            level: newCourseData.level,
            totalSeats: newCourseData.totalSeats,
            availableSeats: newCourseData.totalSeats - (course.studentsEnrolled || 0)
          };
        }
        return course;
      });

      localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
      setCreatedCourses(updatedCourses.filter(course => course.instructor?._id === currentUser._id));
      setShowEditCourseModal(false);
      setEditingCourse(null);
      
      alert('Course updated successfully!');
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Failed to update course. Please try again.');
    }
  };

  const handleAddContent = (course) => {
    setSelectedCourse(course);
    setNewContent({
      type: 'lecture',
      title: '',
      description: '',
      duration: '',
      videoFile: null,
      materials: [],
      assignment: {
        title: '',
        description: '',
        instructions: '',
        points: 10,
        dueDate: '',
        file: null
      },
      quiz: {
        title: '',
        description: '',
        instructions: '',
        totalQuestions: 5,
        timeLimit: 10,
        points: 10,
        questions: Array(5).fill().map(() => ({
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          explanation: ''
        }))
      },
      materialFile: null
    });
    setShowAddContentModal(true);
  };

  const handleEditContent = (course, contentType, content) => {
    setSelectedCourse(course);
    setSelectedContent({ type: contentType, data: content });
    
    if (contentType === 'lecture') {
      setNewContent({
        type: 'lecture',
        title: content.title,
        description: content.description,
        duration: content.duration,
        videoFile: null,
        materials: content.materials || [],
        assignment: { title: '', description: '', instructions: '', points: 10, dueDate: '', file: null },
        quiz: { title: '', description: '', instructions: '', totalQuestions: 5, timeLimit: 10, points: 10, questions: [] },
        materialFile: null
      });
    } else if (contentType === 'assignment') {
      setNewContent({
        type: 'assignment',
        title: '',
        description: '',
        duration: '',
        videoFile: null,
        materials: [],
        assignment: {
          title: content.title,
          description: content.description,
          instructions: content.instructions,
          points: content.points,
          dueDate: content.dueDate,
          file: content.file || null
        },
        quiz: { title: '', description: '', instructions: '', totalQuestions: 5, timeLimit: 10, points: 10, questions: [] },
        materialFile: null
      });
    } else if (contentType === 'quiz') {
      setNewContent({
        type: 'quiz',
        title: '',
        description: '',
        duration: '',
        videoFile: null,
        materials: [],
        assignment: { title: '', description: '', instructions: '', points: 10, dueDate: '', file: null },
        quiz: {
          title: content.title,
          description: content.description,
          instructions: content.instructions,
          totalQuestions: content.totalQuestions,
          timeLimit: content.timeLimit,
          points: content.points,
          questions: content.questions || Array(content.totalQuestions).fill().map(() => ({
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            explanation: ''
          }))
        },
        materialFile: null
      });
    } else if (contentType === 'material') {
      setNewContent({
        type: 'material',
        title: content.title,
        description: content.description,
        duration: '',
        videoFile: null,
        materials: [],
        assignment: { title: '', description: '', instructions: '', points: 10, dueDate: '', file: null },
        quiz: { title: '', description: '', instructions: '', totalQuestions: 5, timeLimit: 10, points: 10, questions: [] },
        materialFile: null
      });
    }
    
    setShowEditContentModal(true);
  };

  const handleViewStats = (course) => {
    setSelectedCourse(course);
    
    // Calculate course statistics
    const allSubmissions = [];
    let totalSubmissions = 0;
    
    // Get all assignment submissions for this course
    if (course.assignments) {
      course.assignments.forEach(assignment => {
        const submissions = JSON.parse(localStorage.getItem(`assignment_submissions_${assignment.id}`) || '[]');
        totalSubmissions += submissions.length;
        allSubmissions.push(...submissions.map(sub => ({
          ...sub,
          assignmentTitle: assignment.title
        })));
      });
    }
    
    const stats = {
      totalStudents: course.studentsEnrolled || 0,
      totalAssignments: course.assignments?.length || 0,
      totalSubmissions,
      totalQuizzes: course.quizzes?.length || 0,
      totalMaterials: course.materials?.length || 0,
      recentSubmissions: allSubmissions.slice(0, 5) // Show last 5 submissions
    };
    
    setCourseStats(stats);
    setShowCourseStatsModal(true);
  };

  // New function to handle viewing assignment submissions
  const handleViewAssignmentSubmissions = (course, assignment) => {
    setSelectedCourse(course);
    setSelectedAssignment(assignment);
    setShowViewAssignmentModal(true);
  };

  // New function to handle grading assignment
  const handleGradeAssignment = (submission) => {
    setSelectedSubmission(submission);
    setInstructorReview(submission.instructorReview || '');
    setPointsObtained(submission.pointsObtained || 0);
    setShowGradeModal(true);
  };

  // New function to save grade and review
  const handleSaveGrade = () => {
    if (!selectedSubmission || !selectedAssignment) return;

    const submissions = JSON.parse(localStorage.getItem(`assignment_submissions_${selectedAssignment.id}`) || '[]');
    const updatedSubmissions = submissions.map(sub => 
      sub.studentId === selectedSubmission.studentId 
        ? {
            ...sub,
            pointsObtained: pointsObtained,
            instructorReview: instructorReview,
            gradedAt: new Date().toISOString(),
            status: 'graded'
          }
        : sub
    );

    localStorage.setItem(`assignment_submissions_${selectedAssignment.id}`, JSON.stringify(updatedSubmissions));

    // Update the course assignments in all_courses
    const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
    const updatedCourses = allCourses.map(c => {
      if (c._id === selectedCourse._id && c.assignments) {
        const updatedAssignments = c.assignments.map(a => {
          if (a.id === selectedAssignment.id) {
            const studentSubmission = updatedSubmissions.find(sub => sub.studentId === selectedSubmission.studentId);
            return {
              ...a,
              submission: studentSubmission || a.submission
            };
          }
          return a;
        });
        return { ...c, assignments: updatedAssignments };
      }
      return c;
    });
    localStorage.setItem('all_courses', JSON.stringify(updatedCourses));

    alert('Grade and review saved successfully!');
    setShowGradeModal(false);
    setShowViewAssignmentModal(false);
  };

  // Check if submission is late
  const isSubmissionLate = (submission, assignment) => {
    if (!assignment.dueDate) return false;
    const dueDate = new Date(assignment.dueDate);
    const submittedDate = new Date(submission.submittedAt);
    return submittedDate > dueDate;
  };

  const handleUnregisterCourse = (courseId) => {
    const course = enrolledCourses.find(c => c._id === courseId);
    
    // Show refund prompt for paid courses
    if (course && course.price > 0) {
      const confirmMessage = `Are you sure you want to unregister from this course?\n\n💰 Refund Notice: Since this is a paid course, the amount of ${formatPrice(course.price)} will be refunded to your original payment method within 7 working days.\n\n⚠️ Your progress and all course data will be permanently deleted.`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      // For free courses, use the original confirmation
      if (!window.confirm('Are you sure you want to unregister from this course? This action cannot be undone.')) {
        return;
      }
    }

    const userEnrollments = JSON.parse(localStorage.getItem(`user_enrollments_${currentUser._id}`) || '[]');
    const updatedEnrollments = userEnrollments.filter(id => id !== courseId);
    localStorage.setItem(`user_enrollments_${currentUser._id}`, JSON.stringify(updatedEnrollments));
    
    // Remove user progress
    localStorage.removeItem(`user_progress_${currentUser._id}_${courseId}`);
    
    // Update available seats
    const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
    const updatedCourses = allCourses.map(course => 
      course._id === courseId 
        ? { 
            ...course, 
            availableSeats: course.availableSeats + 1,
            studentsEnrolled: Math.max(0, (course.studentsEnrolled || 0) - 1)
          }
        : course
    );
    localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
    
    fetchDashboardData(); // Refresh data
    
    // Show success message with refund info for paid courses
    if (course && course.price > 0) {
      alert(`Successfully unregistered from the course!\n\n💰 Refund of ${formatPrice(course.price)} will be processed to your original payment method within 7 working days.`);
    } else {
      alert('Successfully unregistered from the course!');
    }
  };

  const handleNewCourseChange = (e) => {
    const { name, value } = e.target;
    setNewCourseData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'totalSeats' || name === 'totalHours' ? Number(value) : value
    }));
  };

  const handleNewContentChange = (e) => {
    const { name, value } = e.target;
    setNewContent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    // For small files or when backend is not available, use the old method
    // Only use local storage if backend is completely unavailable
    if (!backendAvailable) {
      if (field === 'videoFile') {
        setNewContent(prev => ({ ...prev, videoFile: file }));
      } else if (field === 'materialFile') {
        setNewContent(prev => ({ ...prev, materialFile: file }));
      }
      return;
    }

    // Use backend upload for larger files
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let uploadResult;
      
      if (field === 'videoFile') {
        uploadResult = await uploadService.uploadVideo(file);
      } else if (field === 'materialFile') {
        uploadResult = await uploadService.uploadMaterial(file);
      }

      if (uploadResult.success) {
        // Store the backend file URL instead of the File object
        const uploadedFile = {
          name: uploadResult.file.originalName,
          size: uploadResult.file.size,
          type: uploadResult.file.mimetype,
          url: uploadResult.file.url // This is the permanent URL from backend
        };

        if (field === 'videoFile') {
          setNewContent(prev => ({ ...prev, videoFile: uploadedFile }));
        } else if (field === 'materialFile') {
          setNewContent(prev => ({ ...prev, materialFile: uploadedFile }));
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      
      // Fallback to local storage
      if (field === 'videoFile') {
        setNewContent(prev => ({ ...prev, videoFile: file }));
      } else if (field === 'materialFile') {
        setNewContent(prev => ({ ...prev, materialFile: file }));
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCustomThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewCourseData(prev => ({
          ...prev,
          thumbnail: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAssignmentFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const uploadResult = await uploadService.uploadAssignment(file);
      
      if (uploadResult.success) {
        const uploadedFile = {
          name: uploadResult.file.originalName,
          size: uploadResult.file.size,
          type: uploadResult.file.mimetype,
          url: uploadResult.file.url,
          isLocal: false
        };
        
        setNewContent(prev => ({
          ...prev,
          assignment: {
            ...prev.assignment,
            file: uploadedFile
          }
        }));
      }
    } catch (error) {
      console.error('Assignment file upload failed:', error);
      // Fallback to local file
      setNewContent(prev => ({
        ...prev,
        assignment: {
          ...prev.assignment,
          file: file
        }
      }));
    }
  };

  const handleAssignmentChange = (e) => {
    const { name, value } = e.target;
    setNewContent(prev => ({
      ...prev,
      assignment: {
        ...prev.assignment,
        [name]: name === 'points' ? Number(value) : value
      }
    }));
  };

  const handleQuizChange = (e) => {
    const { name, value } = e.target;
    if (name === 'totalQuestions') {
      const totalQuestions = parseInt(value) || 5;
      const currentQuestions = newContent.quiz.questions || [];
      const newQuestions = Array(totalQuestions).fill().map((_, index) => 
        currentQuestions[index] || {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          explanation: ''
        }
      );
      
      setNewContent(prev => ({
        ...prev,
        quiz: {
          ...prev.quiz,
          totalQuestions,
          questions: newQuestions
        }
      }));
    } else {
      setNewContent(prev => ({
        ...prev,
        quiz: {
          ...prev.quiz,
          [name]: name === 'timeLimit' || name === 'points' ? Number(value) : value
        }
      }));
    }
  };

  const handleQuizQuestionChange = (questionIndex, field, value, optionIndex = null) => {
    setNewContent(prev => {
      const updatedQuestions = [...prev.quiz.questions];
      if (optionIndex !== null) {
        updatedQuestions[questionIndex].options[optionIndex] = value;
      } else if (field === 'correctAnswer') {
        updatedQuestions[questionIndex].correctAnswer = parseInt(value);
      } else {
        updatedQuestions[questionIndex][field] = value;
      }
      return {
        ...prev,
        quiz: {
          ...prev.quiz,
          questions: updatedQuestions
        }
      };
    });
  };

  const handleThumbnailSelect = (thumbnailUrl) => {
    setNewCourseData(prev => ({
      ...prev,
      thumbnail: thumbnailUrl
    }));
  };

  const handleCreateCourseSubmit = (e) => {
    e.preventDefault();
    
    if (!newCourseData.title.trim()) {
      alert('Please enter a course title');
      return;
    }

    try {
      // Create a simple course object first
      const newCourse = {
        _id: Date.now().toString(),
        title: newCourseData.title,
        subtitle: newCourseData.subtitle || '',
        description: newCourseData.description || '',
        category: newCourseData.category,
        price: newCourseData.price || 0,
        originalPrice: newCourseData.price > 0 ? Math.round(newCourseData.price * 1.2) : 0,
        isFree: newCourseData.price === 0,
        thumbnail: newCourseData.thumbnail,
        instructor: { 
          name: currentUser.name,
          _id: currentUser._id
        },
        totalHours: newCourseData.totalHours || 0,
        level: newCourseData.level,
        totalSeats: newCourseData.totalSeats || 50,
        availableSeats: newCourseData.totalSeats || 50,
        hasAssignments: false,
        hasMaterials: false,
        studentsEnrolled: 0,
        averageRating: 0,
        totalStudents: 0,
        isPublished: false,
        createdAt: new Date().toISOString(),
        lectures: [],
        assignments: [],
        quizzes: [],
        materials: []
      };

      // Get existing courses
      let allCourses = [];
      try {
        const coursesData = localStorage.getItem('all_courses');
        if (coursesData) {
          allCourses = JSON.parse(coursesData);
        }
      } catch (error) {
        console.error('Error reading courses from localStorage:', error);
        allCourses = [];
      }
      
      // Add new course
      allCourses.push(newCourse);
      
      // Save back to localStorage
      localStorage.setItem('all_courses', JSON.stringify(allCourses));
      
      // Update state
      setCreatedCourses(prev => [...prev, newCourse]);
      setShowCreateCourseModal(false);
      
      // Reset form
      setNewCourseData({
        title: '',
        subtitle: '',
        description: '',
        category: 'web-development',
        price: 0,
        totalSeats: 50,
        level: 'Beginner',
        totalHours: 0,
        thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop'
      });
      
      alert('Course created successfully! You can now manage it from your instructor dashboard.');
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course. Please check the console for details.');
    }
  };

  const handleAddContentSubmit = (e) => {
    e.preventDefault();
    
    // Validate based on content type
    if (newContent.type === 'lecture' && !newContent.title.trim()) {
      alert('Please enter lecture title');
      return;
    }

    if (newContent.type === 'assignment' && !newContent.assignment.title.trim()) {
      alert('Please enter assignment title');
      return;
    }

    if (newContent.type === 'quiz' && !newContent.quiz.title.trim()) {
      alert('Please enter quiz title');
      return;
    }

    if (newContent.type === 'material' && !newContent.title.trim()) {
      alert('Please enter material title');
      return;
    }

    // Validate quiz questions
    if (newContent.type === 'quiz') {
      for (let i = 0; i < newContent.quiz.questions.length; i++) {
        const q = newContent.quiz.questions[i];
        if (!q.question.trim()) {
          alert(`Please enter question ${i + 1}`);
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].trim()) {
            alert(`Please enter all options for question ${i + 1}`);
            return;
          }
        }
      }
    }

    try {
      const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
      const updatedCourses = allCourses.map(course => {
        if (course._id === selectedCourse._id) {
          const updatedCourse = { ...course };

          switch (newContent.type) {
            case 'lecture':
              let videoData = null;
              
              // Handle both File objects and backend uploaded files
              if (newContent.videoFile) {
                if (newContent.videoFile instanceof File) {
                  // Local file - create object URL
                  try {
                    const videoUrl = URL.createObjectURL(newContent.videoFile);
                    videoData = {
                      name: newContent.videoFile.name,
                      size: newContent.videoFile.size,
                      type: newContent.videoFile.type,
                      url: videoUrl,
                      isLocal: true // Mark as local file
                    };
                  } catch (error) {
                    console.error('Error creating object URL:', error);
                  }
                } else {
                  // Backend uploaded file - use the URL directly
                  videoData = {
                    ...newContent.videoFile,
                    isLocal: false // Mark as server file
                  };
                }
              }

              const lecture = {
                id: Date.now().toString(),
                title: newContent.title,
                description: newContent.description,
                duration: newContent.duration,
                videoFile: videoData,
                materials: newContent.materials,
                createdAt: new Date().toISOString()
              };
              updatedCourse.lectures = [...(updatedCourse.lectures || []), lecture];
              break;

            case 'assignment':
              let assignmentFileData = null;
              
              // Handle assignment file upload
              if (newContent.assignment.file) {
                if (newContent.assignment.file instanceof File) {
                  try {
                    const fileUrl = URL.createObjectURL(newContent.assignment.file);
                    assignmentFileData = {
                      name: newContent.assignment.file.name,
                      size: newContent.assignment.file.size,
                      type: newContent.assignment.file.type,
                      url: fileUrl,
                      isLocal: true
                    };
                  } catch (error) {
                    console.error('Error creating object URL:', error);
                  }
                } else {
                  assignmentFileData = {
                    ...newContent.assignment.file,
                    isLocal: false
                  };
                }
              }

              const assignment = {
                id: Date.now().toString(),
                title: newContent.assignment.title,
                description: newContent.assignment.description,
                instructions: newContent.assignment.instructions,
                points: parseInt(newContent.assignment.points),
                dueDate: newContent.assignment.dueDate,
                file: assignmentFileData,
                submitted: false,
                createdAt: new Date().toISOString()
              };
              updatedCourse.assignments = [...(updatedCourse.assignments || []), assignment];
              updatedCourse.hasAssignments = true;
              break;

            case 'quiz':
              const quiz = {
                id: Date.now().toString(),
                title: newContent.quiz.title,
                description: newContent.quiz.description,
                instructions: newContent.quiz.instructions,
                totalQuestions: parseInt(newContent.quiz.totalQuestions),
                timeLimit: parseInt(newContent.quiz.timeLimit),
                points: parseInt(newContent.quiz.points),
                questions: newContent.quiz.questions,
                attempted: false,
                bestScore: 0,
                createdAt: new Date().toISOString()
              };
              updatedCourse.quizzes = [...(updatedCourse.quizzes || []), quiz];
              break;

            case 'material':
              let materialData = null;
              
              // Handle both File objects and backend uploaded files
              if (newContent.materialFile) {
                if (newContent.materialFile instanceof File) {
                  // Local file
                  try {
                    const materialUrl = URL.createObjectURL(newContent.materialFile);
                    materialData = {
                      name: newContent.materialFile.name,
                      size: newContent.materialFile.size,
                      type: newContent.materialFile.type,
                      url: materialUrl,
                      isLocal: true
                    };
                  } catch (error) {
                    console.error('Error creating object URL:', error);
                  }
                } else {
                  // Backend uploaded file
                  materialData = {
                    ...newContent.materialFile,
                    isLocal: false
                  };
                }
              }

              const material = {
                id: Date.now().toString(),
                title: newContent.title,
                description: newContent.description,
                type: newContent.materialFile ? newContent.materialFile.type.split('/')[1] : 'pdf',
                size: newContent.materialFile ? (newContent.materialFile.size / (1024 * 1024)).toFixed(2) + ' MB' : '2.5 MB',
                file: materialData,
                uploaded: new Date().toISOString(),
                downloads: 0
              };
              updatedCourse.materials = [...(updatedCourse.materials || []), material];
              updatedCourse.hasMaterials = true;
              break;
          }

          return updatedCourse;
        }
        return course;
      });

      localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
      setCreatedCourses(updatedCourses.filter(course => course.instructor?._id === currentUser._id));
      setShowAddContentModal(false);
      setNewContent({
        type: 'lecture',
        title: '',
        description: '',
        duration: '',
        videoFile: null,
        materials: [],
        assignment: {
          title: '',
          description: '',
          instructions: '',
          points: 10,
          dueDate: '',
          file: null
        },
        quiz: {
          title: '',
          description: '',
          instructions: '',
          totalQuestions: 5,
          timeLimit: 10,
          points: 10,
          questions: Array(5).fill().map(() => ({
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            explanation: ''
          }))
        },
        materialFile: null
      });
      
      alert(`${newContent.type.charAt(0).toUpperCase() + newContent.type.slice(1)} added successfully!`);
    } catch (error) {
      console.error('Error adding content:', error);
      alert('Failed to add content. Please try again.');
    }
  };

  const handleEditContentSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedContent) return;

    try {
      const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
      const updatedCourses = allCourses.map(course => {
        if (course._id === selectedCourse._id) {
          const updatedCourse = { ...course };

          // Remove the old content
          switch (selectedContent.type) {
            case 'lecture':
              updatedCourse.lectures = updatedCourse.lectures?.filter(l => l.id !== selectedContent.data.id) || [];
              break;
            case 'assignment':
              updatedCourse.assignments = updatedCourse.assignments?.filter(a => a.id !== selectedContent.data.id) || [];
              break;
            case 'quiz':
              updatedCourse.quizzes = updatedCourse.quizzes?.filter(q => q.id !== selectedContent.data.id) || [];
              break;
            case 'material':
              updatedCourse.materials = updatedCourse.materials?.filter(m => m.id !== selectedContent.data.id) || [];
              break;
          }

          // Add the updated content
          switch (newContent.type) {
            case 'lecture':
              let videoData = selectedContent.data.videoFile;
              
              if (newContent.videoFile) {
                if (newContent.videoFile instanceof File) {
                  try {
                    const videoUrl = URL.createObjectURL(newContent.videoFile);
                    videoData = {
                      name: newContent.videoFile.name,
                      size: newContent.videoFile.size,
                      type: newContent.videoFile.type,
                      url: videoUrl,
                      isLocal: true
                    };
                  } catch (error) {
                    console.error('Error creating object URL:', error);
                  }
                } else {
                  videoData = {
                    ...newContent.videoFile,
                    isLocal: false
                  };
                }
              }

              const lecture = {
                ...selectedContent.data,
                title: newContent.title,
                description: newContent.description,
                duration: newContent.duration,
                materials: newContent.materials,
                videoFile: videoData
              };
              updatedCourse.lectures = [...(updatedCourse.lectures || []), lecture];
              break;

            case 'assignment':
              let assignmentFileData = selectedContent.data.file;
              
              if (newContent.assignment.file) {
                if (newContent.assignment.file instanceof File) {
                  try {
                    const fileUrl = URL.createObjectURL(newContent.assignment.file);
                    assignmentFileData = {
                      name: newContent.assignment.file.name,
                      size: newContent.assignment.file.size,
                      type: newContent.assignment.file.type,
                      url: fileUrl,
                      isLocal: true
                    };
                  } catch (error) {
                    console.error('Error creating object URL:', error);
                  }
                } else {
                  assignmentFileData = {
                    ...newContent.assignment.file,
                    isLocal: false
                  };
                }
              }

              const assignment = {
                ...selectedContent.data,
                title: newContent.assignment.title,
                description: newContent.assignment.description,
                instructions: newContent.assignment.instructions,
                points: parseInt(newContent.assignment.points),
                dueDate: newContent.assignment.dueDate,
                file: assignmentFileData
              };
              updatedCourse.assignments = [...(updatedCourse.assignments || []), assignment];
              break;

            case 'quiz':
              const quiz = {
                ...selectedContent.data,
                title: newContent.quiz.title,
                description: newContent.quiz.description,
                instructions: newContent.quiz.instructions,
                totalQuestions: parseInt(newContent.quiz.totalQuestions),
                timeLimit: parseInt(newContent.quiz.timeLimit),
                points: parseInt(newContent.quiz.points),
                questions: newContent.quiz.questions
              };
              updatedCourse.quizzes = [...(updatedCourse.quizzes || []), quiz];
              break;

            case 'material':
              let materialData = selectedContent.data.file;
              
              if (newContent.materialFile) {
                if (newContent.materialFile instanceof File) {
                  try {
                    const materialUrl = URL.createObjectURL(newContent.materialFile);
                    materialData = {
                      name: newContent.materialFile.name,
                      size: newContent.materialFile.size,
                      type: newContent.materialFile.type,
                      url: materialUrl,
                      isLocal: true
                    };
                  } catch (error) {
                    console.error('Error creating object URL:', error);
                  }
                } else {
                  materialData = {
                    ...newContent.materialFile,
                    isLocal: false
                  };
                }
              }

              const material = {
                ...selectedContent.data,
                title: newContent.title,
                description: newContent.description,
                file: materialData
              };
              updatedCourse.materials = [...(updatedCourse.materials || []), material];
              break;
          }

          return updatedCourse;
        }
        return course;
      });

      localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
      setCreatedCourses(updatedCourses.filter(course => course.instructor?._id === currentUser._id));
      setShowEditContentModal(false);
      setSelectedContent(null);
      
      alert(`${selectedContent.type.charAt(0).toUpperCase() + selectedContent.type.slice(1)} updated successfully!`);
    } catch (error) {
      console.error('Error updating content:', error);
      alert('Failed to update content. Please try again.');
    }
  };

  const handlePublishCourse = (courseId) => {
    const course = createdCourses.find(c => c._id === courseId);
    
    // Show confirmation for unpublishing
    if (course && course.isPublished) {
      const confirmUnpublish = window.confirm(
        `Are you sure you want to unpublish "${course.title}"?\n\n` +
        `⚠️ This course will no longer be visible to students and won't accept new enrollments.\n` +
        `Existing enrolled students will retain access to the course content.`
      );
      
      if (!confirmUnpublish) {
        return;
      }
    }

    const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
    const updatedCourses = allCourses.map(course => 
      course._id === courseId 
        ? { ...course, isPublished: !course.isPublished }
        : course
    );
    
    localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
    setCreatedCourses(updatedCourses.filter(course => course.instructor?._id === currentUser._id));
    
    alert(`Course ${course?.isPublished ? 'unpublished' : 'published'} successfully!`);
  };

  const handleDeleteCourse = (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
      const updatedCourses = allCourses.filter(course => course._id !== courseId);
      localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
      setCreatedCourses(updatedCourses.filter(course => course.instructor?._id === currentUser._id));
      alert('Course deleted successfully!');
    }
  };

  // New function to delete content
  const handleDeleteContent = (courseId, contentType, contentId) => {
    if (window.confirm(`Are you sure you want to delete this ${contentType}?`)) {
      const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
      const updatedCourses = allCourses.map(course => {
        if (course._id === courseId) {
          const updatedCourse = { ...course };
          switch (contentType) {
            case 'lecture':
              updatedCourse.lectures = updatedCourse.lectures?.filter(lecture => lecture.id !== contentId) || [];
              break;
            case 'assignment':
              updatedCourse.assignments = updatedCourse.assignments?.filter(assignment => assignment.id !== contentId) || [];
              break;
            case 'quiz':
              updatedCourse.quizzes = updatedCourse.quizzes?.filter(quiz => quiz.id !== contentId) || [];
              break;
            case 'material':
              updatedCourse.materials = updatedCourse.materials?.filter(material => material.id !== contentId) || [];
              break;
          }
          return updatedCourse;
        }
        return course;
      });
      
      localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
      setCreatedCourses(updatedCourses.filter(course => course.instructor?._id === currentUser._id));
      alert(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} deleted successfully!`);
    }
  };

  const toggleExistingContent = (courseId) => {
    setShowExistingContent(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const getCourseStats = (course) => {
    return {
      lectures: course.lectures?.length || 0,
      assignments: course.assignments?.length || 0,
      quizzes: course.quizzes?.length || 0,
      materials: course.materials?.length || 0,
      students: course.studentsEnrolled || 0
    };
  };

  const renderContentForm = () => {
    switch (newContent.type) {
      case 'lecture':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Lecture Title *</label>
              <input
                type="text"
                name="title"
                value={newContent.title}
                onChange={handleNewContentChange}
                style={styles.formInput}
                placeholder="Enter lecture title"
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                name="description"
                value={newContent.description}
                onChange={handleNewContentChange}
                style={styles.formTextarea}
                placeholder="Enter lecture description"
                rows="3"
              />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Duration</label>
                <input
                  type="text"
                  name="duration"
                  value={newContent.duration}
                  onChange={handleNewContentChange}
                  style={styles.formInput}
                  placeholder="e.g., 30 minutes"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Upload Video *</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, 'videoFile')}
                  style={styles.fileInput}
                  required={!showEditContentModal}
                />
                {isUploading && (
                  <div style={styles.uploadProgress}>
                    <div style={styles.progressBar}>
                      <div 
                        style={{
                          ...styles.progressFill,
                          width: `${uploadProgress}%`
                        }}
                      ></div>
                    </div>
                    <span style={styles.progressText}>Uploading... {uploadProgress}%</span>
                  </div>
                )}
                {newContent.videoFile && !isUploading && (
                  <div style={styles.fileInfo}>
                    <span style={styles.fileName}>
                      {newContent.videoFile instanceof File ? '📹' : '🌐'} {newContent.videoFile.name}
                      {!(newContent.videoFile instanceof File) && ' (Server)'}
                    </span>
                    <span style={styles.fileSize}>
                      ({(newContent.videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      case 'assignment':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Assignment Title *</label>
              <input
                type="text"
                name="title"
                value={newContent.assignment.title}
                onChange={handleAssignmentChange}
                style={styles.formInput}
                placeholder="Enter assignment title"
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                name="description"
                value={newContent.assignment.description}
                onChange={handleAssignmentChange}
                style={styles.formTextarea}
                placeholder="Enter assignment description"
                rows="3"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Instructions</label>
              <textarea
                name="instructions"
                value={newContent.assignment.instructions}
                onChange={handleAssignmentChange}
                style={styles.formTextarea}
                placeholder="Enter detailed instructions for students"
                rows="3"
              />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Points</label>
                <input
                  type="number"
                  name="points"
                  value={newContent.assignment.points}
                  onChange={handleAssignmentChange}
                  style={styles.formInput}
                  min="1"
                  max="100"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Due Date *</label>
                <input
                  type="datetime-local"
                  name="dueDate"
                  value={newContent.assignment.dueDate}
                  onChange={handleAssignmentChange}
                  style={styles.formInput}
                  required
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Assignment File (Optional)</label>
              <input
                type="file"
                onChange={handleAssignmentFileUpload}
                style={styles.fileInput}
                accept=".pdf,.doc,.docx,.txt,.zip,.jpg,.jpeg,.png"
              />
              {newContent.assignment.file && (
                <div style={styles.fileInfo}>
                  <span style={styles.fileName}>
                    {newContent.assignment.file.name || newContent.assignment.file.originalName}
                  </span>
                  <span style={styles.fileSize}>
                    ({(newContent.assignment.file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
          </>
        );

      case 'quiz':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Quiz Title *</label>
              <input
                type="text"
                name="title"
                value={newContent.quiz.title}
                onChange={handleQuizChange}
                style={styles.formInput}
                placeholder="Enter quiz title"
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                name="description"
                value={newContent.quiz.description}
                onChange={handleQuizChange}
                style={styles.formTextarea}
                placeholder="Enter quiz description"
                rows="2"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Instructions</label>
              <textarea
                name="instructions"
                value={newContent.quiz.instructions}
                onChange={handleQuizChange}
                style={styles.formTextarea}
                placeholder="Enter quiz instructions"
                rows="2"
              />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Total Questions</label>
                <input
                  type="number"
                  name="totalQuestions"
                  value={newContent.quiz.totalQuestions}
                  onChange={handleQuizChange}
                  style={styles.formInput}
                  min="1"
                  max="50"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Time Limit (minutes)</label>
                <input
                  type="number"
                  name="timeLimit"
                  value={newContent.quiz.timeLimit}
                  onChange={handleQuizChange}
                  style={styles.formInput}
                  min="1"
                  max="180"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Points</label>
                <input
                  type="number"
                  name="points"
                  value={newContent.quiz.points}
                  onChange={handleQuizChange}
                  style={styles.formInput}
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div style={styles.quizQuestions}>
              <h4 style={styles.quizQuestionsTitle}>Quiz Questions</h4>
              {newContent.quiz.questions.map((question, qIndex) => (
                <div key={qIndex} style={styles.questionBlock}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      Question {qIndex + 1} *
                    </label>
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) => handleQuizQuestionChange(qIndex, 'question', e.target.value)}
                      style={styles.formInput}
                      placeholder="Enter question"
                      required
                    />
                  </div>
                  
                  <div style={styles.optionsGrid}>
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          Option {oIndex + 1} *
                        </label>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleQuizQuestionChange(qIndex, 'options', e.target.value, oIndex)}
                          style={styles.formInput}
                          placeholder={`Option ${oIndex + 1}`}
                          required
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Correct Answer *</label>
                    <select
                      value={question.correctAnswer}
                      onChange={(e) => handleQuizQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                      style={styles.formSelect}
                      required
                    >
                      {question.options.map((_, index) => (
                        <option key={index} value={index}>
                          Option {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Add Explanation Field */}
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      Explanation (Optional)
                    </label>
                    <textarea
                      value={question.explanation || ''}
                      onChange={(e) => handleQuizQuestionChange(qIndex, 'explanation', e.target.value)}
                      style={styles.formTextarea}
                      placeholder="Enter explanation for the correct answer (this will be shown to students when they review their answers)"
                      rows="3"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      case 'material':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Material Title *</label>
              <input
                type="text"
                name="title"
                value={newContent.title}
                onChange={handleNewContentChange}
                style={styles.formInput}
                placeholder="Enter material title"
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                name="description"
                value={newContent.description}
                onChange={handleNewContentChange}
                style={styles.formTextarea}
                placeholder="Enter material description"
                rows="3"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Upload File *</label>
              <input
                type="file"
                onChange={(e) => handleFileUpload(e, 'materialFile')}
                style={styles.fileInput}
                required={!showEditContentModal}
              />
              {isUploading && (
                <div style={styles.uploadProgress}>
                  <div style={styles.progressBar}>
                    <div 
                      style={{
                        ...styles.progressFill,
                        width: `${uploadProgress}%`
                      }}
                    ></div>
                  </div>
                  <span style={styles.progressText}>Uploading... {uploadProgress}%</span>
                </div>
              )}
              {newContent.materialFile && !isUploading && (
                <div style={styles.fileInfo}>
                  <span style={styles.fileName}>
                    {newContent.materialFile instanceof File ? '📄' : '🌐'} {newContent.materialFile.name}
                    {!(newContent.materialFile instanceof File) && ' (Server)'}
                  </span>
                  <span style={styles.fileSize}>
                    ({(newContent.materialFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>
            Welcome back, {currentUser?.name || 'User'}! 👋
          </h1>
          <p style={styles.headerSubtitle}>
            {currentUser?.role === 'instructor' 
              ? 'Manage your courses and track student progress'
              : 'Continue your learning journey and track your progress'}
          </p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.confirmModal}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div style={styles.confirmModalActions}>
              <button onClick={cancelLogout} style={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={confirmLogout} style={styles.confirmButton}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Assignment Submissions Modal */}
      {showViewAssignmentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Submissions for {selectedAssignment?.title}</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowViewAssignmentModal(false)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              {(() => {
                const submissions = JSON.parse(localStorage.getItem(`assignment_submissions_${selectedAssignment.id}`) || '[]');
                
                if (submissions.length === 0) {
                  return (
                    <div style={styles.noSubmissions}>
                      <div style={styles.noSubmissionsIcon}>📭</div>
                      <h4 style={styles.noSubmissionsTitle}>No Submissions Yet</h4>
                      <p style={styles.noSubmissionsText}>
                        Students haven't submitted any work for this assignment yet.
                      </p>
                    </div>
                  );
                }

                return (
                  <div style={styles.submissionsContainer}>
                    <div style={styles.submissionsHeader}>
                      <div style={styles.submissionCount}>
                        Total Submissions: <strong>{submissions.length}</strong>
                      </div>
                      {selectedAssignment.dueDate && (
                        <div style={styles.dueDateInfo}>
                          Due Date: <strong>{new Date(selectedAssignment.dueDate).toLocaleString()}</strong>
                        </div>
                      )}
                    </div>

                    {submissions.map((submission, index) => (
                      <div key={index} style={styles.submissionCard}>
                        <div style={styles.submissionHeader}>
                          <div style={styles.studentInfo}>
                            <strong style={styles.studentName}>{submission.studentName}</strong>
                            <span style={styles.submissionDate}>
                              Submitted: {new Date(submission.submittedAt).toLocaleString()}
                            </span>
                          </div>
                          <div style={styles.submissionStatus}>
                            {isSubmissionLate(submission, selectedAssignment) && (
                              <span style={styles.lateBadge}>⏰ LATE SUBMISSION</span>
                            )}
                            {submission.pointsObtained !== null ? (
                              <span style={styles.gradedBadge}>✅ GRADED</span>
                            ) : (
                              <span style={styles.pendingBadge}>⏳ PENDING</span>
                            )}
                          </div>
                        </div>
                        
                        {submission.textAnswer && (
                          <div style={styles.textAnswerSection}>
                            <h4 style={styles.sectionTitle}>Text Answer</h4>
                            <div style={styles.answerText}>
                              {submission.textAnswer}
                            </div>
                          </div>
                        )}
                        
                        {submission.file && (
                          <div style={styles.fileSection}>
                            <h4 style={styles.sectionTitle}>Submitted File</h4>
                            <div style={styles.fileCard}>
                              <div style={styles.fileInfo}>
                                <span style={styles.fileIcon}>📎</span>
                                <div style={styles.fileDetails}>
                                  <span 
                                    style={{...styles.fileName, cursor: 'pointer', textDecoration: 'underline'}}
                                    onClick={() => {
                                      if (submission.file.url) {
                                        window.open(submission.file.url, '_blank');
                                      } else if (submission.file instanceof File) {
                                        const url = URL.createObjectURL(submission.file);
                                        window.open(url, '_blank');
                                      }
                                    }}
                                  >
                                    {submission.file.name}
                                  </span>
                                  <span style={styles.fileSize}>
                                    {(submission.file.size / (1024 * 1024)).toFixed(2)} MB
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {submission.pointsObtained !== null && (
                          <div style={styles.gradeSection}>
                            <div style={styles.gradeInfo}>
                              <div style={styles.pointsInfo}>
                                <strong>Points Obtained:</strong> 
                                <span style={styles.pointsValue}>
                                  {submission.pointsObtained} / {selectedAssignment.points}
                                </span>
                              </div>
                              {submission.instructorReview && (
                                <div style={styles.reviewInfo}>
                                  <strong>Instructor Review:</strong>
                                  <div style={styles.reviewText}>
                                    {submission.instructorReview}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div style={styles.submissionActions}>
                          <button
                            onClick={() => handleGradeAssignment(submission)}
                            style={styles.gradeButton}
                          >
                            {submission.pointsObtained !== null ? 'Update Grade' : 'Grade Submission'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowViewAssignmentModal(false)}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Assignment Modal */}
      {showGradeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Grade Assignment</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowGradeModal(false)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <h4 style={styles.assignmentModalTitle}>{selectedAssignment?.title}</h4>
              <div style={styles.studentInfo}>
                <p><strong>Student:</strong> {selectedSubmission?.studentName}</p>
                <p><strong>Submitted:</strong> {new Date(selectedSubmission?.submittedAt).toLocaleString()}</p>
                {selectedAssignment.dueDate && (
                  <p style={isSubmissionLate(selectedSubmission, selectedAssignment) ? styles.lateText : styles.onTimeText}>
                    <strong>Status:</strong> {isSubmissionLate(selectedSubmission, selectedAssignment) ? 'Late Submission' : 'Submitted on Time'}
                  </p>
                )}
              </div>
              
              <div style={styles.gradeForm}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Points Obtained (Max: {selectedAssignment?.points})</label>
                  <input
                    type="number"
                    value={pointsObtained}
                    onChange={(e) => setPointsObtained(parseInt(e.target.value) || 0)}
                    style={styles.formInput}
                    min="0"
                    max={selectedAssignment?.points}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Instructor Review</label>
                  <textarea
                    value={instructorReview}
                    onChange={(e) => setInstructorReview(e.target.value)}
                    style={styles.formTextarea}
                    placeholder="Provide feedback for the student..."
                    rows="4"
                  />
                </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button 
                style={styles.cancelButton}
                onClick={() => setShowGradeModal(false)}
              >
                Cancel
              </button>
              <button 
                style={styles.submitModalButton}
                onClick={handleSaveGrade}
              >
                Save Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Dashboard */}
      {currentUser?.role === 'student' && (
        <div style={styles.dashboardContent}>
          {/* Student Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>📚</div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{userStats?.totalCourses || 0}</h3>
                <p style={styles.statLabel}>Total Courses</p>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>✅</div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{userStats?.completedCourses || 0}</h3>
                <p style={styles.statLabel}>Completed</p>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>⏳</div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{userStats?.inProgressCourses || 0}</h3>
                <p style={styles.statLabel}>In Progress</p>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>📈</div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{userStats?.averageProgress || 0}%</h3>
                <p style={styles.statLabel}>Avg Progress</p>
              </div>
            </div>
          </div>

          <div style={styles.mainContent}>
            {/* My Courses */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>My Courses</h2>
                <Link to="/courses" style={styles.viewAllButton}>
                  Browse More Courses
                </Link>
              </div>
              
              {enrolledCourses.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📚</div>
                  <h3 style={styles.emptyTitle}>No courses enrolled yet</h3>
                  <p style={styles.emptyDescription}>
                    Start your learning journey by exploring our course catalog
                  </p>
                  <Link to="/courses" style={styles.exploreButton}>
                    Explore Courses
                  </Link>
                </div>
              ) : (
                <div style={styles.coursesGrid}>
                  {enrolledCourses.map((course) => (
                    <div key={course._id} style={styles.courseCard}>
                      <div style={styles.courseCardHeader}>
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          style={styles.courseThumbnail}
                        />
                        <div style={styles.courseBadges}>
                          {course.isFree && (
                            <span style={styles.freeBadge}>FREE</span>
                          )}
                          <span style={styles.levelBadge}>{course.level}</span>
                        </div>
                      </div>
                      
                      <div style={styles.courseCardContent}>
                        <h3 style={styles.courseTitle}>{course.title}</h3>
                        <p style={styles.courseSubtitle}>{course.subtitle}</p>
                        
                        <div style={styles.courseMeta}>
                          <span style={styles.courseMetaItem}>
                            ⏱️ {course.totalHours}h
                          </span>
                          <span style={styles.courseMetaItem}>
                            👨‍🏫 {course.instructor?.name}
                          </span>
                        </div>
                        
                        <div style={styles.progressContainer}>
                          <div style={styles.progressHeader}>
                            <span style={styles.progressLabel}>Progress</span>
                            <span style={styles.progressPercentage}>
                              {course.progress}%
                            </span>
                          </div>
                          <div style={styles.progressBar}>
                            <div 
                              style={{
                                ...styles.progressFill,
                                width: `${course.progress}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        
                        <div style={styles.courseActions}>
                          <Link 
                            to={`/course/${course._id}`}
                            state={{ activeTab: 'content' }}
                            style={styles.continueButton}
                          >
                            {course.progress > 0 ? 'Continue' : 'Start'} Learning
                          </Link>
                          
                          <Link 
                            to={`/course/${course._id}/details`}
                            style={styles.materialsButton}
                          >
                            Course Materials
                          </Link>
                          
                          {course.canUnregister && (
                            <button
                              onClick={() => handleUnregisterCourse(course._id)}
                              style={styles.unregisterButton}
                            >
                              Unregister
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity - Moved below My Courses for students */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Recent Activity</h2>
              <div style={styles.activityList}>
                {recentActivity.length === 0 ? (
                  <div style={styles.emptyActivity}>
                    <div style={styles.emptyActivityIcon}>📊</div>
                    <p style={styles.emptyActivityText}>
                      No recent activity to show
                    </p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} style={styles.activityItem}>
                      <div style={styles.activityIcon}>
                        {activity.icon}
                      </div>
                      <div style={styles.activityContent}>
                        <p style={styles.activityMessage}>
                          {activity.message}
                        </p>
                        <span style={styles.activityTime}>
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructor Dashboard */}
      {currentUser?.role === 'instructor' && (
        <div style={styles.dashboardContent}>
          {/* Instructor Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>📚</div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>{createdCourses.length}</h3>
                <p style={styles.statLabel}>Total Courses</p>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>👥</div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>
                  {createdCourses.reduce((total, course) => total + (course.studentsEnrolled || 0), 0)}
                </h3>
                <p style={styles.statLabel}>Total Students</p>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>💰</div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>
                  {formatPrice(createdCourses.reduce((total, course) => total + (course.price * (course.studentsEnrolled || 0)), 0))}
                </h3>
                <p style={styles.statLabel}>Total Revenue</p>
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>⭐</div>
              <div style={styles.statContent}>
                <h3 style={styles.statNumber}>
                  {createdCourses.length > 0 
                    ? (createdCourses.reduce((sum, course) => sum + (course.averageRating || 0), 0) / createdCourses.length).toFixed(1)
                    : '0.0'
                  }
                </h3>
                <p style={styles.statLabel}>Avg Rating</p>
              </div>
            </div>
          </div>

          {/* My Courses - Instructor View */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>My Courses</h2>
              <button onClick={handleCreateCourse} style={styles.createButton}>
                + Create New Course
              </button>
            </div>
            
            {createdCourses.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🎓</div>
                <h3 style={styles.emptyTitle}>No courses created yet</h3>
                <p style={styles.emptyDescription}>
                  Start by creating your first course and share your knowledge with students
                </p>
                <button onClick={handleCreateCourse} style={styles.createButton}>
                  Create Your First Course
                </button>
              </div>
            ) : (
              <div style={styles.coursesGrid}>
                {createdCourses.map((course) => (
                  <div key={course._id} style={styles.courseCard}>
                    <div style={styles.courseCardHeader}>
                      <img 
                        src={course.thumbnail} 
                        alt={course.title}
                        style={styles.courseThumbnail}
                      />
                      <div style={styles.courseBadges}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: course.isPublished ? '#10b981' : '#6b7280'
                        }}>
                          {course.isPublished ? 'Published' : 'Draft'}
                        </span>
                        <span style={styles.levelBadge}>{course.level}</span>
                      </div>
                    </div>
                    
                    <div style={styles.courseCardContent}>
                      <h3 style={styles.courseTitle}>{course.title}</h3>
                      <p style={styles.courseSubtitle}>{course.subtitle}</p>
                      
                      <div style={styles.courseStats}>
                        <div style={styles.courseStat}>
                          <span style={styles.courseStatLabel}>Students</span>
                          <span style={styles.courseStatValue}>
                            {course.studentsEnrolled || 0}
                          </span>
                        </div>
                        <div style={styles.courseStat}>
                          <span style={styles.courseStatLabel}>Rating</span>
                          <span style={styles.courseStatValue}>
                            {course.averageRating || 0}/5
                          </span>
                        </div>
                        <div style={styles.courseStat}>
                          <span style={styles.courseStatLabel}>Price</span>
                          <span style={styles.courseStatValue}>
                            {course.isFree ? 'Free' : formatPrice(course.price)}
                          </span>
                        </div>
                      </div>
                      
                      <div style={styles.courseActions}>
                        <button
                          onClick={() => handleAddContent(course)}
                          style={styles.addContentButton}
                        >
                          Add Content
                        </button>
                        <button
                          onClick={() => handleEditCourse(course)}
                          style={styles.editCourseButton}
                        >
                          Edit Course
                        </button>
                        <button
                          onClick={() => handleViewStats(course)}
                          style={styles.statsButton}
                        >
                          View Stats
                        </button>
                        <button
                          onClick={() => handlePublishCourse(course._id)}
                          style={{
                            ...styles.publishButton,
                            backgroundColor: course.isPublished ? '#6b7280' : '#10b981'
                          }}
                        >
                          {course.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course._id)}
                          style={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>

                      {/* Existing Content Section */}
                      <div style={styles.existingContentSection}>
                        <button
                          onClick={() => toggleExistingContent(course._id)}
                          style={styles.toggleContentButton}
                        >
                          {showExistingContent[course._id] ? '▼' : '▶'} Existing Content
                          ({getCourseStats(course).lectures + getCourseStats(course).assignments + getCourseStats(course).quizzes + getCourseStats(course).materials})
                        </button>
                        
                        {showExistingContent[course._id] && (
                          <div style={styles.existingContent}>
                            {/* Lectures */}
                            {course.lectures && course.lectures.length > 0 && (
                              <div style={styles.contentCategory}>
                                <h4 style={styles.contentCategoryTitle}>Lectures ({course.lectures.length})</h4>
                                {course.lectures.map(lecture => (
                                  <div key={lecture.id} style={styles.contentItem}>
                                    <span style={styles.contentItemTitle}>
                                      🎥 {lecture.title}
                                      {lecture.videoFile && !lecture.videoFile.isLocal && ' 🌐'}
                                    </span>
                                    <div style={styles.contentItemActions}>
                                      <button
                                        onClick={() => handleEditContent(course, 'lecture', lecture)}
                                        style={styles.editButton}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteContent(course._id, 'lecture', lecture.id)}
                                        style={styles.deleteSmallButton}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Assignments */}
                            {course.assignments && course.assignments.length > 0 && (
                              <div style={styles.contentCategory}>
                                <h4 style={styles.contentCategoryTitle}>Assignments ({course.assignments.length})</h4>
                                {course.assignments.map(assignment => (
                                  <div key={assignment.id} style={styles.contentItem}>
                                    <span style={styles.contentItemTitle}>📝 {assignment.title}</span>
                                    <div style={styles.contentItemActions}>
                                      <button
                                        onClick={() => handleEditContent(course, 'assignment', assignment)}
                                        style={styles.editButton}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleViewAssignmentSubmissions(course, assignment)}
                                        style={styles.viewSubmissionsButton}
                                      >
                                        View Submissions
                                      </button>
                                      <button
                                        onClick={() => handleDeleteContent(course._id, 'assignment', assignment.id)}
                                        style={styles.deleteSmallButton}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Quizzes */}
                            {course.quizzes && course.quizzes.length > 0 && (
                              <div style={styles.contentCategory}>
                                <h4 style={styles.contentCategoryTitle}>Quizzes ({course.quizzes.length})</h4>
                                {course.quizzes.map(quiz => (
                                  <div key={quiz.id} style={styles.contentItem}>
                                    <span style={styles.contentItemTitle}>📊 {quiz.title}</span>
                                    <div style={styles.contentItemActions}>
                                      <button
                                        onClick={() => handleEditContent(course, 'quiz', quiz)}
                                        style={styles.editButton}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteContent(course._id, 'quiz', quiz.id)}
                                        style={styles.deleteSmallButton}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Materials */}
                            {course.materials && course.materials.length > 0 && (
                              <div style={styles.contentCategory}>
                                <h4 style={styles.contentCategoryTitle}>Materials ({course.materials.length})</h4>
                                {course.materials.map(material => (
                                  <div key={material.id} style={styles.contentItem}>
                                    <span style={styles.contentItemTitle}>
                                      📄 {material.title}
                                      {material.file && !material.file.isLocal && ' 🌐'}
                                    </span>
                                    <div style={styles.contentItemActions}>
                                      <button
                                        onClick={() => handleEditContent(course, 'material', material)}
                                        style={styles.editButton}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteContent(course._id, 'material', material.id)}
                                        style={styles.deleteSmallButton}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {(getCourseStats(course).lectures + getCourseStats(course).assignments + getCourseStats(course).quizzes + getCourseStats(course).materials) === 0 && (
                              <p style={styles.noContentText}>No content added yet</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateCourseModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create New Course</h2>
              <button 
                onClick={() => setShowCreateCourseModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateCourseSubmit} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Course Title *</label>
                <input
                  type="text"
                  name="title"
                  value={newCourseData.title}
                  onChange={handleNewCourseChange}
                  style={styles.formInput}
                  placeholder="Enter course title"
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Subtitle</label>
                <input
                  type="text"
                  name="subtitle"
                  value={newCourseData.subtitle}
                  onChange={handleNewCourseChange}
                  style={styles.formInput}
                  placeholder="Enter course subtitle"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <textarea
                  name="description"
                  value={newCourseData.description}
                  onChange={handleNewCourseChange}
                  style={styles.formTextarea}
                  placeholder="Enter course description"
                  rows="3"
                />
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Category</label>
                  <select
                    name="category"
                    value={newCourseData.category}
                    onChange={handleNewCourseChange}
                    style={styles.formSelect}
                  >
                    <option value="web-development">Web Development</option>
                    <option value="mobile-development">Mobile Development</option>
                    <option value="data-science">Data Science</option>
                    <option value="design">Design</option>
                    <option value="business">Business</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Level</label>
                  <select
                    name="level"
                    value={newCourseData.level}
                    onChange={handleNewCourseChange}
                    style={styles.formSelect}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={newCourseData.price}
                    onChange={handleNewCourseChange}
                    style={styles.formInput}
                    min="0"
                    step="1"
                  />
                  {newCourseData.price === 0 && (
                    <span style={styles.freeNote}>Course will be marked as FREE</span>
                  )}
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Total Seats</label>
                  <input
                    type="number"
                    name="totalSeats"
                    value={newCourseData.totalSeats}
                    onChange={handleNewCourseChange}
                    style={styles.formInput}
                    min="1"
                    max="1000"
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Total Hours</label>
                  <input
                    type="number"
                    name="totalHours"
                    value={newCourseData.totalHours}
                    onChange={handleNewCourseChange}
                    style={styles.formInput}
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Course Thumbnail</label>
                <div style={styles.thumbnailGrid}>
                  {thumbnailOptions.map((thumbnail, index) => (
                    <div
                      key={index}
                      style={{
                        ...styles.thumbnailOption,
                        border: newCourseData.thumbnail === thumbnail ? '3px solid #3b82f6' : '1px solid #d1d5db'
                      }}
                      onClick={() => handleThumbnailSelect(thumbnail)}
                    >
                      <img 
                        src={thumbnail} 
                        alt={`Thumbnail ${index + 1}`}
                        style={styles.thumbnailImage}
                      />
                    </div>
                  ))}
                </div>
                <div style={styles.customThumbnailSection}>
                  <label style={styles.uploadLabel}>Or Upload Custom Thumbnail:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomThumbnailUpload}
                    style={styles.fileInput}
                  />
                  {newCourseData.thumbnail && !thumbnailOptions.includes(newCourseData.thumbnail) && (
                    <div style={styles.customThumbnailPreview}>
                      <img 
                        src={newCourseData.thumbnail} 
                        alt="Custom thumbnail"
                        style={styles.thumbnailImage}
                      />
                      <span style={styles.customThumbnailLabel}>Custom Thumbnail</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateCourseModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditCourseModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Course</h2>
              <button 
                onClick={() => setShowEditCourseModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleEditCourseSubmit} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Course Title *</label>
                <input
                  type="text"
                  name="title"
                  value={newCourseData.title}
                  onChange={handleNewCourseChange}
                  style={styles.formInput}
                  placeholder="Enter course title"
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Subtitle</label>
                <input
                  type="text"
                  name="subtitle"
                  value={newCourseData.subtitle}
                  onChange={handleNewCourseChange}
                  style={styles.formInput}
                  placeholder="Enter course subtitle"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <textarea
                  name="description"
                  value={newCourseData.description}
                  onChange={handleNewCourseChange}
                  style={styles.formTextarea}
                  placeholder="Enter course description"
                  rows="3"
                />
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Category</label>
                  <select
                    name="category"
                    value={newCourseData.category}
                    onChange={handleNewCourseChange}
                    style={styles.formSelect}
                  >
                    <option value="web-development">Web Development</option>
                    <option value="mobile-development">Mobile Development</option>
                    <option value="data-science">Data Science</option>
                    <option value="design">Design</option>
                    <option value="business">Business</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Level</label>
                  <select
                    name="level"
                    value={newCourseData.level}
                    onChange={handleNewCourseChange}
                    style={styles.formSelect}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={newCourseData.price}
                    onChange={handleNewCourseChange}
                    style={styles.formInput}
                    min="0"
                    step="1"
                  />
                  {newCourseData.price === 0 && (
                    <span style={styles.freeNote}>Course will be marked as FREE</span>
                  )}
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Total Seats</label>
                  <input
                    type="number"
                    name="totalSeats"
                    value={newCourseData.totalSeats}
                    onChange={handleNewCourseChange}
                    style={styles.formInput}
                    min="1"
                    max="1000"
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Total Hours</label>
                  <input
                    type="number"
                    name="totalHours"
                    value={newCourseData.totalHours}
                    onChange={handleNewCourseChange}
                    style={styles.formInput}
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Course Thumbnail</label>
                <div style={styles.thumbnailGrid}>
                  {thumbnailOptions.map((thumbnail, index) => (
                    <div
                      key={index}
                      style={{
                        ...styles.thumbnailOption,
                        border: newCourseData.thumbnail === thumbnail ? '3px solid #3b82f6' : '1px solid #d1d5db'
                      }}
                      onClick={() => handleThumbnailSelect(thumbnail)}
                    >
                      <img 
                        src={thumbnail} 
                        alt={`Thumbnail ${index + 1}`}
                        style={styles.thumbnailImage}
                      />
                    </div>
                  ))}
                </div>
                <div style={styles.customThumbnailSection}>
                  <label style={styles.uploadLabel}>Or Upload Custom Thumbnail:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomThumbnailUpload}
                    style={styles.fileInput}
                  />
                  {newCourseData.thumbnail && !thumbnailOptions.includes(newCourseData.thumbnail) && (
                    <div style={styles.customThumbnailPreview}>
                      <img 
                        src={newCourseData.thumbnail} 
                        alt="Custom thumbnail"
                        style={styles.thumbnailImage}
                      />
                      <span style={styles.customThumbnailLabel}>Custom Thumbnail</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowEditCourseModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                >
                  Update Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Content Modal */}
      {showAddContentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Add Content to {selectedCourse?.title}
              </h2>
              <button 
                onClick={() => setShowAddContentModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddContentSubmit} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Content Type</label>
                <select
                  name="type"
                  value={newContent.type}
                  onChange={handleNewContentChange}
                  style={styles.formSelect}
                >
                  <option value="lecture">Lecture</option>
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="material">Study Material</option>
                </select>
              </div>
              
              {renderContentForm()}
              
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowAddContentModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                >
                  Add {newContent.type.charAt(0).toUpperCase() + newContent.type.slice(1)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {showEditContentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Edit {selectedContent?.type} - {selectedCourse?.title}
              </h2>
              <button 
                onClick={() => setShowEditContentModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleEditContentSubmit} style={styles.modalForm}>
              {renderContentForm()}
              
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowEditContentModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                >
                  Update {selectedContent?.type.charAt(0).toUpperCase() + selectedContent?.type.slice(1)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Stats Modal */}
      {showCourseStatsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Course Statistics - {selectedCourse?.title}
              </h2>
              <button 
                onClick={() => setShowCourseStatsModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div style={styles.statsContent}>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>👥</div>
                  <div style={styles.statContent}>
                    <h3 style={styles.statNumber}>{courseStats?.totalStudents || 0}</h3>
                    <p style={styles.statLabel}>Total Students</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>📝</div>
                  <div style={styles.statContent}>
                    <h3 style={styles.statNumber}>{courseStats?.totalAssignments || 0}</h3>
                    <p style={styles.statLabel}>Assignments</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>📊</div>
                  <div style={styles.statContent}>
                    <h3 style={styles.statNumber}>{courseStats?.totalSubmissions || 0}</h3>
                    <p style={styles.statLabel}>Submissions</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>📚</div>
                  <div style={styles.statContent}>
                    <h3 style={styles.statNumber}>{courseStats?.totalMaterials || 0}</h3>
                    <p style={styles.statLabel}>Materials</p>
                  </div>
                </div>
              </div>
              
              {courseStats?.recentSubmissions && courseStats.recentSubmissions.length > 0 && (
                <div style={styles.recentSubmissions}>
                  <h4 style={styles.submissionsTitle}>Recent Submissions</h4>
                  {courseStats.recentSubmissions.map((submission, index) => (
                    <div key={index} style={styles.submissionItem}>
                      <div style={styles.submissionInfo}>
                        <span style={styles.submissionStudent}>
                          {submission.studentName}
                        </span>
                        <span style={styles.submissionAssignment}>
                          {submission.assignmentTitle}
                        </span>
                      </div>
                      <span style={styles.submissionDate}>
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowCourseStatsModal(false)}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  headerContent: {
    flex: '1',
    minWidth: '300px'
  },
  headerTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px'
  },
  headerSubtitle: {
    fontSize: '1.1rem',
    color: '#6b7280',
    margin: 0
  },
  dashboardContent: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  statIcon: {
    fontSize: '2.5rem',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  statContent: {
    flex: '1'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 4px 0'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#6b7280',
    margin: 0,
    fontWeight: '500'
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  viewAllButton: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #3b82f6',
    transition: 'all 0.2s'
  },
  createButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  coursesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px'
  },
  courseCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #e5e7eb'
  },
  courseCardHeader: {
    position: 'relative'
  },
  courseThumbnail: {
    width: '100%',
    height: '200px',
    objectFit: 'cover'
  },
  courseBadges: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  freeBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  levelBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  statusBadge: {
    color: 'white',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  courseCardContent: {
    padding: '20px'
  },
  courseTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 8px 0',
    lineHeight: '1.4'
  },
  courseSubtitle: {
    fontSize: '0.9rem',
    color: '#6b7280',
    margin: '0 0 16px 0',
    lineHeight: '1.5'
  },
  courseMeta: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  courseMetaItem: {
    fontSize: '0.8rem',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  progressContainer: {
    marginBottom: '20px'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  progressLabel: {
    fontSize: '0.9rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  progressPercentage: {
    fontSize: '0.9rem',
    color: '#3b82f6',
    fontWeight: '600'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  courseActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    flex: '1',
    textAlign: 'center'
  },
  materialsButton: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    flex: '1',
    textAlign: 'center'
  },
  unregisterButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  courseStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  courseStat: {
    textAlign: 'center'
  },
  courseStatLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    display: 'block',
    marginBottom: '4px'
  },
  courseStatValue: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1f2937',
    display: 'block'
  },
  addContentButton: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    flex: '1'
  },
  editCourseButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    flex: '1'
  },
  statsButton: {
    backgroundColor: '#06b6d4',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    flex: '1'
  },
  publishButton: {
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    flex: '1'
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    flex: '1'
  },
  existingContentSection: {
    marginTop: '16px',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px'
  },
  toggleContentButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    padding: '8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  existingContent: {
    marginTop: '12px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  contentCategory: {
    marginBottom: '16px'
  },
  contentCategoryTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0',
    paddingBottom: '4px',
    borderBottom: '1px solid #e5e7eb'
  },
  contentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    marginBottom: '4px'
  },
  contentItemTitle: {
    fontSize: '0.8rem',
    color: '#374151',
    flex: '1'
  },
  contentItemActions: {
    display: 'flex',
    gap: '4px'
  },
  editButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '0.7rem',
    cursor: 'pointer'
  },
  viewSubmissionsButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '0.7rem',
    cursor: 'pointer'
  },
  deleteSmallButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '0.7rem',
    cursor: 'pointer'
  },
  noContentText: {
    fontSize: '0.9rem',
    color: '#6b7280',
    textAlign: 'center',
    padding: '20px',
    fontStyle: 'italic'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    borderLeft: '4px solid #3b82f6'
  },
  activityIcon: {
    fontSize: '1.2rem',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: '8px',
    flexShrink: 0
  },
  activityContent: {
    flex: '1'
  },
  activityMessage: {
    margin: '0 0 4px 0',
    color: '#374151',
    fontSize: '0.9rem',
    lineHeight: '1.4'
  },
  activityTime: {
    fontSize: '0.8rem',
    color: '#6b7280'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '1.5rem',
    color: '#374151',
    margin: '0 0 12px 0'
  },
  emptyDescription: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0 0 24px 0',
    maxWidth: '400px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: '1.5'
  },
  emptyActivity: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  emptyActivityIcon: {
    fontSize: '3rem',
    marginBottom: '16px'
  },
  emptyActivityText: {
    color: '#6b7280',
    fontSize: '0.9rem',
    margin: 0
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center'
  },
  confirmModalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '20px'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'background-color 0.2s'
  },
  modalForm: {
    padding: '24px',
    flex: '1',
    overflowY: 'auto'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#374151',
    fontSize: '0.9rem'
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box'
  },
  formTextarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px'
  },
  fileInput: {
    width: '100%',
    padding: '8px 0',
    fontSize: '0.9rem'
  },
  fileInfo: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  fileName: {
    fontWeight: '500',
    color: '#374151'
  },
  fileSize: {
    color: '#6b7280',
    marginLeft: '8px'
  },
  uploadProgress: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #bae6fd'
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '4px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '3px',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '0.8rem',
    color: '#0369a1',
    fontWeight: '500'
  },
  freeNote: {
    fontSize: '0.8rem',
    color: '#10b981',
    fontWeight: '500',
    marginTop: '4px',
    display: 'block'
  },
  thumbnailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginTop: '8px'
  },
  thumbnailOption: {
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  thumbnailImage: {
    width: '100%',
    height: '80px',
    objectFit: 'cover'
  },
  customThumbnailSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  customThumbnailPreview: {
    marginTop: '12px',
    textAlign: 'center'
  },
  customThumbnailLabel: {
    display: 'block',
    marginTop: '8px',
    fontSize: '0.8rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  uploadLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#374151',
    fontSize: '0.9rem'
  },
  quizQuestions: {
    marginTop: '24px',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '20px'
  },
  quizQuestionsTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0'
  },
  questionBlock: {
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb'
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    margin: '12px 0'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '24px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s'
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s'
  },
  confirmButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s'
  },
  statsContent: {
    padding: '24px',
    flex: '1',
    overflowY: 'auto'
  },
  recentSubmissions: {
    marginTop: '24px'
  },
  submissionsTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0'
  },
  submissionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    marginBottom: '8px'
  },
  submissionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  submissionStudent: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#374151'
  },
  submissionAssignment: {
    fontSize: '0.8rem',
    color: '#6b7280'
  },
  submissionDate: {
    fontSize: '0.8rem',
    color: '#6b7280'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  // New styles for assignment submission viewing and grading
  modalBody: {
    padding: '24px',
    flex: '1',
    overflowY: 'auto'
  },
  assignmentModalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '16px'
  },
  // Improved submission display styles
  submissionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  submissionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    marginBottom: '16px'
  },
  submissionCount: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151'
  },
  dueDateInfo: {
    fontSize: '14px',
    color: '#6b7280'
  },
  submissionCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  submissionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  studentName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  submissionDate: {
    fontSize: '14px',
    color: '#6b7280'
  },
  submissionStatus: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  lateBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  gradedBadge: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  textAnswerSection: {
    marginBottom: '16px'
  },
  fileSection: {
    marginBottom: '16px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  answerText: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap'
  },
  fileCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  fileIcon: {
    fontSize: '24px'
  },
  fileDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  fileName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  fileSize: {
    fontSize: '12px',
    color: '#6b7280'
  },
  downloadButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  gradeSection: {
    marginBottom: '16px',
    padding: '16px',
    backgroundColor: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fcd34d'
  },
  gradeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  pointsInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  pointsValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#065f46'
  },
  reviewInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  reviewText: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap'
  },
  submissionActions: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  gradeButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  noSubmissions: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  noSubmissionsIcon: {
    fontSize: '4rem',
    marginBottom: '16px'
  },
  noSubmissionsTitle: {
    fontSize: '1.25rem',
    color: '#374151',
    margin: '0 0 8px 0'
  },
  noSubmissionsText: {
    fontSize: '1rem',
    margin: 0,
    lineHeight: '1.5'
  },
  gradeForm: {
    marginTop: '16px'
  },
  submitModalButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  lateText: {
    color: '#dc2626',
    fontWeight: '500'
  },
  onTimeText: {
    color: '#059669',
    fontWeight: '500'
  }
};

export default Dashboard;