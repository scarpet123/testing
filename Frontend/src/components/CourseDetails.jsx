import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadService } from '../services/uploadService';

const CourseDetails = () => {
  const { courseId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('content');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showViewAssignmentModal, setShowViewAssignmentModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [instructorReview, setInstructorReview] = useState('');
  const [pointsObtained, setPointsObtained] = useState(0);
  const [showEditSubmissionModal, setShowEditSubmissionModal] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [editTextAnswer, setEditTextAnswer] = useState('');
  const [editUploadedFile, setEditUploadedFile] = useState(null);

  // Set active tab from navigation state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Load data from localStorage or use initial data
  const [quizzes, setQuizzes] = useState(() => {
    const savedQuizzes = localStorage.getItem(`user_${currentUser?._id}_course_${courseId}_quizzes`);
    return savedQuizzes ? JSON.parse(savedQuizzes) : [];
  });

  const [assignments, setAssignments] = useState(() => {
    const savedAssignments = localStorage.getItem(`user_${currentUser?._id}_course_${courseId}_assignments`);
    return savedAssignments ? JSON.parse(savedAssignments) : [];
  });

  const [completedLectures, setCompletedLectures] = useState(() => {
    const saved = localStorage.getItem(`user_${currentUser?._id}_course_${courseId}_completed_lectures`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`user_${currentUser._id}_course_${courseId}_quizzes`, JSON.stringify(quizzes));
    }
  }, [quizzes, courseId, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`user_${currentUser._id}_course_${courseId}_assignments`, JSON.stringify(assignments));
    }
  }, [assignments, courseId, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`user_${currentUser._id}_course_${courseId}_completed_lectures`, JSON.stringify([...completedLectures]));
      updateCourseProgress();
    }
  }, [completedLectures, courseId, currentUser]);

  const updateCourseProgress = () => {
    if (currentUser && courseId && course.lectures) {
      const progress = (completedLectures.size / course.lectures.length) * 100;
      const userProgress = JSON.parse(localStorage.getItem(`user_progress_${currentUser._id}_${courseId}`) || '{}');
      
      const updatedProgress = {
        ...userProgress,
        progress: Math.round(progress),
        completedLectures: [...completedLectures],
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(`user_progress_${currentUser._id}_${courseId}`, JSON.stringify(updatedProgress));
    }
  };

  // Load course data from localStorage
  const [course, setCourse] = useState({
    _id: courseId,
    title: 'Course Not Found',
    instructor: { name: 'Unknown Instructor' },
    description: 'Course details not available',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
    materials: [],
    lectures: [],
    assignments: [],
    quizzes: []
  });

  // Load course data with proper initialization
  useEffect(() => {
    const loadCourseData = () => {
      try {
        const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
        const foundCourse = allCourses.find(c => c._id === courseId) || {
          _id: courseId,
          title: 'Course Not Found',
          instructor: { name: 'Unknown Instructor' },
          description: 'Course details not available',
          thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
          materials: [],
          lectures: [],
          assignments: [],
          quizzes: []
        };
        
        // Ensure all arrays exist
        foundCourse.materials = foundCourse.materials || [];
        foundCourse.lectures = foundCourse.lectures || [];
        foundCourse.assignments = foundCourse.assignments || [];
        foundCourse.quizzes = foundCourse.quizzes || [];
        
        setCourse(foundCourse);
      } catch (error) {
        console.error('Error loading course data:', error);
      }
    };

    loadCourseData();
  }, [courseId]);

  // Initialize assignments and quizzes from course data - FIXED: Properly sync with course data
  useEffect(() => {
    if (course.assignments && course.assignments.length > 0) {
      // For students, load their submission status
      if (currentUser?.role === 'student') {
        const assignmentsWithStatus = course.assignments.map(assignment => {
          const submissions = JSON.parse(localStorage.getItem(`assignment_submissions_${assignment.id}`) || '[]');
          const userSubmission = submissions.find(sub => sub.studentId === currentUser._id);
          
          return {
            ...assignment,
            submitted: !!userSubmission,
            submission: userSubmission || null,
            status: userSubmission ? (userSubmission.status || 'submitted') : 'pending'
          };
        });
        
        setAssignments(assignmentsWithStatus);
      } else {
        // For instructors, just set the assignments
        setAssignments(course.assignments);
      }
    }
    
    // FIXED: Always sync quizzes with course data to ensure new quizzes are displayed
    if (course.quizzes && course.quizzes.length > 0) {
      if (currentUser?.role === 'student') {
        // For students, load their quiz attempts
        const userQuizzes = JSON.parse(localStorage.getItem(`user_${currentUser._id}_course_${courseId}_quizzes`) || '[]');
        const quizzesWithStatus = course.quizzes.map(quiz => {
          const userQuiz = userQuizzes.find(q => q.id === quiz.id);
          return userQuiz ? { ...quiz, ...userQuiz } : quiz;
        });
        setQuizzes(quizzesWithStatus);
      } else {
        // For instructors, use course quizzes directly
        setQuizzes(course.quizzes);
      }
    } else {
      setQuizzes([]);
    }
  }, [course, courseId, currentUser]);

  // Check if assignment is past due date
  const isAssignmentPastDue = (assignment) => {
    if (!assignment.dueDate) return false;
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    return now > dueDate;
  };

  // Check if submission would be late
  const wouldBeLateSubmission = (assignment) => {
    if (!assignment.dueDate) return false;
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    return now > dueDate;
  };

  // Check if student can edit submission
  const canEditSubmission = (assignment, submission) => {
    if (!submission) return false;
    
    // Cannot edit if already graded
    if (submission.pointsObtained !== null) return false;
    
    // Cannot edit if past due date
    if (isAssignmentPastDue(assignment)) return false;
    
    return true;
  };

  const handleViewAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setShowViewAssignmentModal(true);
  };

  const handleSubmitAssignment = (assignmentId) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    
    // Check if assignment is past due date
    if (isAssignmentPastDue(assignment)) {
      alert('❌ This assignment is past its due date. Submissions are no longer accepted.');
      return;
    }
    
    setSelectedAssignment(assignment);
    setShowSubmitModal(true);
    setUploadedFile(null);
    setTextAnswer('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleEditFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditUploadedFile(file);
    }
  };

  const handleTextAnswerChange = (e) => {
    setTextAnswer(e.target.value);
  };

  const handleEditTextAnswerChange = (e) => {
    setEditTextAnswer(e.target.value);
  };

  const isSubmitEnabled = () => {
    return uploadedFile !== null || textAnswer.trim() !== '';
  };

  const isEditSubmitEnabled = () => {
    return editUploadedFile !== null || editTextAnswer.trim() !== '';
  };

  const confirmSubmitAssignment = async () => {
    if (!isSubmitEnabled()) {
      alert('Please either upload a file or type your answer before submitting.');
      return;
    }

    // Check if submission would be late
    const isLate = wouldBeLateSubmission(selectedAssignment);
    if (isLate) {
      const confirmLate = window.confirm(
        '⚠️ Late Submission Warning\n\n' +
        'This assignment is past its due date. Your submission will be marked as late.\n\n' +
        'Do you still want to submit?'
      );
      if (!confirmLate) {
        return;
      }
    }

    let submissionFile = null;
    
    // Upload file if provided
    if (uploadedFile) {
      try {
        const uploadResult = await uploadService.uploadSubmission(uploadedFile);
        if (uploadResult.success) {
          submissionFile = {
            name: uploadResult.file.originalName,
            size: uploadResult.file.size,
            type: uploadResult.file.mimetype,
            url: uploadResult.file.url,
            isLocal: false
          };
        }
      } catch (error) {
        console.error('Submission upload failed:', error);
        // Fallback to local file
        submissionFile = uploadedFile;
      }
    }

    const submission = {
      assignmentId: selectedAssignment.id,
      studentId: currentUser._id,
      studentName: currentUser.name,
      submittedAt: new Date().toISOString(),
      textAnswer: textAnswer.trim(),
      file: submissionFile,
      status: isLate ? 'submitted_late' : 'submitted',
      pointsObtained: null,
      instructorReview: '',
      isLate: isLate,
      version: 1
    };

    // Update assignment with submission
    setAssignments(prevAssignments => 
      prevAssignments.map(a => 
        a.id === selectedAssignment.id 
          ? { 
              ...a, 
              submitted: true,
              submission: submission,
              status: isLate ? 'submitted_late' : 'submitted'
            }
          : a
      )
    );

    // Save submission to localStorage
    const submissions = JSON.parse(localStorage.getItem(`assignment_submissions_${selectedAssignment.id}`) || '[]');
    submissions.push(submission);
    localStorage.setItem(`assignment_submissions_${selectedAssignment.id}`, JSON.stringify(submissions));

    // Update course assignments
    const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
    const updatedCourses = allCourses.map(c => {
      if (c._id === courseId && c.assignments) {
        const updatedAssignments = c.assignments.map(a => 
          a.id === selectedAssignment.id 
            ? { 
                ...a, 
                submitted: true,
                submission: submission,
                status: isLate ? 'submitted_late' : 'submitted'
              }
            : a
        );
        return { ...c, assignments: updatedAssignments };
      }
      return c;
    });
    localStorage.setItem('all_courses', JSON.stringify(updatedCourses));

    alert(`Assignment "${selectedAssignment.title}" submitted successfully!${isLate ? ' (Late Submission)' : ''}`);
    setShowSubmitModal(false);
    setUploadedFile(null);
    setTextAnswer('');
    setSelectedAssignment(null);
  };

  const handleEditSubmission = (assignment, submission) => {
    if (!canEditSubmission(assignment, submission)) {
      alert('You cannot edit this submission. It may be past the due date or already graded.');
      return;
    }
    
    setSelectedAssignment(assignment);
    setEditingSubmission(submission);
    setEditTextAnswer(submission.textAnswer || '');
    setEditUploadedFile(null);
    setShowEditSubmissionModal(true);
  };

  const confirmEditSubmission = async () => {
    if (!isEditSubmitEnabled()) {
      alert('Please either upload a file or type your answer before submitting.');
      return;
    }

    const isLate = wouldBeLateSubmission(selectedAssignment);

    let submissionFile = editingSubmission.file;
    
    // Upload new file if provided
    if (editUploadedFile) {
      try {
        const uploadResult = await uploadService.uploadSubmission(editUploadedFile);
        if (uploadResult.success) {
          submissionFile = {
            name: uploadResult.file.originalName,
            size: uploadResult.file.size,
            type: uploadResult.file.mimetype,
            url: uploadResult.file.url,
            isLocal: false
          };
        }
      } catch (error) {
        console.error('Submission upload failed:', error);
        // Fallback to local file
        submissionFile = editUploadedFile;
      }
    }

    const updatedSubmission = {
      ...editingSubmission,
      textAnswer: editTextAnswer.trim(),
      file: submissionFile,
      submittedAt: new Date().toISOString(),
      status: isLate ? 'submitted_late' : 'submitted',
      isLate: isLate,
      version: (editingSubmission.version || 1) + 1
    };

    // Update submission in localStorage
    const submissions = JSON.parse(localStorage.getItem(`assignment_submissions_${selectedAssignment.id}`) || '[]');
    const updatedSubmissions = submissions.map(sub => 
      sub.studentId === currentUser._id && sub.assignmentId === selectedAssignment.id
        ? updatedSubmission
        : sub
    );
    localStorage.setItem(`assignment_submissions_${selectedAssignment.id}`, JSON.stringify(updatedSubmissions));

    // Update assignment with updated submission
    setAssignments(prevAssignments => 
      prevAssignments.map(a => 
        a.id === selectedAssignment.id 
          ? { 
              ...a, 
              submission: updatedSubmission
            }
          : a
      )
    );

    // Update course assignments
    const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
    const updatedCourses = allCourses.map(c => {
      if (c._id === courseId && c.assignments) {
        const updatedAssignments = c.assignments.map(a => 
          a.id === selectedAssignment.id 
            ? { 
                ...a, 
                submission: updatedSubmission
              }
            : a
        );
        return { ...c, assignments: updatedAssignments };
      }
      return c;
    });
    localStorage.setItem('all_courses', JSON.stringify(updatedCourses));

    alert(`Assignment "${selectedAssignment.title}" updated successfully!${isLate ? ' (Late Submission)' : ''}`);
    setShowEditSubmissionModal(false);
    setEditUploadedFile(null);
    setEditTextAnswer('');
    setEditingSubmission(null);
    setSelectedAssignment(null);
  };

  const handlePreviewFile = (file) => {
    if (!file) return;
    
    if (file.url) {
      // Open file in new tab for preview
      window.open(file.url, '_blank');
    } else if (file instanceof File) {
      // Create object URL for local file preview
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
    }
  };

  const handleViewMaterial = (material) => {
    try {
      // Check if material has a backend file URL
      if (material.file && material.file.url && !material.file.isLocal) {
        // For backend files, open in new tab for viewing
        window.open(material.file.url, '_blank');
      }
      // Check if material has a file object
      else if (material.file && material.file instanceof File) {
        // Create object URL for local file viewing
        const url = URL.createObjectURL(material.file);
        window.open(url, '_blank');
      } else if (material.fileUrl) {
        // If there's a file URL, open in new tab
        window.open(material.fileUrl, '_blank');
      } else {
        // Fallback: create text file with material info and open in new tab
        const content = `Study Material: ${material.title}\n\nDescription: ${material.description || 'No description provided.'}\n\nCourse: ${course.title}\nInstructor: ${course.instructor?.name || 'Unknown Instructor'}\n\nThis is a study material file for your course.`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }

      // Update view count instead of download count
      const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
      const updatedCourses = allCourses.map(c => {
        if (c._id === courseId && c.materials) {
          const updatedMaterials = c.materials.map(m => 
            m.id === material.id 
              ? { ...m, views: (m.views || 0) + 1 }
              : m
          );
          return { ...c, materials: updatedMaterials };
        }
        return c;
      });
      localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
      
    } catch (error) {
      console.error('Error viewing material:', error);
      alert('Error viewing material. Please try again.');
    }
  };

  const handleViewAssignmentFile = (assignment) => {
    if (!assignment.file) return;
    
    try {
      if (assignment.file.url) {
        // Open assignment file in new tab for viewing
        window.open(assignment.file.url, '_blank');
      } else if (assignment.file instanceof File) {
        // Create object URL for local file viewing
        const url = URL.createObjectURL(assignment.file);
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error viewing assignment file:', error);
      alert('Error viewing assignment file. Please try again.');
    }
  };

  const handleStartQuiz = (quiz) => {
    const confirmed = window.confirm(
      `Start Quiz: "${quiz.title}"?\n\n` +
      `Questions: ${quiz.totalQuestions}\n` +
      `Time Limit: ${quiz.timeLimit} minutes\n` +
      `Points: ${quiz.points}\n\n` +
      `Instructions: ${quiz.instructions || 'No specific instructions.'}`
    );

    if (confirmed) {
      // Navigate to quiz component with quiz data
      navigate(`/quiz/${quiz.id}`, { state: { quiz, courseId } });
    }
  };

  const handleMarkLectureComplete = (lectureId) => {
    setCompletedLectures(prev => {
      const newCompleted = new Set(prev);
      newCompleted.add(lectureId);
      return newCompleted;
    });
  };

const handleContinueLearning = () => {
  // Get completed lectures from localStorage
  const completedLecturesKey = `user_${currentUser._id}_course_${courseId}_completed_lectures`;
  const savedCompleted = localStorage.getItem(completedLecturesKey);
  const completedLectures = savedCompleted ? new Set(JSON.parse(savedCompleted)) : new Set();
  
  console.log('Completed lectures:', [...completedLectures]);
  console.log('Total course lectures:', course.lectures?.length);

  // Find the first incomplete lecture
  let targetLectureId = null;
  
  if (course.lectures && course.lectures.length > 0) {
    // Find the first lecture that is not completed
    const incompleteLecture = course.lectures.find(lecture => !completedLectures.has(lecture.id));
    
    if (incompleteLecture) {
      targetLectureId = incompleteLecture.id;
      console.log('First incomplete lecture found:', incompleteLecture.title, 'ID:', targetLectureId);
    } else {
      // All lectures are completed, start from the first lecture
      targetLectureId = course.lectures[0].id;
      console.log('All lectures completed, starting from first:', course.lectures[0].title);
    }
  }

  if (targetLectureId) {
    // Navigate to course player with the specific lecture to start from
    navigate(`/course/${courseId}`, { 
      state: { 
        startFromLectureId: targetLectureId
      } 
    });
  } else {
    // No lectures available, navigate to content tab
    navigate(`/course/${courseId}`, { 
      state: { 
        activeTab: 'content'
      } 
    });
  }
};

  // Rating functionality
  const handleRateCourse = () => {
    if (!currentUser) {
      alert('Please login to rate this course');
      return;
    }
    setShowRatingModal(true);
    // Load user's existing rating if any
    const existingRating = course.ratings?.find(r => r.userId === currentUser._id);
    if (existingRating) {
      setUserRating(existingRating.rating);
      setRatingComment(existingRating.comment || '');
    }
  };

  const handleSubmitRating = () => {
    if (userRating === 0) {
      alert('Please select a rating');
      return;
    }

    const rating = {
      id: Date.now().toString(),
      userId: currentUser._id,
      userName: currentUser.name,
      rating: userRating,
      comment: ratingComment,
      date: new Date().toISOString()
    };

    // Get existing ratings
    const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
    const updatedCourses = allCourses.map(c => {
      if (c._id === courseId) {
        const existingRatings = c.ratings || [];
        const userExistingRatingIndex = existingRatings.findIndex(r => r.userId === currentUser._id);
        
        let newRatings;
        if (userExistingRatingIndex !== -1) {
          // Update existing rating
          newRatings = [...existingRatings];
          newRatings[userExistingRatingIndex] = rating;
        } else {
          // Add new rating
          newRatings = [...existingRatings, rating];
        }

        // Calculate new average rating
        const totalRating = newRatings.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = (totalRating / newRatings.length).toFixed(1);

        return {
          ...c,
          ratings: newRatings,
          averageRating: parseFloat(averageRating),
          totalRatings: newRatings.length
        };
      }
      return c;
    });

    localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
    setShowRatingModal(false);
    setUserRating(0);
    setRatingComment('');
    
    alert('Thank you for your rating!');
    window.location.reload(); // Refresh to show updated rating
  };

  const getUserRating = () => {
    if (!course.ratings) return 0;
    const userRating = course.ratings.find(r => r.userId === currentUser?._id);
    return userRating ? userRating.rating : 0;
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return '📎';
    
    switch (fileType.toLowerCase()) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'ppt':
      case 'pptx': return '📊';
      case 'zip':
      case 'rar': return '📦';
      case 'mp4':
      case 'mov':
      case 'avi': return '🎬';
      case 'mp3':
      case 'wav': return '🎵';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      default: return '📎';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Enhanced material card
  const MaterialCard = ({ material }) => {
    const [isHovered, setIsHovered] = useState(false);

    const cardStyle = {
      ...styles.materialCard,
      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 8px 25px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)',
      borderColor: isHovered ? '#4f46e5' : '#e5e7eb'
    };

    const viewButtonStyle = {
      ...styles.viewButton,
      backgroundColor: isHovered ? '#3b82f6' : '#2563eb',
      transform: isHovered ? 'translateY(-1px)' : 'translateY(0)'
    };

    return (
      <div 
        style={cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={styles.materialHeader}>
          <div style={styles.materialIconContainer}>
            <span style={styles.materialIcon}>
              {getFileIcon(material.type)}
            </span>
          </div>
          <div style={styles.materialInfo}>
            <h3 style={styles.materialTitle}>{material.title}</h3>
            <p style={styles.materialDescription}>{material.description}</p>
            <div style={styles.materialMeta}>
              <span style={styles.materialType}>
                {material.type?.toUpperCase() || 'FILE'}
              </span>
              <span style={styles.materialSize}>• {material.size || 'Unknown size'}</span>
              <span style={styles.materialViews}>• 👁️ {material.views || 0} views</span>
            </div>
            <div style={styles.materialDate}>
              📅 Uploaded on {formatDate(material.uploaded)}
            </div>
          </div>
        </div>
        
        <div style={styles.materialActions}>
          <button
            onClick={() => handleViewMaterial(material)}
            style={viewButtonStyle}
          >
            <span style={styles.viewIcon}>👁️</span>
            View
          </button>
        </div>
      </div>
    );
  };

  // Instructor functions for grading
  const handleGradeAssignment = (assignment) => {
    const submissions = JSON.parse(localStorage.getItem(`assignment_submissions_${assignment.id}`) || '[]');
    
    if (submissions.length > 0) {
      setSelectedSubmission(submissions[0]);
      setSelectedAssignment(assignment);
      setInstructorReview(submissions[0].instructorReview || '');
      setPointsObtained(submissions[0].pointsObtained || 0);
      setShowGradeModal(true);
    } else {
      alert('No submissions found for this assignment.');
    }
  };

  const handleViewAllSubmissions = (assignment) => {
    const submissions = JSON.parse(localStorage.getItem(`assignment_submissions_${assignment.id}`) || '[]');
    
    if (submissions.length === 0) {
      alert('No submissions found for this assignment.');
      return;
    }

    // For now, we'll just show the first submission in the grading modal
    // In a real app, you might want to create a separate modal to list all submissions
    setSelectedSubmission(submissions[0]);
    setSelectedAssignment(assignment);
    setInstructorReview(submissions[0].instructorReview || '');
    setPointsObtained(submissions[0].pointsObtained || 0);
    setShowGradeModal(true);
  };

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

    // Update assignment status for student
    if (currentUser.role === 'student') {
      setAssignments(prevAssignments => 
        prevAssignments.map(a => 
          a.id === selectedAssignment.id 
            ? { 
                ...a, 
                submission: {
                  ...a.submission,
                  pointsObtained: pointsObtained,
                  instructorReview: instructorReview,
                  gradedAt: new Date().toISOString(),
                  status: 'graded'
                }
              }
            : a
        )
      );
    }

    // Update the course assignments in all_courses
    const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
    const updatedCourses = allCourses.map(c => {
      if (c._id === courseId && c.assignments) {
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
  };

  // Calculate quiz progress
  const attemptedQuizzes = quizzes.filter(q => q.attempted);
  const totalQuizzes = quizzes.length;
  const averageScore = attemptedQuizzes.length > 0 
    ? Math.round(attemptedQuizzes.reduce((acc, q) => acc + q.bestScore, 0) / attemptedQuizzes.length)
    : 0;

  // Calculate assignment progress
  const submittedAssignments = assignments.filter(a => a.submitted);
  const totalAssignments = assignments.length;

  return (
    <div style={styles.container}>
      {/* Submit Assignment Modal */}
      {showSubmitModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Submit Assignment</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowSubmitModal(false)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <h4 style={styles.assignmentModalTitle}>{selectedAssignment?.title}</h4>
              <p style={styles.assignmentInstructions}>
                <strong>Instructions:</strong> {selectedAssignment?.instructions}
              </p>
              <p style={styles.assignmentDetails}>
                <strong>Due Date:</strong> {selectedAssignment?.dueDate ? new Date(selectedAssignment.dueDate).toLocaleString() : 'No deadline'}<br />
                <strong>Points:</strong> {selectedAssignment?.points}
              </p>
              
              {/* Late submission warning */}
              {wouldBeLateSubmission(selectedAssignment) && (
                <div style={styles.lateWarning}>
                  <strong>⚠️ Late Submission</strong>
                  <p>This assignment is past its due date. Your submission will be marked as late.</p>
                </div>
              )}
              
              <div style={styles.uploadSection}>
                <label style={styles.uploadLabel}>Upload Your Work (Optional):</label>
                <div style={styles.uploadArea}>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    style={styles.fileInput}
                    id="assignment-file"
                  />
                  <label htmlFor="assignment-file" style={styles.uploadButton}>
                    📁 Choose File
                  </label>
                  {uploadedFile && (
                    <div style={styles.fileInfo}>
                      <span style={styles.fileName}>📄 {uploadedFile.name}</span>
                      <span style={styles.fileSize}>
                        ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.textAnswerSection}>
                <label style={styles.uploadLabel}>Or Type Your Answer Below (Optional):</label>
                <textarea
                  value={textAnswer}
                  onChange={handleTextAnswerChange}
                  style={styles.textAnswerInput}
                  placeholder="Type your answer here..."
                  rows="6"
                />
              </div>

              <div style={styles.submitInfo}>
                <p style={styles.submitNote}>
                  💡 <strong>Note:</strong> You must either upload a file OR type an answer to submit the assignment.
                </p>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button 
                style={styles.cancelButton}
                onClick={() => setShowSubmitModal(false)}
              >
                Cancel
              </button>
              <button 
                style={{
                  ...styles.submitModalButton,
                  ...(!isSubmitEnabled() ? styles.disabledButton : {})
                }}
                onClick={confirmSubmitAssignment}
                disabled={!isSubmitEnabled()}
              >
                {wouldBeLateSubmission(selectedAssignment) ? 'Submit Late' : 'Submit Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Submission Modal */}
      {showEditSubmissionModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Edit Submission</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowEditSubmissionModal(false)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <h4 style={styles.assignmentModalTitle}>{selectedAssignment?.title}</h4>
              <p style={styles.assignmentInstructions}>
                <strong>Instructions:</strong> {selectedAssignment?.instructions}
              </p>
              <p style={styles.assignmentDetails}>
                <strong>Due Date:</strong> {selectedAssignment?.dueDate ? new Date(selectedAssignment.dueDate).toLocaleString() : 'No deadline'}<br />
                <strong>Points:</strong> {selectedAssignment?.points}
              </p>
              
              {/* Late submission warning */}
              {wouldBeLateSubmission(selectedAssignment) && (
                <div style={styles.lateWarning}>
                  <strong>⚠️ Late Submission</strong>
                  <p>This assignment is past its due date. Your submission will be marked as late.</p>
                </div>
              )}
              
              <div style={styles.uploadSection}>
                <label style={styles.uploadLabel}>Upload New File (Optional):</label>
                <div style={styles.uploadArea}>
                  <input
                    type="file"
                    onChange={handleEditFileUpload}
                    style={styles.fileInput}
                    id="edit-assignment-file"
                  />
                  <label htmlFor="edit-assignment-file" style={styles.uploadButton}>
                    📁 Choose File
                  </label>
                  {editUploadedFile && (
                    <div style={styles.fileInfo}>
                      <span style={styles.fileName}>📄 {editUploadedFile.name}</span>
                      <span style={styles.fileSize}>
                        ({(editUploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                  {editingSubmission?.file && !editUploadedFile && (
                    <div style={styles.fileInfo}>
                      <span 
                        style={{...styles.fileName, cursor: 'pointer', textDecoration: 'underline'}}
                        onClick={() => handlePreviewFile(editingSubmission.file)}
                      >
                        📄 {editingSubmission.file.name} (Click to preview)
                      </span>
                      <span style={styles.fileSize}>
                        ({(editingSubmission.file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.textAnswerSection}>
                <label style={styles.uploadLabel}>Edit Your Answer Below (Optional):</label>
                <textarea
                  value={editTextAnswer}
                  onChange={handleEditTextAnswerChange}
                  style={styles.textAnswerInput}
                  placeholder="Type your answer here..."
                  rows="6"
                />
              </div>

              <div style={styles.submitInfo}>
                <p style={styles.submitNote}>
                  💡 <strong>Note:</strong> You can upload a new file OR update your text answer. The instructor will see your latest submission.
                </p>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button 
                style={styles.cancelButton}
                onClick={() => setShowEditSubmissionModal(false)}
              >
                Cancel
              </button>
              <button 
                style={{
                  ...styles.submitModalButton,
                  ...(!isEditSubmitEnabled() ? styles.disabledButton : {})
                }}
                onClick={confirmEditSubmission}
                disabled={!isEditSubmitEnabled()}
              >
                {wouldBeLateSubmission(selectedAssignment) ? 'Update Late Submission' : 'Update Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Assignment Modal */}
      {showViewAssignmentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{selectedAssignment?.title}</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowViewAssignmentModal(false)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.assignmentDetails}>
                <p><strong>Description:</strong> {selectedAssignment?.description}</p>
                <p><strong>Instructions:</strong> {selectedAssignment?.instructions}</p>
                <p><strong>Due Date:</strong> {selectedAssignment?.dueDate ? new Date(selectedAssignment.dueDate).toLocaleString() : 'No deadline'}</p>
                <p><strong>Points:</strong> {selectedAssignment?.points}</p>
              </div>

              {selectedAssignment?.file && (
                <div style={styles.assignmentFileSection}>
                  <h4 style={styles.sectionTitle}>Assignment File</h4>
                  <div style={styles.fileViewCard}>
                    <span style={styles.fileIcon}>
                      {getFileIcon(selectedAssignment.file.type)}
                    </span>
                    <div style={styles.fileInfo}>
                      <span 
                        style={{...styles.fileName, cursor: 'pointer', textDecoration: 'underline'}}
                        onClick={() => handleViewAssignmentFile(selectedAssignment)}
                      >
                        {selectedAssignment.file.name}
                      </span>
                      <span style={styles.fileSize}>
                        {(selectedAssignment.file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {currentUser?.role === 'instructor' && (
                <div style={styles.submissionSection}>
                  <h4 style={styles.sectionTitle}>Student Submissions</h4>
                  {(() => {
                    const submissions = JSON.parse(localStorage.getItem(`assignment_submissions_${selectedAssignment.id}`) || '[]');
                    
                    if (submissions.length === 0) {
                      return <p>No submissions yet.</p>;
                    }

                    return submissions.map((submission, index) => (
                      <div key={index} style={styles.submissionItem}>
                        <div style={styles.submissionHeader}>
                          <strong>Student: {submission.studentName}</strong>
                          <span style={styles.submissionDate}>
                            Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                            {submission.isLate && <span style={styles.lateBadge}> ⏰ LATE</span>}
                            {submission.version > 1 && <span style={styles.versionBadge}> v{submission.version}</span>}
                          </span>
                        </div>
                        
                        {submission.textAnswer && (
                          <div style={styles.textAnswerBox}>
                            <strong>Text Answer:</strong>
                            <div style={styles.answerText}>
                              {submission.textAnswer}
                            </div>
                          </div>
                        )}
                        
                        {submission.file && (
                          <div style={styles.submissionFile}>
                            <strong>Submitted File:</strong>
                            <div style={styles.fileViewCard}>
                              <span style={styles.fileIcon}>
                                {getFileIcon(submission.file.type)}
                              </span>
                              <div style={styles.fileInfo}>
                                <span 
                                  style={{...styles.fileName, cursor: 'pointer', textDecoration: 'underline'}}
                                  onClick={() => handlePreviewFile(submission.file)}
                                >
                                  {submission.file.name} (Click to preview)
                                </span>
                                <span style={styles.fileSize}>
                                  {(submission.file.size / (1024 * 1024)).toFixed(2)} MB
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {submission.pointsObtained !== null && (
                          <div style={styles.gradeSection}>
                            <p><strong>Points Obtained:</strong> {submission.pointsObtained} / {selectedAssignment.points}</p>
                            {submission.instructorReview && (
                              <div style={styles.reviewSection}>
                                <strong>Instructor Review:</strong>
                                <div style={styles.reviewText}>
                                  {submission.instructorReview}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <button
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setInstructorReview(submission.instructorReview || '');
                            setPointsObtained(submission.pointsObtained || 0);
                            setShowGradeModal(true);
                          }}
                          style={styles.gradeButton}
                        >
                          {submission.pointsObtained !== null ? 'Update Grade' : 'Grade Submission'}
                        </button>
                        
                        <hr style={styles.submissionDivider} />
                      </div>
                    ));
                  })()}
                </div>
              )}

              {currentUser?.role === 'student' && selectedAssignment?.submission && (
                <div style={styles.submissionSection}>
                  <h4 style={styles.sectionTitle}>Your Submission</h4>
                  <div style={styles.submissionHeader}>
                    <span style={styles.submissionDate}>
                      Submitted: {new Date(selectedAssignment.submission.submittedAt).toLocaleString()}
                      {selectedAssignment.submission.isLate && <span style={styles.lateBadge}> ⏰ LATE</span>}
                      {selectedAssignment.submission.version > 1 && <span style={styles.versionBadge}> v{selectedAssignment.submission.version}</span>}
                    </span>
                  </div>
                  
                  {selectedAssignment.submission.textAnswer && (
                    <div style={styles.textAnswerBox}>
                      <strong>Your Text Answer:</strong>
                      <div style={styles.answerText}>
                        {selectedAssignment.submission.textAnswer}
                      </div>
                    </div>
                  )}
                  {selectedAssignment.submission.file && (
                    <div style={styles.submissionFile}>
                      <strong>Your Submitted File:</strong>
                      <div style={styles.fileViewCard}>
                        <span style={styles.fileIcon}>
                          {getFileIcon(selectedAssignment.submission.file.type)}
                        </span>
                        <div style={styles.fileInfo}>
                          <span 
                            style={{...styles.fileName, cursor: 'pointer', textDecoration: 'underline'}}
                            onClick={() => handlePreviewFile(selectedAssignment.submission.file)}
                          >
                            {selectedAssignment.submission.file.name} (Click to preview)
                          </span>
                          <span style={styles.fileSize}>
                            {(selectedAssignment.submission.file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedAssignment.submission.pointsObtained !== null && (
                    <div style={styles.gradeSection}>
                      <h4 style={styles.sectionTitle}>Grading</h4>
                      <p><strong>Points Obtained:</strong> {selectedAssignment.submission.pointsObtained} / {selectedAssignment.points}</p>
                      {selectedAssignment.submission.instructorReview && (
                        <div style={styles.reviewSection}>
                          <strong>Instructor Review:</strong>
                          <div style={styles.reviewText}>
                            {selectedAssignment.submission.instructorReview}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!canEditSubmission(selectedAssignment, selectedAssignment.submission) && selectedAssignment.submission.pointsObtained === null && (
                    <div style={styles.cannotEditNotice}>
                      <p>⚠️ You cannot edit this submission because {isAssignmentPastDue(selectedAssignment) ? 'the due date has passed.' : 'it has already been graded.'}</p>
                    </div>
                  )}
                </div>
              )}
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
              <p><strong>Student:</strong> {selectedSubmission?.studentName}</p>
              
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

      {/* Rating Modal */}
      {showRatingModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Rate This Course</h3>
              <button 
                style={styles.closeButton}
                onClick={() => setShowRatingModal(false)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <h4 style={styles.ratingModalTitle}>{course.title}</h4>
              <div style={styles.ratingSection}>
                <label style={styles.ratingLabel}>Your Rating:</label>
                <div style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      style={styles.starButton}
                      onClick={() => setUserRating(star)}
                    >
                      {star <= userRating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
                <div style={styles.ratingText}>
                  {userRating === 0 ? 'Select a rating' : `${userRating} out of 5 stars`}
                </div>
              </div>
              <div style={styles.commentSection}>
                <label style={styles.commentLabel}>Your Review (Optional):</label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  style={styles.commentTextarea}
                  placeholder="Share your experience with this course..."
                  rows="4"
                />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button 
                style={styles.cancelButton}
                onClick={() => setShowRatingModal(false)}
              >
                Cancel
              </button>
              <button 
                style={styles.submitModalButton}
                onClick={handleSubmitRating}
                disabled={userRating === 0}
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.courseHeaderTop}>
            <h1 style={styles.courseTitle}>{course.title}</h1>
            <div style={styles.ratingSectionHeader}>
              <div style={styles.courseRating}>
                <span style={styles.ratingStars}>
                  {'⭐'.repeat(Math.floor(course.averageRating || 0))}
                  {'☆'.repeat(5 - Math.floor(course.averageRating || 0))}
                </span>
                <span style={styles.ratingText}>
                  {course.averageRating ? course.averageRating.toFixed(1) : 'No ratings yet'}
                  {course.totalRatings && ` (${course.totalRatings} reviews)`}
                </span>
              </div>
              {currentUser?.role === 'student' && (
                <button 
                  onClick={handleRateCourse}
                  style={styles.rateButton}
                >
                  {getUserRating() > 0 ? 'Update Rating' : 'Rate Course'}
                </button>
              )}
            </div>
          </div>
          <p style={styles.courseInstructor}>By {course.instructor.name}</p>
          <p style={styles.courseDescription}>{course.description}</p>
        </div>
      </div>

      {/* Continue Learning Button */}
      <div style={styles.continueLearningSection}>
        <button 
          onClick={handleContinueLearning}
          style={styles.continueLearningButton}
        >
          Continue Learning
        </button>
      </div>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'content' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('content')}
        >
          📺 Course Content
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'assignments' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('assignments')}
        >
          📝 Assignments ({assignments.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'quizzes' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('quizzes')}
        >
          🧩 Quizzes ({quizzes.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'materials' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('materials')}
        >
          📚 Materials ({course.materials.length})
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'assignments' && (
          <div style={styles.assignmentsSection}>
            <h2 style={styles.sectionTitle}>Course Assignments</h2>
            <p style={styles.sectionSubtitle}>
              Complete these assignments to practice your skills and get feedback from instructors.
            </p>
            
            {/* Assignment Progress */}
            <div style={styles.assignmentProgress}>
              <h4 style={styles.progressTitle}>📊 Assignment Progress</h4>
              <div style={styles.progressStats}>
                <div style={styles.progressStat}>
                  <span style={styles.progressNumber}>
                    {submittedAssignments.length}
                  </span>
                  <span style={styles.progressLabel}>Submitted</span>
                </div>
                <div style={styles.progressStat}>
                  <span style={styles.progressNumber}>
                    {totalAssignments}
                  </span>
                  <span style={styles.progressLabel}>Total Assignments</span>
                </div>
                <div style={styles.progressStat}>
                  <span style={styles.progressNumber}>
                    {totalAssignments > 0 ? Math.round((submittedAssignments.length / totalAssignments) * 100) : 0}%
                  </span>
                  <span style={styles.progressLabel}>Completion</span>
                </div>
              </div>
            </div>
            
            <div style={styles.assignmentsList}>
              {assignments.map(assignment => {
                const isPastDue = isAssignmentPastDue(assignment);
                const isSubmitted = assignment.submitted;
                
                return (
                  <div key={assignment.id} style={styles.assignmentCard}>
                    <div style={styles.assignmentHeader}>
                      <h3 style={styles.assignmentTitle}>{assignment.title}</h3>
                      <div style={styles.assignmentPoints}>{assignment.points} points</div>
                    </div>
                    
                    <p style={styles.assignmentDescription}>{assignment.description}</p>
                    
                    <div style={styles.assignmentInstructions}>
                      <strong>Instructions:</strong> {assignment.instructions}
                    </div>
                    
                    <div style={styles.assignmentFooter}>
                      <div style={styles.assignmentMeta}>
                        <span style={styles.dueDate}>
                          📅 Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'No deadline'}
                          {isPastDue && !isSubmitted && <span style={styles.pastDueBadge}> ⏰ PAST DUE</span>}
                        </span>
                        {assignment.submitted && assignment.submission && (
                          <div style={styles.submissionInfo}>
                            <span style={styles.submittedStatus}>
                              {assignment.submission.isLate ? '⏰ Submitted Late' : '✅ Submitted'}
                              {assignment.submission.version > 1 && ` (v${assignment.submission.version})`}
                            </span>
                            {assignment.submission.pointsObtained !== null && (
                              <span style={styles.gradeStatus}>
                                🎯 Grade: {assignment.submission.pointsObtained}/{assignment.points}
                              </span>
                            )}
                            <span style={styles.submissionDate}>
                              On: {new Date(assignment.submission.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {!assignment.submitted && isPastDue && (
                          <span style={styles.pastDueStatus}>❌ Submission Closed</span>
                        )}
                        {!assignment.submitted && !isPastDue && (
                          <span style={styles.pendingStatus}>⏳ Pending Submission</span>
                        )}
                      </div>
                      
                      <div style={styles.assignmentActions}>
                        {currentUser?.role === 'instructor' ? (
                          <button
                            onClick={() => handleViewAssignment(assignment)}
                            style={styles.viewButton}
                          >
                            View Submissions
                          </button>
                        ) : (
                          <button
                            onClick={() => handleViewAssignment(assignment)}
                            style={styles.viewButton}
                          >
                            View Assignment
                          </button>
                        )}
                        
                        {currentUser?.role === 'student' && !assignment.submitted ? (
                          <button
                            onClick={() => handleSubmitAssignment(assignment.id)}
                            style={isPastDue ? styles.disabledButton : styles.submitButton}
                            disabled={isPastDue}
                          >
                            {isPastDue ? 'Past Due' : 'Submit Assignment'}
                          </button>
                        ) : currentUser?.role === 'student' && assignment.submitted && canEditSubmission(assignment, assignment.submission) && (
                          <button
                            onClick={() => handleEditSubmission(assignment, assignment.submission)}
                            style={styles.editButton}
                          >
                            Edit Submission
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div style={styles.quizzesSection}>
            <h2 style={styles.sectionTitle}>Course Quizzes</h2>
            <p style={styles.sectionSubtitle}>
              Test your knowledge and track your progress with these interactive quizzes.
            </p>
            
            {/* Quiz Progress Summary */}
            <div style={styles.quizProgress}>
              <h4 style={styles.progressTitle}>📈 Your Quiz Progress</h4>
              <div style={styles.progressStats}>
                <div style={styles.progressStat}>
                  <span style={styles.progressNumber}>
                    {attemptedQuizzes.length}
                  </span>
                  <span style={styles.progressLabel}>Quizzes Attempted</span>
                </div>
                <div style={styles.progressStat}>
                  <span style={styles.progressNumber}>
                    {totalQuizzes}
                  </span>
                  <span style={styles.progressLabel}>Total Quizzes</span>
                </div>
                <div style={styles.progressStat}>
                  <span style={styles.progressNumber}>
                    {averageScore}%
                  </span>
                  <span style={styles.progressLabel}>Average Score</span>
                </div>
              </div>
              {attemptedQuizzes.length === 0 && (
                <p style={styles.noAttemptsText}>
                  Start your first quiz to track your progress!
                </p>
              )}
            </div>

            <div style={styles.quizzesList}>
              {quizzes.map(quiz => (
                <div key={quiz.id} style={styles.quizCard}>
                  <div style={styles.quizHeader}>
                    <h3 style={styles.quizTitle}>{quiz.title}</h3>
                    <div style={styles.quizPoints}>{quiz.points} points</div>
                  </div>
                  
                  <p style={styles.quizDescription}>{quiz.description}</p>
                  
                  <div style={styles.quizInstructions}>
                    <strong>Instructions:</strong> {quiz.instructions || 'No specific instructions provided.'}
                  </div>
                  
                  <div style={styles.quizMeta}>
                    <div style={styles.quizDetails}>
                      <span style={styles.quizDetail}>
                        📊 {quiz.totalQuestions} questions
                      </span>
                      <span style={styles.quizDetail}>
                        ⏱️ {quiz.timeLimit} minutes
                      </span>
                      {quiz.attempted ? (
                        <span style={styles.quizScore}>
                          🏆 Best Score: {quiz.bestScore}%
                        </span>
                      ) : (
                        <span style={styles.quizStatus}>
                          🔄 Not Attempted
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleStartQuiz(quiz)}
                      style={quiz.attempted ? styles.retakeButton : styles.startQuizButton}
                    >
                      {quiz.attempted ? 'Retake Quiz' : 'Start Quiz'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div style={styles.materialsSection}>
            <div style={styles.materialsHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Course Materials</h2>
                <p style={styles.sectionSubtitle}>
                  View additional resources to enhance your learning experience.
                </p>
              </div>
              <div style={styles.materialsStats}>
                <div style={styles.statItem}>
                  <span style={styles.statNumber}>{course.materials.length}</span>
                  <span style={styles.statLabel}>Files</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statNumber}>
                    {course.materials.reduce((acc, material) => acc + (material.views || 0), 0).toLocaleString()}
                  </span>
                  <span style={styles.statLabel}>Total Views</span>
                </div>
              </div>
            </div>
            
            {course.materials.length > 0 ? (
              <div style={styles.materialsGrid}>
                {course.materials.map(material => (
                  <MaterialCard key={material.id} material={material} />
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📚</div>
                <h3>No Materials Available</h3>
                <p>The instructor hasn't uploaded any study materials for this course yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div style={styles.contentSection}>
            <h2 style={styles.sectionTitle}>Course Content</h2>
            <p style={styles.sectionSubtitle}>
              Continue learning from where you left off.
            </p>
            
            <div style={styles.lecturesList}>
              {course.lectures && course.lectures.length > 0 ? (
                course.lectures.map(lecture => (
                  <div key={lecture.id} style={styles.lectureItem}>
                    <div style={styles.lectureInfo}>
                      <div style={styles.lectureStatusIcon}>
                        {completedLectures.has(lecture.id) ? (
                          <span style={styles.completedIcon}>✅</span>
                        ) : (
                          <span style={styles.pendingIcon}>⏳</span>
                        )}
                      </div>
                      <div style={styles.lectureDetails}>
                        <h3 style={styles.lectureTitle}>{lecture.title}</h3>
                        <span style={styles.lectureDuration}>{lecture.duration}</span>
                      </div>
                    </div>
                    <div style={styles.lectureStatus}>
                      {completedLectures.has(lecture.id) ? (
                        <span style={styles.completedText}>✅ Completed</span>
                      ) : (
                        <span style={styles.pendingText}>⏳ Pending</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyLectures}>
                  <div style={styles.emptyIcon}>📺</div>
                  <h3>No lectures available yet</h3>
                  <p>The instructor hasn't uploaded any lectures for this course.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 80px)',
    backgroundColor: '#f8fafc'
  },
  header: {
    backgroundColor: 'white',
    padding: '40px 0',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px'
  },
  courseHeaderTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  courseTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: '8px',
    flex: 1
  },
  ratingSectionHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '10px'
  },
  courseRating: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px'
  },
  ratingStars: {
    fontSize: '20px'
  },
  ratingText: {
    fontSize: '14px',
    color: '#6b7280'
  },
  rateButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px'
  },
  courseInstructor: {
    fontSize: '18px',
    color: '#6b7280',
    marginBottom: '12px'
  },
  courseDescription: {
    fontSize: '16px',
    color: '#6b7280',
    maxWidth: '800px',
    lineHeight: '1.6'
  },
  continueLearningSection: {
    backgroundColor: 'white',
    padding: '20px 0',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'center'
  },
  continueLearningButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },
  tabs: {
    display: 'flex',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '16px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    fontSize: '16px',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flex: '1',
    minWidth: '120px'
  },
  activeTab: {
    color: '#4f46e5',
    borderBottomColor: '#4f46e5'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: '16px'
  },
  sectionSubtitle: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.6'
  },
  // Modal Styles
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
    borderRadius: '8px',
    padding: '0',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: 0,
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '24px'
  },
  assignmentModalTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '12px'
  },
  assignmentInstructions: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
    lineHeight: '1.5'
  },
  assignmentDetails: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  uploadSection: {
    marginBottom: '20px'
  },
  uploadLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  uploadArea: {
    border: '2px dashed #d1d5db',
    borderRadius: '6px',
    padding: '20px',
    textAlign: 'center',
    transition: 'border-color 0.2s ease'
  },
  fileInput: {
    display: 'none'
  },
  uploadButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '12px'
  },
  fileInfo: {
    marginTop: '12px'
  },
  fileName: {
    fontSize: '14px',
    color: '#1a202c',
    fontWeight: '500'
  },
  fileSize: {
    fontSize: '12px',
    color: '#6b7280',
    marginLeft: '8px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  submitModalButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  // Rating Modal Styles
  ratingModalTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '20px',
    textAlign: 'center'
  },
  ratingSection: {
    marginBottom: '20px'
  },
  ratingLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '12px'
  },
  starsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  starButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    padding: '4px',
    transition: 'transform 0.2s ease'
  },
  ratingText: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280'
  },
  commentSection: {
    marginBottom: '20px'
  },
  commentLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  commentTextarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  // Assignments Section
  assignmentsSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  assignmentProgress: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #e5e7eb'
  },
  progressTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '16px'
  },
  progressStats: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap'
  },
  progressStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  progressNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4f46e5'
  },
  progressLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },
  assignmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  assignmentCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
    backgroundColor: 'white',
    transition: 'box-shadow 0.2s ease'
  },
  assignmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  assignmentTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
    margin: 0
  },
  assignmentPoints: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  assignmentDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: '1.5'
  },
  assignmentInstructions: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '16px',
    lineHeight: '1.5',
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '4px',
    borderLeft: '3px solid #4f46e5'
  },
  assignmentFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  assignmentMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
  },
  dueDate: {
    fontSize: '14px',
    color: '#6b7280'
  },
  submissionInfo: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  submittedStatus: {
    fontSize: '14px',
    color: '#059669',
    fontWeight: '500'
  },
  submissionFile: {
    fontSize: '14px',
    color: '#6b7280'
  },
  submissionDate: {
    fontSize: '14px',
    color: '#6b7280'
  },
  pendingStatus: {
    fontSize: '14px',
    color: '#f59e0b',
    fontWeight: '500'
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  submittedButton: {
    backgroundColor: '#d1d5db',
    color: '#6b7280',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'not-allowed'
  },
  // Quizzes Section
  quizzesSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  quizProgress: {
    backgroundColor: '#f0f9ff',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #e0f2fe'
  },
  noAttemptsText: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '8px'
  },
  quizzesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  quizCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
    backgroundColor: 'white',
    transition: 'box-shadow 0.2s ease'
  },
  quizHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  quizTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
    margin: 0
  },
  quizPoints: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  quizDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: '1.5'
  },
  quizInstructions: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '16px',
    lineHeight: '1.5',
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '4px',
    borderLeft: '3px solid #10b981'
  },
  quizMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  quizDetails: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  quizDetail: {
    fontSize: '14px',
    color: '#6b7280'
  },
  quizScore: {
    fontSize: '14px',
    color: '#059669',
    fontWeight: '500'
  },
  quizStatus: {
    fontSize: '14px',
    color: '#f59e0b',
    fontWeight: '500'
  },
  startQuizButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  retakeButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  // Materials Section
  materialsSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  materialsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  materialsStats: {
    display: 'flex',
    gap: '24px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4f46e5'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },
  materialsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '16px'
  },
  materialCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: 'white',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  materialHeader: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  materialIconContainer: {
    flexShrink: 0
  },
  materialIcon: {
    fontSize: '32px',
    display: 'block'
  },
  materialInfo: {
    flex: 1
  },
  materialTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
    margin: '0 0 8px 0'
  },
  materialDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 12px 0',
    lineHeight: '1.4'
  },
  materialMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: '8px'
  },
  materialType: {
    fontSize: '12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: '500'
  },
  materialSize: {
    fontSize: '12px',
    color: '#6b7280'
  },
  materialViews: {
    fontSize: '12px',
    color: '#6b7280'
  },
  materialDate: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  materialActions: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  viewButton: {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  },
  viewIcon: {
    fontSize: '14px'
  },
  // Content Section
  contentSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  lecturesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  lectureItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#fafafa',
    transition: 'background-color 0.2s ease'
  },
  lectureInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  lectureStatusIcon: {
    fontSize: '20px'
  },
  completedIcon: {
    color: '#059669'
  },
  pendingIcon: {
    color: '#f59e0b'
  },
  lectureDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  lectureTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#1a202c',
    margin: 0
  },
  lectureDuration: {
    fontSize: '14px',
    color: '#6b7280'
  },
  lectureStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  completedText: {
    fontSize: '14px',
    color: '#059669',
    fontWeight: '500'
  },
  pendingText: {
    fontSize: '14px',
    color: '#f59e0b',
    fontWeight: '500'
  },
  // Empty States
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  emptyLectures: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },

  // Add these new styles for the enhanced assignment system
  assignmentActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  viewButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  editButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  submitButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  submittedButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'not-allowed'
  },
  textAnswerSection: {
    marginTop: '16px'
  },
  textAnswerInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '120px'
  },
  submitInfo: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #bae6fd'
  },
  submitNote: {
    margin: 0,
    fontSize: '14px',
    color: '#0369a1'
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  assignmentFileSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  fileViewCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  fileIcon: {
    fontSize: '24px'
  },
  viewFileButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  submissionSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #bae6fd'
  },
  textAnswerBox: {
    marginBottom: '12px'
  },
  answerText: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    marginTop: '8px',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  gradeButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '12px'
  },
  gradeSection: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fffbeb',
    borderRadius: '6px',
    border: '1px solid #fcd34d'
  },
  reviewSection: {
    marginTop: '8px'
  },
  reviewText: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    marginTop: '8px',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  gradeForm: {
    marginTop: '16px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#374151',
    fontSize: '14px'
  },
  formInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  formTextarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit'
  },
  gradeStatus: {
    fontSize: '14px',
    color: '#059669',
    fontWeight: '500'
  },
  submissionItem: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  submissionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  submissionDate: {
    fontSize: '12px',
    color: '#6b7280'
  },
  submissionDivider: {
    margin: '16px 0',
    border: 'none',
    borderTop: '1px solid #e5e7eb'
  },
  // New styles for edit functionality
  versionBadge: {
    backgroundColor: '#6b7280',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '500',
    marginLeft: '8px'
  },
  cannotEditNotice: {
    backgroundColor: '#fef3c7',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #fcd34d',
    marginTop: '12px'
  },
  lateWarning: {
    backgroundColor: '#fef3c7',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #f59e0b',
    marginBottom: '16px'
  },
  pastDueBadge: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '500',
    marginLeft: '8px'
  },
  pastDueStatus: {
    fontSize: '14px',
    color: '#ef4444',
    fontWeight: '500'
  },
  lateBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: '500',
    marginLeft: '8px'
  }
};

export default CourseDetails;