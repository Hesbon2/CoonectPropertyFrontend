import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services";
import "../styles/RegistrationPage.css";

const RegistrationPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    whatsappNumber: "",
    password: "",
    confirmPassword: "",
    userType: "Customer",
    nationality: "Kenyan"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError("");
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const { confirmPassword, ...registrationData } = formData;
      await authService.register(registrationData);
      navigate('/home');
    } catch (err) {
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="logo-container">
        <div className="logo-mobile">BC</div>
        <div className="logo-desktop">Business Connect</div>
      </div>

      <div className="content-section desktop-only">
        <div className="business-title">Business Connect</div>
        <div className="business-description">
          We're your direct bridge between travelers and providers—connecting
          you straight to business owners with no brokers in between
        </div>
      </div>

      <div className="form-card">
        <div className="form-content">
          <h2 className="form-title">Register</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="registration-form">
            <div className="form-row">
              <div className="input-group">
                <label className="input-label">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your email address"
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">User Type</label>
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="Customer">Customer</option>
                  <option value="Business Owner">Business Owner</option>
                  <option value="Traveler">Traveler</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <div className="phone-input-container">
                  <div className="country-code">
                    <span>+254</span>
                    <img
                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/7e8e5e661bf1c4f9a140270f18a9eb3a24f02d19?placeholderIfAbsent=true&apiKey=6902ff946ed54860819945c4f8303756"
                      alt="Kenya flag"
                      className="flag-icon"
                    />
                  </div>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="phone-input"
                    placeholder="712345678"
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">WhatsApp Number</label>
                <div className="phone-input-container">
                  <div className="country-code">
                    <span>+254</span>
                    <img
                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/5ed834acec3a09791fa536cf3d1900499dbe698e?placeholderIfAbsent=true&apiKey=6902ff946ed54860819945c4f8303756"
                      alt="Kenya flag"
                      className="flag-icon"
                    />
                  </div>
                  <input
                    type="tel"
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    className="phone-input"
                    placeholder="712345678"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter a strong password"
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            <div className="submit-section">
              <button
                type="submit"
                className="register-button"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Register"}
              </button>
            </div>

            <div className="login-prompt">
              Already have an account?{" "}
              <button
                type="button"
                className="switch-button"
                onClick={() => navigate("/login")}
              >
                Login here
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
