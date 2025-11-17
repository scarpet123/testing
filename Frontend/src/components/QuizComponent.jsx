import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const QuizComponent = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    const quizData = location.state?.quiz;
    if (quizData) {
      setQuiz(quizData);
      setTimeLeft(quizData.timeLimit * 60); // Convert minutes to seconds
      setAnswers(Array(quizData.questions.length).fill(null));
    } else {
      // Fallback: Try to get quiz from localStorage
      const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
      let foundQuiz = null;
      
      for (const course of allCourses) {
        if (course.quizzes) {
          foundQuiz = course.quizzes.find(q => q.id === quizId);
          if (foundQuiz) break;
        }
      }
      
      if (foundQuiz) {
        setQuiz(foundQuiz);
        setTimeLeft(foundQuiz.timeLimit * 60);
        setAnswers(Array(foundQuiz.questions.length).fill(null));
      } else {
        alert('Quiz not found');
        navigate(-1);
      }
    }
  }, [quizId, location.state, navigate]);

  useEffect(() => {
    let timer;
    if (quizStarted && timeLeft > 0 && !quizSubmitted) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, timeLeft, quizSubmitted]);

  const startQuiz = () => {
    setQuizStarted(true);
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleAutoSubmit = () => {
    calculateScore();
    setQuizSubmitted(true);
  };

  const handleSubmitQuiz = () => {
    if (window.confirm('Are you sure you want to submit the quiz? You cannot change your answers after submission.')) {
      calculateScore();
      setQuizSubmitted(true);
    }
  };

  const calculateScore = () => {
    let correctAnswers = 0;
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    const finalScore = Math.round((correctAnswers / quiz.questions.length) * 100);
    setScore(finalScore);

    // Update quiz progress in the course data
    const allCourses = JSON.parse(localStorage.getItem('all_courses') || '[]');
    const updatedCourses = allCourses.map(course => {
      if (course.quizzes) {
        const updatedQuizzes = course.quizzes.map(q => {
          if (q.id === quiz.id) {
            const previousBestScore = q.bestScore || 0;
            return {
              ...q,
              attempted: true,
              bestScore: Math.max(previousBestScore, finalScore),
              lastAttempt: new Date().toISOString()
            };
          }
          return q;
        });
        return { ...course, quizzes: updatedQuizzes };
      }
      return course;
    });

    localStorage.setItem('all_courses', JSON.stringify(updatedCourses));

    // Update user-specific quiz data
    const userQuizzes = JSON.parse(localStorage.getItem(`user_${currentUser._id}_course_${location.state?.courseId}_quizzes`) || '[]');
    const updatedUserQuizzes = userQuizzes.map(q => {
      if (q.id === quiz.id) {
        const previousBestScore = q.bestScore || 0;
        return {
          ...q,
          attempted: true,
          bestScore: Math.max(previousBestScore, finalScore),
          lastAttempt: new Date().toISOString()
        };
      }
      return q;
    });

    // If quiz not found in user quizzes, add it
    if (!updatedUserQuizzes.find(q => q.id === quiz.id)) {
      updatedUserQuizzes.push({
        ...quiz,
        attempted: true,
        bestScore: finalScore,
        lastAttempt: new Date().toISOString()
      });
    }

    localStorage.setItem(`user_${currentUser._id}_course_${location.state?.courseId}_quizzes`, JSON.stringify(updatedUserQuizzes));

    // Save quiz attempt
    const attempt = {
      id: Date.now().toString(),
      quizId: quiz.id,
      studentId: currentUser._id,
      studentName: currentUser.name,
      answers: answers,
      score: correctAnswers,
      totalQuestions: quiz.questions.length,
      percentage: finalScore,
      submittedAt: new Date().toISOString(),
      timeSpent: (quiz.timeLimit * 60) - timeLeft
    };

    const existingAttempts = JSON.parse(
      localStorage.getItem(`quiz_attempts_${quiz.id}`) || '[]'
    );
    existingAttempts.push(attempt);
    localStorage.setItem(`quiz_attempts_${quiz.id}`, JSON.stringify(existingAttempts));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnswerStatus = (questionIndex, optionIndex) => {
    if (!quizSubmitted || !showAnswers) return '';
    
    const question = quiz.questions[questionIndex];
    const userAnswer = answers[questionIndex];
    
    if (optionIndex === question.correctAnswer) {
      return 'correct';
    } else if (optionIndex === userAnswer && userAnswer !== question.correctAnswer) {
      return 'incorrect';
    }
    return '';
  };

  const handleShowAnswers = () => {
    setShowAnswers(true);
  };

  if (!quiz) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div style={styles.container}>
        <div style={styles.quizIntro}>
          <h1 style={styles.quizTitle}>{quiz.title}</h1>
          <p style={styles.quizDescription}>{quiz.description}</p>
          
          <div style={styles.quizInfo}>
            <div style={styles.infoItem}>
              <strong>Total Questions:</strong> {quiz.questions.length}
            </div>
            <div style={styles.infoItem}>
              <strong>Time Limit:</strong> {quiz.timeLimit} minutes
            </div>
            <div style={styles.infoItem}>
              <strong>Points:</strong> {quiz.points}
            </div>
          </div>

          {quiz.instructions && (
            <div style={styles.instructions}>
              <h3>Instructions:</h3>
              <p>{quiz.instructions}</p>
            </div>
          )}

          <div style={styles.rules}>
            <h3>Quiz Rules:</h3>
            <ul style={styles.rulesList}>
              <li>You have {quiz.timeLimit} minutes to complete the quiz</li>
              <li>The quiz will auto-submit when time expires</li>
              <li>You cannot go back after submitting</li>
              <li>Each question has only one correct answer</li>
              <li>After submission, you can view correct answers</li>
            </ul>
          </div>

          <button style={styles.startButton} onClick={startQuiz}>
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (quizSubmitted) {
    return (
      <div style={styles.container}>
        <div style={styles.resultsContainer}>
          <h1 style={styles.resultsTitle}>Quiz Results</h1>
          <div style={styles.scoreSection}>
            <div style={styles.scoreCircle}>
              <div style={styles.scoreNumber}>
                {score}%
              </div>
              <div style={styles.scorePercentage}>
                {Math.round((score / 100) * quiz.questions.length)}/{quiz.questions.length} Correct
              </div>
            </div>
          </div>

          {!showAnswers ? (
            <div style={styles.resultsActions}>
              <button 
                style={styles.answersButton}
                onClick={handleShowAnswers}
              >
                📝 See Answers
              </button>
              <button 
                style={styles.backButton}
                onClick={() => navigate(-1)}
              >
                Back to Course
              </button>
              <button 
                style={styles.retryButton}
                onClick={() => window.location.reload()}
              >
                Retry Quiz
              </button>
            </div>
          ) : (
            <div style={styles.answersReview}>
              <h3 style={styles.reviewTitle}>Review Your Answers</h3>
              {quiz.questions.map((question, qIndex) => (
                <div key={qIndex} style={styles.questionReview}>
                  <h4 style={styles.questionText}>
                    {qIndex + 1}. {question.question}
                  </h4>
                  <div style={styles.optionsReview}>
                    {question.options.map((option, oIndex) => {
                      const status = getAnswerStatus(qIndex, oIndex);
                      return (
                        <div
                          key={oIndex}
                          style={{
                            ...styles.optionReview,
                            ...(status === 'correct' ? styles.correctOption : {}),
                            ...(status === 'incorrect' ? styles.incorrectOption : {})
                          }}
                        >
                          <span style={styles.optionText}>{option}</span>
                          {status === 'correct' && (
                            <span style={styles.statusBadge}>✓ Correct Answer</span>
                          )}
                          {status === 'incorrect' && (
                            <span style={styles.statusBadge}>✗ Your Answer</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {answers[qIndex] === null && (
                    <div style={styles.notAnswered}>
                      ⚠️ You did not answer this question
                    </div>
                  )}
                  <div style={styles.explanation}>
                    <strong>Explanation:</strong> {question.explanation || 'No explanation provided.'}
                  </div>
                </div>
              ))}
              
              <div style={styles.resultsActions}>
                <button 
                  style={styles.backButton}
                  onClick={() => navigate(-1)}
                >
                  Back to Course
                </button>
                <button 
                  style={styles.retryButton}
                  onClick={() => window.location.reload()}
                >
                  Retry Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];

  return (
    <div style={styles.container}>
      <div style={styles.quizHeader}>
        <h1 style={styles.quizTitle}>{quiz.title}</h1>
        <div style={styles.quizMeta}>
          <div style={styles.timer}>
            ⏱️ {formatTime(timeLeft)}
          </div>
          <div style={styles.progress}>
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
        </div>
      </div>

      <div style={styles.quizContent}>
        <div style={styles.questionSection}>
          <h2 style={styles.questionText}>
            {currentQuestion + 1}. {currentQ.question}
          </h2>
          
          <div style={styles.optionsSection}>
            {currentQ.options.map((option, index) => (
              <div
                key={index}
                style={{
                  ...styles.option,
                  ...(answers[currentQuestion] === index ? styles.selectedOption : {})
                }}
                onClick={() => handleAnswerSelect(currentQuestion, index)}
              >
                <div style={styles.optionRadio}>
                  {answers[currentQuestion] === index ? '●' : '○'}
                </div>
                <span style={styles.optionText}>{option}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.navigationSection}>
          <div style={styles.navButtons}>
            <button
              style={styles.navButton}
              onClick={handlePrevQuestion}
              disabled={currentQuestion === 0}
            >
              ← Previous
            </button>
            
            <div style={styles.questionIndicators}>
              {quiz.questions.map((_, index) => (
                <button
                  key={index}
                  style={{
                    ...styles.indicator,
                    ...(index === currentQuestion ? styles.currentIndicator : {}),
                    ...(answers[index] !== null ? styles.answeredIndicator : {})
                  }}
                  onClick={() => setCurrentQuestion(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestion === quiz.questions.length - 1 ? (
              <button
                style={styles.submitButton}
                onClick={handleSubmitQuiz}
              >
                Submit Quiz
              </button>
            ) : (
              <button
                style={styles.navButton}
                onClick={handleNextQuestion}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  quizIntro: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    textAlign: 'center'
  },
  quizTitle: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#2c3e50',
    margin: '0 0 15px 0'
  },
  quizDescription: {
    fontSize: '1.1rem',
    color: '#6c757d',
    margin: '0 0 30px 0',
    lineHeight: '1.5'
  },
  quizInfo: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  infoItem: {
    backgroundColor: '#f8f9fa',
    padding: '15px 25px',
    borderRadius: '8px',
    fontSize: '1rem',
    color: '#495057'
  },
  instructions: {
    backgroundColor: '#e7f3ff',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'left'
  },
  rules: {
    textAlign: 'left',
    marginBottom: '30px'
  },
  rulesList: {
    paddingLeft: '20px',
    color: '#495057',
    lineHeight: '1.6'
  },
  startButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '15px 40px',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  quizHeader: {
    backgroundColor: 'white',
    padding: '25px 30px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  quizMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  timer: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '1.1rem'
  },
  progress: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '1rem'
  },
  quizContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
  },
  questionSection: {
    marginBottom: '30px'
  },
  questionText: {
    fontSize: '1.4rem',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0 0 25px 0',
    lineHeight: '1.4'
  },
  optionsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  selectedOption: {
    borderColor: '#007bff',
    backgroundColor: '#f0f8ff'
  },
  optionRadio: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #6c757d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    color: '#007bff'
  },
  optionText: {
    fontSize: '1rem',
    color: '#495057',
    flex: 1
  },
  navigationSection: {
    borderTop: '1px solid #e9ecef',
    paddingTop: '25px'
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  navButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  submitButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  questionIndicators: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  indicator: {
    width: '40px',
    height: '40px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },
  currentIndicator: {
    borderColor: '#007bff',
    backgroundColor: '#007bff',
    color: 'white'
  },
  answeredIndicator: {
    borderColor: '#28a745',
    backgroundColor: '#28a745',
    color: 'white'
  },
  resultsContainer: {
    maxWidth: '900px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
  },
  resultsTitle: {
    fontSize: '2.2rem',
    fontWeight: '700',
    color: '#2c3e50',
    margin: '0 0 30px 0',
    textAlign: 'center'
  },
  scoreSection: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  scoreCircle: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    color: 'white'
  },
  scoreNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '5px'
  },
  scorePercentage: {
    fontSize: '1.1rem',
    fontWeight: '600'
  },
  answersReview: {
    marginBottom: '30px'
  },
  reviewTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0 0 25px 0'
  },
  questionReview: {
    marginBottom: '30px',
    padding: '25px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  optionsReview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '15px'
  },
  optionReview: {
    padding: '15px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  correctOption: {
    borderColor: '#28a745',
    backgroundColor: '#d4edda'
  },
  incorrectOption: {
    borderColor: '#dc3545',
    backgroundColor: '#f8d7da'
  },
  statusBadge: {
    padding: '5px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'white'
  },
  notAnswered: {
    color: '#856404',
    backgroundColor: '#fff3cd',
    padding: '10px 15px',
    borderRadius: '6px',
    marginTop: '10px',
    fontSize: '0.9rem'
  },
  explanation: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#e7f3ff',
    borderRadius: '6px',
    borderLeft: '4px solid #007bff',
    fontSize: '0.9rem',
    lineHeight: '1.5'
  },
  resultsActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  answersButton: {
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  backButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  retryButton: {
    backgroundColor: '#ffc107',
    color: '#212529',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

export default QuizComponent;