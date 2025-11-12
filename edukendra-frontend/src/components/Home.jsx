import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { currentUser } = useAuth();

  return (
    <div>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div className="container">
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              Learn Without Limits
            </h1>
            <p style={styles.heroSubtitle}>
              Start, switch, or advance your career with thousands of courses 
              from industry experts and leading universities.
            </p>
            <div style={styles.heroButtons}>
              {currentUser ? (
                <Link to="/dashboard" className="btn btn-primary">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary">
                    Join for Free
                  </Link>
                  <Link to="/courses" className="btn btn-secondary" style={{marginLeft: '12px'}}>
                    Browse Courses
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.features}>
        <div className="container">
          <h2 style={styles.sectionTitle}>Why Choose EduKendra?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3" style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🎓</div>
              <h3 style={styles.featureTitle}>Expert Instructors</h3>
              <p style={styles.featureDescription}>
                Learn from industry professionals with real-world experience.
              </p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>⚡</div>
              <h3 style={styles.featureTitle}>Learn at Your Pace</h3>
              <p style={styles.featureDescription}>
                Lifetime access to courses so you can learn on your schedule.
              </p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📱</div>
              <h3 style={styles.featureTitle}>Anywhere, Anytime</h3>
              <p style={styles.featureDescription}>
                Access courses on desktop, tablet, or mobile.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const styles = {
  hero: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '100px 0',
    textAlign: 'center'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '24px',
    lineHeight: '1.2'
  },
  heroSubtitle: {
    fontSize: '20px',
    marginBottom: '32px',
    opacity: 0.9,
    lineHeight: '1.6'
  },
  heroButtons: {
    marginTop: '32px'
  },
  features: {
    padding: '80px 0',
    backgroundColor: 'white'
  },
  sectionTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '48px',
    color: '#1a202c'
  },
  featuresGrid: {
    gap: '32px'
  },
  featureCard: {
    textAlign: 'center',
    padding: '32px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc'
  },
  featureIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  featureTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#1a202c'
  },
  featureDescription: {
    color: '#6b7280',
    lineHeight: '1.6'
  }
};

export default Home;