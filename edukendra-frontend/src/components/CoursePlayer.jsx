import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CoursePlayer = () => {
  const { courseId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  const [currentLectureIndex, setCurrentLectureIndex] = useState(0);
  const [completedLectures, setCompletedLectures] = useState(new Set());
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  // Load course data
  const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
  const course = allCourses.find(c => c._id === courseId) || {
    _id: courseId,
    title: 'Course Not Found',
    instructor: { name: 'Unknown Instructor' },
    lectures: []
  };

  // Load completed lectures from localStorage
  useEffect(() => {
    if (currentUser) {
      const savedCompleted = localStorage.getItem(`user_${currentUser._id}_course_${courseId}_completed_lectures`);
      if (savedCompleted) {
        setCompletedLectures(new Set(JSON.parse(savedCompleted)));
      }
    }
  }, [courseId, currentUser]);

  // Save completed lectures to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(
        `user_${currentUser._id}_course_${courseId}_completed_lectures`,
        JSON.stringify([...completedLectures])
      );
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

  const currentLecture = course.lectures?.[currentLectureIndex] || {};

  const handleVideoEnd = () => {
    // Automatically mark lecture as completed when video ends
    if (currentLecture.id && !completedLectures.has(currentLecture.id)) {
      setCompletedLectures(prev => new Set([...prev, currentLecture.id]));
    }
    
    // Auto-play next lecture if available
    if (currentLectureIndex < course.lectures.length - 1) {
      setTimeout(() => {
        setCurrentLectureIndex(currentLectureIndex + 1);
      }, 2000);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      
      // Mark as completed when user watches 95% of the video
      if (duration > 0 && (currentTime / duration) >= 0.95 && currentLecture.id) {
        if (!completedLectures.has(currentLecture.id)) {
          setCompletedLectures(prev => new Set([...prev, currentLecture.id]));
        }
      }
    }
  };

  const handleVideoError = () => {
    console.error('Video playback error');
    setVideoError(true);
    setVideoLoading(false);
  };

  const handleVideoLoadStart = () => {
    setVideoLoading(true);
    setVideoError(false);
  };

  const handleVideoLoadedData = () => {
    setVideoLoading(false);
    setVideoError(false);
  };

  const handleVideoCanPlay = () => {
    setVideoLoading(false);
    setVideoError(false);
  };

  const handleNextLecture = () => {
    if (currentLectureIndex < course.lectures.length - 1) {
      setCurrentLectureIndex(currentLectureIndex + 1);
      setVideoError(false);
      setVideoLoading(true);
    }
  };

  const handlePrevLecture = () => {
    if (currentLectureIndex > 0) {
      setCurrentLectureIndex(currentLectureIndex - 1);
      setVideoError(false);
      setVideoLoading(true);
    }
  };

  const handleLectureSelect = (index) => {
    setCurrentLectureIndex(index);
    setVideoError(false);
    setVideoLoading(true);
  };

  const getVideoSource = (lecture) => {
    console.log('Lecture video data:', lecture.videoFile);
    
    // 1. Check for backend uploaded video with permanent URL
    if (lecture.videoFile && lecture.videoFile.url && !lecture.videoFile.isLocal) {
      console.log('Using backend URL:', lecture.videoFile.url);
      return lecture.videoFile.url;
    }
    
    // 2. Check for videoUrl first
    if (lecture.videoUrl && lecture.videoUrl.startsWith('http')) {
      console.log('Using videoUrl:', lecture.videoUrl);
      return lecture.videoUrl;
    }
    
    // 3. Check for videoFile object with URL (blob URL)
    if (lecture.videoFile && lecture.videoFile.url) {
      console.log('Using videoFile URL (may be blob):', lecture.videoFile.url);
      return lecture.videoFile.url;
    }
    
    // 4. For newly uploaded videos, check if videoFile is a File object and create object URL
    if (lecture.videoFile && lecture.videoFile instanceof File) {
      try {
        const blobUrl = URL.createObjectURL(lecture.videoFile);
        console.log('Created blob URL:', blobUrl);
        return blobUrl;
      } catch (error) {
        console.error('Error creating object URL:', error);
        return '';
      }
    }
    
    // 5. Check if videoFile is stored as an object with data
    if (lecture.videoFile && lecture.videoFile.data) {
      console.log('Using videoFile data URL');
      return lecture.videoFile.data;
    }
    
    console.log('No valid video source found');
    return '';
  };

  const handleViewCourseMaterials = () => {
    navigate(`/course/${courseId}/details`);
  };

  // Check if current lecture has a valid video source
  const hasValidVideo = () => {
    const source = getVideoSource(currentLecture);
    const isValid = source && source !== '';
    console.log('Has valid video:', isValid, 'Source:', source);
    return isValid;
  };

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Revoke any blob URLs to free memory
      if (course.lectures) {
        course.lectures.forEach(lecture => {
          const source = getVideoSource(lecture);
          if (source && source.startsWith('blob:')) {
            URL.revokeObjectURL(source);
          }
        });
      }
    };
  }, [course.lectures]);

  if (!course.lectures || course.lectures.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>📺</div>
          <h2>No Lectures Available</h2>
          <p>This course doesn't have any lectures yet.</p>
          <button 
            onClick={() => navigate(`/course/${courseId}/details`)}
            style={styles.backButton}
          >
            Back to Course Details
          </button>
        </div>
      </div>
    );
  }

  const videoSource = getVideoSource(currentLecture);
  const isBlobUrl = videoSource && videoSource.startsWith('blob:');

  return (
    <div style={styles.container}>
      <div style={styles.playerLayout}>
        {/* Main Video Player Section - Takes remaining space */}
        <div style={styles.mainContent}>
          <div style={styles.videoContainer}>
            {hasValidVideo() && !videoError ? (
              <>
                {videoLoading && (
                  <div style={styles.videoLoading}>
                    <div style={styles.loadingSpinner}></div>
                    <p>Loading video...</p>
                    {isBlobUrl && (
                      <p style={styles.blobWarning}>
                        ⚠️ Local video file - may not persist after refresh
                      </p>
                    )}
                  </div>
                )}
                <video
                  ref={videoRef}
                  key={currentLectureIndex} // Force re-render when lecture changes
                  controls
                  autoPlay
                  onEnded={handleVideoEnd}
                  onTimeUpdate={handleTimeUpdate}
                  onError={handleVideoError}
                  onLoadStart={handleVideoLoadStart}
                  onLoadedData={handleVideoLoadedData}
                  onCanPlay={handleVideoCanPlay}
                  style={{
                    ...styles.videoPlayer,
                    display: videoLoading ? 'none' : 'block'
                  }}
                  controlsList="nodownload"
                >
                  <source src={videoSource} type="video/mp4" />
                  <source src={videoSource} type="video/webm" />
                  <source src={videoSource} type="video/ogg" />
                  Your browser does not support the video tag.
                </video>
              </>
            ) : (
              <div style={styles.noVideoPlaceholder}>
                <div style={styles.placeholderIcon}>📹</div>
                <h3 style={styles.placeholderTitle}>
                  {videoError ? 'Video Playback Error' : 'No Video Available'}
                </h3>
                <p style={styles.placeholderText}>
                  {videoError 
                    ? 'There was an error playing the video. The video file may be corrupted or unavailable.'
                    : 'This lecture does not have a video file attached yet.'
                  }
                </p>
                {currentLecture.videoFile && (
                  <div style={styles.videoInfo}>
                    <p><strong>File Info:</strong></p>
                    <p>Name: {currentLecture.videoFile.name || 'Unknown'}</p>
                    <p>Size: {currentLecture.videoFile.size ? `${(currentLecture.videoFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}</p>
                    <p>Type: {currentLecture.videoFile.type || 'Unknown'}</p>
                    <p>Source: {isBlobUrl ? 'Local (Blob URL)' : 'Backend Server'}</p>
                    {isBlobUrl && (
                      <p style={styles.warningText}>
                        ⚠️ This video is stored locally and may not be available after page refresh.
                      </p>
                    )}
                  </div>
                )}
                {videoError && (
                  <button
                    onClick={() => {
                      setVideoError(false);
                      setVideoLoading(true);
                    }}
                    style={styles.retryButton}
                  >
                    Retry Loading Video
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Lecture Info Section */}
          <div style={styles.lectureInfo}>
            <div style={styles.lectureHeader}>
              <h2 style={styles.lectureTitle}>{currentLecture.title || 'Untitled Lecture'}</h2>
              <div style={styles.lectureMeta}>
                {completedLectures.has(currentLecture.id) && (
                  <span style={styles.completedBadge}>✅ Completed</span>
                )}
                <span style={styles.lectureCount}>
                  Lecture {currentLectureIndex + 1} of {course.lectures.length}
                </span>
                {isBlobUrl && (
                  <span style={styles.localBadge}>📱 Local File</span>
                )}
              </div>
            </div>
            
            {currentLecture.description && (
              <p style={styles.lectureDescription}>{currentLecture.description}</p>
            )}

            {/* Navigation Controls */}
            <div style={styles.navigationControls}>
              <button
                onClick={handlePrevLecture}
                disabled={currentLectureIndex === 0}
                style={{
                  ...styles.navButton,
                  ...(currentLectureIndex === 0 ? styles.disabledNavButton : {})
                }}
              >
                ⬅️ Previous
              </button>
              
              <button
                onClick={handleNextLecture}
                disabled={currentLectureIndex === course.lectures.length - 1}
                style={{
                  ...styles.navButton,
                  ...(currentLectureIndex === course.lectures.length - 1 ? styles.disabledNavButton : {})
                }}
              >
                Next ➡️
              </button>
            </div>
          </div>
        </div>

        {/* Lectures List Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Course Content</h3>
            <div style={styles.courseInfo}>
              <h4 style={styles.courseName}>{course.title}</h4>
              <p style={styles.instructor}>By {course.instructor?.name || 'Unknown Instructor'}</p>
              {course.averageRating > 0 && (
                <div style={styles.rating}>
                  <span style={styles.ratingStars}>
                    {'⭐'.repeat(Math.floor(course.averageRating || 0))}
                    {'☆'.repeat(5 - Math.floor(course.averageRating || 0))}
                  </span>
                  <span style={styles.ratingText}>
                    {course.averageRating ? course.averageRating.toFixed(1) : 'No ratings'}
                    {course.totalRatings > 0 && ` (${course.totalRatings})`}
                  </span>
                </div>
              )}
            </div>
            <div style={styles.progressInfo}>
              <span style={styles.progressText}>
                {completedLectures.size} of {course.lectures.length} completed
              </span>
              <div style={styles.progressBar}>
                <div 
                  style={{
                    ...styles.progressFill,
                    width: `${(completedLectures.size / course.lectures.length) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>

          <div style={styles.lecturesList}>
            {course.lectures.map((lecture, index) => {
              const lectureVideoSource = getVideoSource(lecture);
              const isLectureBlobUrl = lectureVideoSource && lectureVideoSource.startsWith('blob:');
              
              return (
                <div
                  key={lecture.id || index}
                  style={{
                    ...styles.lectureItem,
                    ...(index === currentLectureIndex ? styles.activeLectureItem : {}),
                    ...(completedLectures.has(lecture.id) ? styles.completedLectureItem : {})
                  }}
                  onClick={() => handleLectureSelect(index)}
                >
                  <div style={styles.lectureItemContent}>
                    <div style={styles.lectureItemIcon}>
                      {completedLectures.has(lecture.id) ? (
                        <span style={styles.completedIcon}>✅</span>
                      ) : (
                        <span style={styles.pendingIcon}>▶️</span>
                      )}
                    </div>
                    
                    <div style={styles.lectureItemInfo}>
                      <h4 style={styles.lectureItemTitle}>
                        {lecture.title || `Lecture ${index + 1}`}
                      </h4>
                      <span style={styles.lectureItemDuration}>
                        {lecture.duration || 'No duration'}
                      </span>
                      {!getVideoSource(lecture) && (
                        <span style={styles.noVideoBadge}>No Video</span>
                      )}
                      {isLectureBlobUrl && (
                        <span style={styles.localFileBadge}>📱 Local</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Materials Button below Course Content */}
          <div style={styles.materialsSection}>
            <button
              onClick={handleViewCourseMaterials}
              style={styles.materialsButton}
            >
              <span style={styles.materialsButtonIcon}>📚</span>
              View Course Materials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: 'calc(100vh - 80px)',
    backgroundColor: '#f8fafc'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    textAlign: 'center',
    color: '#6b7280',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    margin: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  backButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '16px',
    fontWeight: '500'
  },
  playerLayout: {
    display: 'flex',
    height: 'calc(100vh - 80px)',
    backgroundColor: 'white'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    backgroundColor: 'white'
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '24px',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    minHeight: '400px'
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    outline: 'none'
  },
  videoLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    backgroundColor: '#000'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  blobWarning: {
    fontSize: '12px',
    color: '#fbbf24',
    marginTop: '8px'
  },
  noVideoPlaceholder: {
    textAlign: 'center',
    padding: '40px',
    color: 'white',
    width: '100%'
  },
  placeholderIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  placeholderTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '12px'
  },
  placeholderText: {
    fontSize: '16px',
    opacity: 0.8,
    marginBottom: '20px'
  },
  videoInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'left',
    marginBottom: '20px'
  },
  warningText: {
    color: '#fbbf24',
    fontSize: '12px',
    marginTop: '8px'
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  lectureInfo: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  lectureHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  lectureTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    color: '#1a202c',
    flex: 1
  },
  lectureMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px'
  },
  completedBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  localBadge: {
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  lectureCount: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  lectureDescription: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  navigationControls: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px'
  },
  navButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    flex: 1,
    transition: 'background-color 0.2s ease'
  },
  disabledNavButton: {
    backgroundColor: '#9ca3af',
    color: '#6b7280',
    cursor: 'not-allowed'
  },
  sidebar: {
    width: '400px',
    backgroundColor: 'white',
    borderLeft: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.1)'
  },
  sidebarHeader: {
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f8fafc'
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 16px 0',
    color: '#1a202c'
  },
  courseInfo: {
    marginBottom: '16px'
  },
  courseName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c',
    margin: '0 0 4px 0'
  },
  instructor: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 8px 0'
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  ratingStars: {
    color: '#f59e0b',
    fontSize: '14px'
  },
  ratingText: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },
  progressInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  progressText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease'
  },
  lecturesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0'
  },
  lectureItem: {
    padding: '16px 24px',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  activeLectureItem: {
    backgroundColor: '#e0e7ff',
    borderLeft: '3px solid #4f46e5'
  },
  completedLectureItem: {
    borderLeft: '3px solid #10b981'
  },
  lectureItemContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  lectureItemIcon: {
    fontSize: '16px',
    flexShrink: 0,
    marginTop: '2px'
  },
  completedIcon: {
    color: '#10b981'
  },
  pendingIcon: {
    color: '#6b7280'
  },
  lectureItemInfo: {
    flex: 1
  },
  lectureItemTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    margin: '0 0 4px 0',
    lineHeight: '1.4'
  },
  lectureItemDuration: {
    fontSize: '12px',
    color: '#6b7280'
  },
  noVideoBadge: {
    fontSize: '10px',
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '8px',
    fontWeight: '500'
  },
  localFileBadge: {
    fontSize: '10px',
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '8px',
    fontWeight: '500'
  },
  // Materials Section below Course Content
  materialsSection: {
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f8fafc'
  },
  materialsButton: {
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease'
  },
  materialsButtonIcon: {
    fontSize: '16px'
  }
};

export default CoursePlayer;