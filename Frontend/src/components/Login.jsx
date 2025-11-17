import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      setError('');
      alert('Login successful! Welcome back!');
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.leftSection}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>Welcome Back!</h1>
            <p style={styles.heroSubtitle}>
              Continue your learning journey with thousands of courses from industry experts.
            </p>
            <div style={styles.features}>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>🎓</span>
                <span>Expert-led courses</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>⚡</span>
                <span>Learn at your pace</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>📚</span>
                <span>Assignments & Materials</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.rightSection}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.title}>Sign In to EduKendra</h2>
              <p style={styles.subtitle}>Enter your credentials to access your account</p>
            </div>
            
            {error && (
              <div style={styles.error}>
                <span style={styles.errorIcon}>⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  style={styles.input}
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.passwordContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    style={styles.input}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    style={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                style={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <div style={styles.buttonContent}>
                    <div style={styles.spinner}></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div style={styles.divider}>
              <span>New to EduKendra?</span>
            </div>

            <Link to="/register" style={styles.registerLink}>
              Create an account
            </Link>

            <div style={styles.footer}>
              <p style={styles.footerText}>
                By continuing, you agree to EduKendra's <a href="#" style={styles.link}>Terms of Service</a> and <a href="#" style={styles.link}>Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  wrapper: {
    display: 'flex',
    width: '100%',
    maxWidth: '1200px',
    height: '700px',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  leftSection: {
    flex: 1,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '60px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  heroContent: {
    maxWidth: '400px'
  },
  heroTitle: {
    fontSize: '42px',
    fontWeight: 'bold',
    marginBottom: '20px',
    lineHeight: '1.2'
  },
  heroSubtitle: {
    fontSize: '18px',
    opacity: 0.9,
    marginBottom: '40px',
    lineHeight: '1.6'
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '16px'
  },
  featureIcon: {
    fontSize: '20px'
  },
  rightSection: {
    flex: 1,
    padding: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    width: '100%',
    maxWidth: '400px'
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: '8px'
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '16px'
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  errorIcon: {
    fontSize: '16px'
  },
  form: {
    marginBottom: '32px'
  },
  formGroup: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '16px',
    transition: 'border-color 0.2s ease',
    outline: 'none'
  },
  passwordContainer: {
    position: 'relative'
  },
  passwordToggle: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px'
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginTop: '8px'
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  divider: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    marginBottom: '20px',
    position: 'relative'
  },
  registerLink: {
    display: 'block',
    textAlign: 'center',
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    color: '#374151',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    marginBottom: '24px'
  },
  footer: {
    textAlign: 'center'
  },
  footerText: {
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: '1.5'
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none'
  }
};

export default Login;