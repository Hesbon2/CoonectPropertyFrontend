import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/WelcomePage.css';

const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <div className="logo-container">
        <div className="logo-mobile">BC</div>
        <div className="logo-desktop">Business Connect</div>
      </div>
      <div className="welcome-content">
        <div className="welcome-card">
          <h1>Business Connect</h1>
          <p className="tagline">
            We connect travelers directly with business owners—no brokers, no middlemen.
          </p>
          <h2>Get started now</h2>
          <div className="welcome-buttons">
            <button 
              className="login-button"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button 
              className="register-button"
              onClick={() => navigate('/register')}
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage; 