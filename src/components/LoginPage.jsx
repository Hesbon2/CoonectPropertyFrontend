import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services";
import '../styles/LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.login(formData.email, formData.password);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Implement forgot password functionality
    console.log("Forgot password clicked");
  };

  return (
    <div className="login-page">
      <div className="logo-container">
        <div className="logo-mobile">BC</div>
        <div className="logo-desktop">Business Connect</div>
      </div>
      <div className="login-container">
        <div className="login-content">
          <div className="branding-section desktop-only">
            <div className="brand-title">Business Connect</div>
            <div className="brand-description">
              <div className="description-text">
                We're your direct bridge between travelers and providers—connecting
                you straight to business owners with no brokers in between
              </div>
            </div>
          </div>

          <div className="form-container">
            <div className="form-wrapper">
              <h2 className="form-title">Login</h2>
              <form onSubmit={handleSubmit} className="login-form">
                {error && <div className="error-message">{error}</div>}
                <div className="form-fields">
                  <div className="field-group">
                    <label className="field-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="field-input"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="field-input"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <div className="submit-section">
                    <button 
                      type="submit" 
                      className="login-button"
                      disabled={loading}
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={handleForgotPassword}
                  >
                    Forgot Password?
                  </button>
                  <div className="register-prompt">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="switch-button"
                      onClick={() => navigate("/register")}
                    >
                      Register here
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 