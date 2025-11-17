import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Confirm Logout</h3>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalText}>Are you sure you want to logout?</p>
            </div>
            <div style={styles.modalActions}>
              <button 
                style={styles.cancelButton}
                onClick={cancelLogout}
              >
                Cancel
              </button>
              <button 
                style={styles.confirmButton}
                onClick={confirmLogout}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <nav style={styles.navbar}>
        <div className="container">
          <div style={styles.navContent}>
            <Link to="/" style={styles.logo}>
              <h2>EduKendra</h2>
            </Link>
            
            <div style={styles.navLinks}>
              <Link to="/courses" style={styles.navLink}>Courses</Link>
              
              {currentUser ? (
                <div style={styles.userSection}>
                  <Link to="/dashboard" style={styles.navLink}>
                    Dashboard
                  </Link>
                  <span style={styles.userName}>Hello, {currentUser.name}</span>
                  <button 
                    onClick={handleLogoutClick}
                    style={styles.logoutBtn}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div style={styles.authLinks}>
                  <Link to="/login" style={styles.navLink}>Login</Link>
                  <Link to="/register" style={{...styles.navLink, ...styles.registerBtn}}>
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

const styles = {
  navbar: {
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '16px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  navContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    textDecoration: 'none',
    color: '#4f46e5',
    fontWeight: 'bold',
    fontSize: '24px'
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px'
  },
  navLink: {
    textDecoration: 'none',
    color: '#374151',
    fontWeight: '500',
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'all 0.2s ease'
  },
  registerBtn: {
    backgroundColor: '#4f46e5',
    color: 'white'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userName: {
    color: '#6b7280',
    fontSize: '14px'
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #dc2626',
    color: '#dc2626',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  authLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  // Modal styles for logout confirmation
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
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  modalHeader: {
    marginBottom: '16px'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1a202c',
    margin: 0
  },
  modalBody: {
    marginBottom: '24px'
  },
  modalText: {
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  },
  confirmButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  }
};

export default Navbar;