import React, { useState, useRef, useEffect } from 'react';
import { authService } from '../services';
import { useNavigate } from 'react-router-dom';
import '../styles/SettingsView.css';

const SettingsView = ({ onBack }) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('personal');
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    nationality: 'Kenyan',
    profilePicture: 'https://example.com/default-avatar.jpg',
    phoneNumber: '',
    whatsappNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = authService.getCurrentUser();
      if (user) {
        setFormData(prevData => ({
          ...prevData,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          nationality: user.nationality || 'Kenyan',
          profilePicture: user.profilePicture || 'https://example.com/default-avatar.jpg',
          phoneNumber: user.phoneNumber || '',
          whatsappNumber: user.whatsappNumber || ''
        }));
      }
    } catch (err) {
      setError('Failed to load user data');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);
        setError('');
        await authService.uploadProfilePicture(file);
        // Reload user data to get updated profile picture
        await loadUserData();
      } catch (err) {
        setError('Failed to upload profile picture');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      switch (activeSection) {
        case 'personal':
          await authService.updateProfile({
            firstName: formData.firstName,
            lastName: formData.lastName,
            nationality: formData.nationality
          });
          break;
        case 'contact':
          // Format phone numbers to include country code if not present
          const phoneNumber = formData.phoneNumber.startsWith('+') 
            ? formData.phoneNumber 
            : `+254${formData.phoneNumber}`;
          const whatsappNumber = formData.whatsappNumber.startsWith('+') 
            ? formData.whatsappNumber 
            : `+254${formData.whatsappNumber}`;
          
          await authService.updateProfile({
            phoneNumber,
            whatsappNumber
          });
          break;
        case 'password':
          if (formData.newPassword !== formData.confirmPassword) {
            throw new Error('Passwords do not match');
          }
          if (formData.newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters long');
          }
          await authService.updatePassword(formData.currentPassword, formData.newPassword);
          // Clear password fields after successful update
          setFormData(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }));
          break;
      }
      // Reload user data to ensure UI is in sync with backend
      await loadUserData();
      setIsMobileModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
      try {
        await authService.deleteAccount();
        setIsMobileModalOpen(false);
        onBack();
      } catch (err) {
        setError('Failed to delete account');
      }
    }
  };

  const handleMenuItemClick = (section) => {
    setActiveSection(section);
    if (window.innerWidth <= 768) {
      setIsMobileModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsMobileModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to logout');
    }
  };

  const renderModalContent = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <div className="modal-content">
            <div className="modal-header">
              <h2>Personal details</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Nationality</label>
                <select
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                >
                  <option value="Kenyan">Kenyan</option>
                  <option value="Ugandan">Ugandan</option>
                  <option value="Tanzanian">Tanzanian</option>
                </select>
              </div>
            </div>

            <div className="profile-upload-section">
              <label>Profile picture</label>
              <div className="profile-picture-section">
                <div className="profile-picture-container" onClick={handleUploadClick}>
                  <div className="profile-picture-wrapper">
                    <img
                      src={formData.profilePicture}
                      alt="Profile"
                      className="profile-picture"
                    />
                    <div className="profile-picture-overlay">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-3.2-5c0 1.77 1.43 3.2 3.2 3.2s3.2-1.43 3.2-3.2-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2z"/>
                      </svg>
                      <span>Change Photo</span>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </div>

            <button className="save-button" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        );
      case 'contact':
        return (
          <div className="modal-content">
            <div className="modal-header">
              <h2>Contact details</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label>Phone Number</label>
                <div className="phone-input-group">
                  <select className="country-code" defaultValue="+254">
                    <option value="+254">+254</option>
                  </select>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="712345678"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>WhatsApp Number</label>
                <div className="phone-input-group">
                  <select className="country-code" defaultValue="+254">
                    <option value="+254">+254</option>
                  </select>
                  <input
                    type="tel"
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleInputChange}
                    placeholder="712345678"
                  />
                </div>
              </div>
            </div>
            <button className="save-button" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        );
      case 'password':
        return (
          <div className="modal-content">
            <div className="modal-header">
              <h2>Update Password</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="form-grid single-column">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button className="save-button" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        );
      case 'delete':
        return (
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete Account</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="delete-account-section">
              <p className="delete-description">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button className="delete-button" onClick={handleDeleteAccount}>
                Delete Account
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-sidebar">
        <div className="settings-header">
          <button className="back-button" onClick={onBack}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h1>Settings</h1>
        </div>
        <div className="settings-menu">
          <button 
            className={`menu-item ${activeSection === 'personal' ? 'active' : ''}`}
            onClick={() => handleMenuItemClick('personal')}
          >
            Personal details
          </button>
          <button 
            className={`menu-item ${activeSection === 'contact' ? 'active' : ''}`}
            onClick={() => handleMenuItemClick('contact')}
          >
            Contact details
          </button>
          <button 
            className={`menu-item ${activeSection === 'password' ? 'active' : ''}`}
            onClick={() => handleMenuItemClick('password')}
          >
            Update Password
          </button>
          <button 
            className="menu-item delete-account"
            onClick={() => handleMenuItemClick('delete')}
          >
            Delete Account
          </button>
        </div>
      </div>

      <div className="settings-content">
        {renderModalContent()}
      </div>

      {/* Mobile Modal */}
      {isMobileModalOpen && (
        <div className="mobile-modal-overlay" onClick={handleCloseModal}>
          <div className="mobile-modal" onClick={e => e.stopPropagation()}>
            {renderModalContent()}
          </div>
        </div>
      )}

      {/* Mobile Logout Button */}
      <button className="mobile-logout-button" onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
};

export default SettingsView; 