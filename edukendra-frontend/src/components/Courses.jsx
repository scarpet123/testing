import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Courses = () => {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [enrolling, setEnrolling] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
  }, [currentUser]);

  const fetchCourses = () => {
    try {
      // Get courses from localStorage - REMOVE DEFAULT/DUMMY COURSES
      let allCourses = [];
      try {
        const coursesData = localStorage.getItem('all_courses');
        if (coursesData) {
          allCourses = JSON.parse(coursesData);
          
          // Filter out any demo/dummy courses - only keep valid courses created by instructors
          allCourses = allCourses.filter(course => 
            course._id && 
            course.title && 
            course.instructor && 
            course.instructor._id && 
            course.thumbnail &&
            // Ensure it's a real course by checking if it has proper structure
            (course.createdAt || course.lectures || course.assignments || course.quizzes || course.materials)
          );
        }
      } catch (e) {
        console.error('Error parsing courses from localStorage:', e);
        localStorage.removeItem('all_courses'); // Clear corrupted data
      }
      
      // Set courses - will be empty array if no courses exist
      setCourses(allCourses);
      
      // Get enrolled courses for current user
      if (currentUser) {
        let userEnrollments = [];
        try {
          const enrollmentsData = localStorage.getItem(`user_enrollments_${currentUser._id}`);
          if (enrollmentsData) {
            userEnrollments = JSON.parse(enrollmentsData);
          }
        } catch (e) {
          console.error('Error parsing enrollments:', e);
        }
        setEnrolledCourses(userEnrollments);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Set empty array on error
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All Courses' },
    { id: 'web-development', name: 'Web Development' },
    { id: 'mobile-development', name: 'Mobile Development' },
    { id: 'data-science', name: 'Data Science' },
    { id: 'design', name: 'Design' },
    { id: 'business', name: 'Business' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'other', name: 'Other' }
  ];

  const filteredCourses = courses.filter(course => {
    // Filter by category
    const categoryMatch = selectedCategory === 'all' || course.category === selectedCategory;
    
    // Filter by search query
    const searchMatch = searchQuery === '' || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.subtitle && course.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.instructor && course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Only show published courses
    const published = course.isPublished !== false;
    
    return categoryMatch && searchMatch && published;
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const isEnrolled = (courseId) => {
    return enrolledCourses.includes(courseId);
  };

  const handleEnroll = async (courseId) => {
    if (!currentUser) {
      alert('Please login to enroll in courses');
      return;
    }

    setEnrolling(courseId);
    const course = courses.find(c => c._id === courseId);
    
    if (!course) {
      alert('Course not found');
      setEnrolling(null);
      return;
    }

    try {
      // Check if course has available seats
      if (course.availableSeats <= 0) {
        alert('Sorry, this course is full. No seats available.');
        setEnrolling(null);
        return;
      }
      
      if (course.isFree) {
        const userEnrollments = JSON.parse(localStorage.getItem(`user_enrollments_${currentUser._id}`) || '[]');
        
        if (!userEnrollments.includes(courseId)) {
          userEnrollments.push(courseId);
          localStorage.setItem(`user_enrollments_${currentUser._id}`, JSON.stringify(userEnrollments));
          setEnrolledCourses(userEnrollments);
          
          // Update available seats and student count
          const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
          const updatedCourses = allCourses.map(c => 
            c._id === courseId 
              ? { 
                  ...c, 
                  availableSeats: c.availableSeats - 1, 
                  studentsEnrolled: (c.studentsEnrolled || 0) + 1
                }
              : c
          );
          localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
          setCourses(updatedCourses);
          
          const progressData = {
            progress: 0,
            enrolledAt: new Date().toISOString(),
            completedLectures: []
          };
          localStorage.setItem(`user_progress_${currentUser._id}_${courseId}`, JSON.stringify(progressData));
        }
        
        alert(`🎉 Successfully enrolled in "${course.title}"! You can now access all materials and assignments.`);
        window.location.href = '/dashboard';
      } else {
        // Handle paid course enrollment
        const confirmPayment = window.confirm(
          `💰 Paid Course Enrollment\n\n` +
          `Course: ${course.title}\n` +
          `Price: ${formatPrice(course.price)}\n` +
          `Instructor: ${course.instructor?.name || 'Unknown Instructor'}\n\n` +
          `Do you want to proceed with payment and enroll in this course?`
        );

        if (confirmPayment) {
          // Simulate payment processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Simulate successful payment
          const userEnrollments = JSON.parse(localStorage.getItem(`user_enrollments_${currentUser._id}`) || '[]');
          
          if (!userEnrollments.includes(courseId)) {
            userEnrollments.push(courseId);
            localStorage.setItem(`user_enrollments_${currentUser._id}`, JSON.stringify(userEnrollments));
            setEnrolledCourses(userEnrollments);
            
            // Update available seats and student count
            const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
            const updatedCourses = allCourses.map(c => 
              c._id === courseId 
                ? { 
                    ...c, 
                    availableSeats: c.availableSeats - 1, 
                    studentsEnrolled: (c.studentsEnrolled || 0) + 1
                  }
                : c
            );
            localStorage.setItem('all_courses', JSON.stringify(updatedCourses));
            setCourses(updatedCourses);
            
            const progressData = {
              progress: 0,
              enrolledAt: new Date().toISOString(),
              completedLectures: []
            };
            localStorage.setItem(`user_progress_${currentUser._id}_${courseId}`, JSON.stringify(progressData));
          }
          
          alert(`🎉 Successfully enrolled in "${course.title}"! Thank you for your payment. You can now access all course materials.`);
          window.location.href = '/dashboard';
        }
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Enrollment failed. Please try again.');
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading courses...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <div style={styles.header}>
          <h1 style={styles.title}>Explore Our Courses</h1>
          <p style={styles.subtitle}>
            Discover courses from industry experts. Start learning today!
          </p>
        </div>

        {/* Search Bar */}
        <div style={styles.searchSection}>
          <div style={styles.searchContainer}>
            <div style={styles.searchIcon}>🔍</div>
            <input
              type="text"
              placeholder="Search courses by title, description, or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div style={styles.filterSection}>
          <div style={styles.filterContainer}>
            {categories.map(category => (
              <button
                key={category.id}
                style={{
                  ...styles.filterButton,
                  ...(selectedCategory === category.id ? styles.activeFilter : {})
                }}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div style={styles.searchResultsInfo}>
            <p>
              Found {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} for "{searchQuery}"
              {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
            </p>
            <button
              onClick={() => setSearchQuery('')}
              style={styles.clearAllButton}
            >
              Clear search
            </button>
          </div>
        )}

        {filteredCourses.length > 0 ? (
          <div style={styles.coursesGrid}>
            {filteredCourses.map(course => {
              const enrolled = isEnrolled(course._id);
              const seatsAvailable = course.availableSeats > 0;
              
              return (
                <div key={course._id} style={styles.courseCard}>
                  <div style={styles.courseImageContainer}>
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      style={styles.courseImage}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop';
                      }}
                    />
                    <div style={styles.courseOverlay}>
                      {course.isFree && (
                        <span style={styles.freeBadge}>FREE</span>
                      )}
                      {enrolled && (
                        <span style={styles.enrolledBadge}>ENROLLED</span>
                      )}
                      {!seatsAvailable && (
                        <span style={styles.fullBadge}>FULL</span>
                      )}
                      <span style={styles.courseLevel}>{course.level}</span>
                    </div>
                  </div>

                  <div style={styles.courseContent}>
                    <h3 style={styles.courseTitle}>{course.title}</h3>
                    <p style={styles.courseSubtitle}>{course.subtitle}</p>
                    <p style={styles.courseInstructor}>By {course.instructor?.name || 'Unknown Instructor'}</p>

                    <div style={styles.courseMeta}>
                      <div style={styles.rating}>
                        <span style={styles.ratingStars}>
                          {'⭐'.repeat(Math.floor(course.averageRating || 0))}
                          {'☆'.repeat(5 - Math.floor(course.averageRating || 0))}
                        </span>
                        <span style={styles.ratingText}>{course.averageRating ? course.averageRating.toFixed(1) : 'No ratings'}</span>
                        <span style={styles.students}>({course.totalRatings || 0})</span>
                      </div>
                      <div style={styles.seatsInfo}>
                        <span style={styles.seatsText}>
                          🪑 {course.availableSeats}/{course.totalSeats} seats available
                        </span>
                      </div>
                      <div style={styles.courseDetails}>
                        <span style={styles.duration}>⏱️ {course.totalHours} hours</span>
                        {course.hasAssignments && <span style={styles.feature}>📝 Assignments</span>}
                        {course.hasMaterials && <span style={styles.feature}>📚 Materials</span>}
                      </div>
                    </div>

                    <div style={styles.courseFooter}>
                      <div style={styles.priceContainer}>
                        {course.isFree ? (
                          <div style={styles.freePrice}>Free</div>
                        ) : (
                          <>
                            <div style={styles.currentPrice}>{formatPrice(course.price)}</div>
                            {course.originalPrice > course.price && (
                              <div style={styles.originalPrice}>{formatPrice(course.originalPrice)}</div>
                            )}
                          </>
                        )}
                      </div>
                      {currentUser ? (
                        enrolled ? (
                          <Link 
                            to={`/course/${course._id}`}
                            style={styles.goToCourseButton}
                          >
                            Go to Course
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleEnroll(course._id)}
                            disabled={enrolling === course._id || !seatsAvailable}
                            style={{
                              ...styles.enrollButton,
                              ...(course.isFree ? styles.freeEnrollButton : {}),
                              ...(enrolling === course._id ? styles.loadingButton : {}),
                              ...(!seatsAvailable ? styles.disabledButton : {})
                            }}
                          >
                            {enrolling === course._id ? (
                              <div style={styles.buttonLoading}>
                                <div style={styles.loadingSpinner}></div>
                                Enrolling...
                              </div>
                            ) : !seatsAvailable ? (
                              'Course Full'
                            ) : course.isFree ? (
                              'Enroll Free'
                            ) : (
                              'Enroll Now'
                            )}
                          </button>
                        )
                      ) : (
                        <Link to="/login" style={styles.enrollButton}>
                          Login to Enroll
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📚</div>
            <h3>No courses available yet</h3>
            <p>
              {searchQuery 
                ? `No courses found for "${searchQuery}". Try adjusting your search terms.`
                : `There are no published courses available at the moment. Check back later or contact instructors to create new courses.`
              }
            </p>
            {currentUser?.role === 'instructor' && (
              <Link to="/dashboard" style={styles.createCourseButton}>
                Create Your First Course
              </Link>
            )}
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                style={styles.browseAllButton}
              >
                View All Courses
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 80px)',
    backgroundColor: '#f8fafc',
    padding: '40px 0'
  },
  innerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px'
  },
  loadingContainer: {
    minHeight: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '16px',
    color: '#6b7280'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: '12px'
  },
  subtitle: {
    fontSize: '18px',
    color: '#6b7280',
    maxWidth: '600px',
    margin: '0 auto'
  },
  // Search Styles
  searchSection: {
    marginBottom: '32px'
  },
  searchContainer: {
    position: 'relative',
    maxWidth: '600px',
    margin: '0 auto'
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '20px',
    color: '#6b7280'
  },
  searchInput: {
    width: '100%',
    padding: '16px 52px 16px 48px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '16px',
    transition: 'border-color 0.2s ease',
    outline: 'none',
    backgroundColor: 'white'
  },
  clearSearchButton: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px'
  },
  searchResultsInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '16px 20px',
    marginBottom: '24px'
  },
  clearAllButton: {
    backgroundColor: 'transparent',
    color: '#0369a1',
    border: '1px solid #0369a1',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px'
  },
  filterSection: {
    marginBottom: '32px'
  },
  filterContainer: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  filterButton: {
    padding: '10px 20px',
    border: '2px solid #e5e7eb',
    borderRadius: '25px',
    backgroundColor: 'white',
    color: '#6b7280',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  activeFilter: {
    borderColor: '#4f46e5',
    backgroundColor: '#4f46e5',
    color: 'white'
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
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer'
  },
  courseImageContainer: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden'
  },
  courseImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  courseOverlay: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    right: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: '8px'
  },
  freeBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  enrolledBadge: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  fullBadge: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  courseLevel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  courseContent: {
    padding: '20px'
  },
  courseTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#1a202c',
    lineHeight: '1.4'
  },
  courseSubtitle: {
    color: '#6b7280',
    fontSize: '14px',
    marginBottom: '12px',
    lineHeight: '1.5'
  },
  courseInstructor: {
    color: '#4f46e5',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '16px'
  },
  courseMeta: {
    marginBottom: '16px'
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  ratingStars: {
    color: '#f59e0b',
    fontSize: '14px'
  },
  ratingText: {
    fontWeight: 'bold',
    color: '#1a202c'
  },
  students: {
    color: '#6b7280',
    fontSize: '12px'
  },
  seatsInfo: {
    marginBottom: '8px'
  },
  seatsText: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },
  courseDetails: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  duration: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  feature: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  courseFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  freePrice: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#10b981'
  },
  currentPrice: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1a202c'
  },
  originalPrice: {
    fontSize: '14px',
    color: '#9ca3af',
    textDecoration: 'line-through'
  },
  enrollButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  goToCourseButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  freeEnrollButton: {
    backgroundColor: '#10b981'
  },
  loadingButton: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  buttonLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  createCourseButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '500',
    marginTop: '16px',
    display: 'inline-block'
  },
  browseAllButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    marginTop: '16px'
  }
};

export default Courses;