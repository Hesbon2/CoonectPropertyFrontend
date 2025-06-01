import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/HomePage.css';
import ChatsView from "./ChatsView";
import BookmarkedView from './BookmarkedView';
import SettingsView from './SettingsView';
import MyPostsView from './MyPostsView';
import inquiryService from '../services/inquiry.service';
import chatService from '../services/chat.service';

const ITEMS_PER_PAGE = 12;

function HomePage() {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isPostInquiryOpen, setIsPostInquiryOpen] = useState(false);
  const [activeView, setActiveView] = useState('enquirers');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState('Location');
  const [requesterFilter, setRequesterFilter] = useState('All Types');
  const [nightsFilter, setNightsFilter] = useState('All Duration');
  const [budgetFilter, setBudgetFilter] = useState('All Duration');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    requesterType: '',
    houseType: '',
    unitSize: '',
    budget: '',
    checkInDate: '',
    checkOutDate: '',
    location: '',
    specialRequirements: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());
  const [viewedInquiries] = useState(new Set());
  const observerRef = useRef(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const lastInquiryRef = useRef();
  const loadingRef = useRef();

  const lastInquiryCallback = useCallback(node => {
    if (loading) return;
    if (lastInquiryRef.current) lastInquiryRef.current.disconnect();

    lastInquiryRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) lastInquiryRef.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    fetchInquiries(true);
  }, []);

  useEffect(() => {
    if (!initialLoad) {
      fetchInquiries(false);
    }
  }, [page]);

  useEffect(() => {
    // Initialize Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const inquiryId = entry.target.dataset.inquiryId;
            if (inquiryId && !viewedInquiries.has(inquiryId)) {
              viewedInquiries.add(inquiryId);
              handleViewIncrement(inquiryId);
            }
          }
        });
      },
      { threshold: 0.5 } // Card must be 50% visible to trigger
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Update observer whenever inquiries change
  useEffect(() => {
    const observer = observerRef.current;
    if (observer) {
      // First disconnect all previous observations
      observer.disconnect();
      
      // Then observe all inquiry cards
      const cards = document.querySelectorAll('.listing-card');
      cards.forEach(card => observer.observe(card));
    }
  }, [inquiries]);

  const fetchInquiries = async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) {
        setLoading(true);
        setPage(1);
      }
      
      const response = await inquiryService.getInquiries(page, ITEMS_PER_PAGE);
      
      // Transform the response data to match the UI format
      const formattedInquiries = response.map(inquiry => {
        if (!inquiry._id && !inquiry.id) {
          console.error('Inquiry missing ID:', inquiry);
          return null;
        }

        return {
          id: inquiry._id || inquiry.id,
          userAvatar: inquiry.user?.avatar || "https://cdn.builder.io/api/v1/image/assets/TEMP/425a2991fdc5d493a84ad80fceedaf9b2e8e8548",
          userName: inquiry.user ? `${inquiry.user.firstName} ${inquiry.user.lastName}` : 'Anonymous User',
          userType: inquiry.requesterType,
          propertyTitle: `${inquiry.houseType} - ${inquiry.unitSize}`,
          location: inquiry.location,
          date: `${new Date(inquiry.checkInDate).toLocaleDateString()} - ${new Date(inquiry.checkOutDate).toLocaleDateString()}`,
          price: inquiry.budget.toLocaleString(),
          duration: `${Math.ceil((new Date(inquiry.checkOutDate) - new Date(inquiry.checkInDate)) / (1000 * 60 * 60 * 24))} nights`,
          description: inquiry.description,
          stats: {
            inquiries: inquiry.engagement?.inquiries?.toString() || '0',
            likes: inquiry.engagement?.likes?.toString() || '0',
            views: inquiry.engagement?.views?.toString() || '0',
            isLiked: Array.isArray(inquiry.likes) && inquiry.likes.includes(inquiry.user?._id),
            isBookmarked: Array.isArray(inquiry.bookmarks) && inquiry.bookmarks.includes(inquiry.user?._id)
          },
          postedTime: getTimeAgo(new Date(inquiry.createdAt))
        };
      }).filter(Boolean);

      setInquiries(prev => isInitialFetch ? formattedInquiries : [...prev, ...formattedInquiries]);
      setHasMore(formattedInquiries.length === ITEMS_PER_PAGE);
      setError(null);
      setInitialLoad(false);
    } catch (err) {
      console.error('Error fetching inquiries:', err);
      setError('Failed to fetch inquiries. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
      y: 31536000,
      mo: 2592000,
      w: 604800,
      d: 86400,
      h: 3600,
      m: 60,
      s: 1
    };

    for (let [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval > 1) {
        return `${interval}${unit}`;
      }
    }
    return 'just now';
  };

  const resetForm = () => {
    setFormData({
      requesterType: '',
      houseType: '',
      unitSize: '',
      budget: '',
      checkInDate: '',
      checkOutDate: '',
      location: '',
      specialRequirements: '',
      description: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.checkInDate || !formData.checkOutDate) {
      setError('Please select valid dates');
      return false;
    }

    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);

    if (checkOut <= checkIn) {
      setError('Check-out date must be after check-in date');
      return false;
    }

    if (!formData.budget || isNaN(parseFloat(formData.budget.replace(/[^0-9.]/g, '')))) {
      setError('Please enter a valid budget');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Format budget to number and dates to ISO strings
      const formattedData = {
        ...formData,
        budget: parseFloat(formData.budget.replace(/[^0-9.]/g, '')),
        checkInDate: new Date(formData.checkInDate).toISOString(),
        checkOutDate: new Date(formData.checkOutDate).toISOString()
      };

      await inquiryService.createInquiry(formattedData);
      resetForm();
      handleClosePostInquiry();
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error('Error creating inquiry:', error);
      setError(error.response?.data?.message || 'Failed to create inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostInquiryClick = () => {
    setIsPostInquiryOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleClosePostInquiry = () => {
    setIsPostInquiryOpen(false);
    document.body.style.overflow = 'auto';
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleLogout = () => {
    navigate("/login");
  };

  const handleChatClick = (listing) => {
    setSelectedListing(listing);
    setIsChatOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedListing(null);
    document.body.style.overflow = 'auto';
  };

  const handleLikeClick = async (inquiryId) => {
    if (isSubmittingAction) return;
    
    try {
      setIsSubmittingAction(true);
      
      // Optimistic update
      setInquiries(prev => prev.map(inquiry => {
        if (inquiry.id === inquiryId) {
          const currentLikes = parseInt(inquiry.stats.likes) || 0;
          const isCurrentlyLiked = inquiry.stats.isLiked;
          return {
            ...inquiry,
            stats: {
              ...inquiry.stats,
              likes: (isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1).toString(),
              isLiked: !isCurrentlyLiked
            }
          };
        }
        return inquiry;
      }));

      await inquiryService.toggleLike(inquiryId);
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update on error
      fetchInquiries(true);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleBookmarkClick = async (inquiryId) => {
    if (isSubmittingAction) return;
    
    try {
      setIsSubmittingAction(true);
      
      // Optimistic update
      setInquiries(prev => prev.map(inquiry => {
        if (inquiry.id === inquiryId) {
          return {
            ...inquiry,
            stats: {
              ...inquiry.stats,
              isBookmarked: !inquiry.stats.isBookmarked
            }
          };
        }
        return inquiry;
      }));

      await inquiryService.toggleBookmark(inquiryId);
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      // Revert optimistic update on error
      fetchInquiries(true);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleInquiryClick = async (inquiryId) => {
    if (isSubmittingAction) return;
    try {
      setIsSubmittingAction(true);
      
      // Create or get existing chat
      const chatData = await chatService.createOrGetChat(inquiryId);
      
      // Update inquiries count locally
      setInquiries(prevInquiries => 
        prevInquiries.map(inquiry => {
          if (inquiry.id === inquiryId) {
            const inquiriesCount = parseInt(inquiry.stats.inquiries) + 1;
            return {
              ...inquiry,
              stats: {
                ...inquiry.stats,
                inquiries: inquiriesCount.toString()
              }
            };
          }
          return inquiry;
        })
      );

      // Switch to chat view and select the chat
      setActiveView('chats');
      if (chatData) {
        handleChatClick(chatData);
      }
    } catch (err) {
      console.error('Error handling inquiry:', err);
      setError('Failed to start chat. Please try again.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleViewIncrement = async (inquiryId) => {
    try {
      await inquiryService.incrementView(inquiryId);
      
      // Update views count locally
      setInquiries(prevInquiries => 
        prevInquiries.map(inquiry => {
          if (inquiry.id === inquiryId) {
            const viewsCount = parseInt(inquiry.stats.views) + 1;
            return {
              ...inquiry,
              stats: {
                ...inquiry.stats,
                views: viewsCount.toString()
              }
            };
          }
          return inquiry;
        })
      );
    } catch (err) {
      console.error('Error incrementing view:', err);
    }
  };

  const toggleDescription = (inquiryId) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(inquiryId)) {
        newSet.delete(inquiryId);
      } else {
        newSet.add(inquiryId);
      }
      return newSet;
    });
  };

  const renderPostInquiryModal = () => {
    if (!isPostInquiryOpen) return null;

  return (
      <div className="post-inquiry-modal-overlay" onClick={handleClosePostInquiry}>
        <div className="post-inquiry-modal" onClick={e => e.stopPropagation()}>
          <div className="post-inquiry-header">
            <h2 className="post-inquiry-title">Post Inquiry</h2>
            <button className="close-modal-button" onClick={handleClosePostInquiry}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
          <form className="post-inquiry-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">You are</label>
              <select 
                className="form-select"
                name="requesterType"
                value={formData.requesterType}
                onChange={handleInputChange}
                required
              >
                <option value="">Select</option>
                <option value="tenant">Tenant</option>
                <option value="agent">Agent</option>
                <option value="landlord">Landlord</option>
              </select>
                </div>
            <div className="form-group">
              <label className="form-label">House Type</label>
              <select 
                className="form-select"
                name="houseType"
                value={formData.houseType}
                onChange={handleInputChange}
                required
              >
                <option value="">Select</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
              </select>
              </div>
            <div className="form-group">
              <label className="form-label">Unit Size</label>
              <select 
                className="form-select"
                name="unitSize"
                value={formData.unitSize}
                onChange={handleInputChange}
                required
              >
                <option value="">Select</option>
                <option value="1br">1 Bedroom</option>
                <option value="2br">2 Bedrooms</option>
                <option value="3br">3 Bedrooms</option>
              </select>
                </div>
            <div className="form-group">
              <label className="form-label">Budget per day (Ksh)</label>
              <div className="currency-input">
                <span className="currency-label">Ksh</span>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g 5,000"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  pattern="[0-9,]*"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Check-in Date</label>
              <input 
                type="date" 
                className="form-input"
                name="checkInDate"
                value={formData.checkInDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
                </div>
            <div className="form-group">
              <label className="form-label">Check-out Date</label>
              <input 
                type="date" 
                className="form-input"
                name="checkOutDate"
                value={formData.checkOutDate}
                onChange={handleInputChange}
                min={formData.checkInDate || new Date().toISOString().split('T')[0]}
                required
              />
              </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select 
                className="form-select"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
              >
                <option value="">Select</option>
                <option value="nairobi">Nairobi</option>
                <option value="mombasa">Mombasa</option>
                <option value="kisumu">Kisumu</option>
              </select>
                </div>
            <div className="form-group full-width">
              <label className="form-label">Special requirements</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g must have swimming pool, parking, etc"
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleInputChange}
              />
              </div>
            <div className="form-group full-width">
              <label className="form-label">Detailed Description</label>
              <textarea 
                className="form-textarea" 
                placeholder="Tell us more about what you're looking for"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              ></textarea>
            </div>
            <button 
              type="submit" 
              className="post-inquiry-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post Enquiry'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderEngagementStats = (inquiry) => {
    console.log('Rendering engagement stats for inquiry:', inquiry);
    return (
    <div className="engagement-stats">
        <div 
          className={`engagement-item ${isSubmittingAction ? 'disabled' : ''}`} 
          onClick={() => inquiry?.id ? handleInquiryClick(inquiry.id) : console.error('No inquiry ID available')}
          title="Send inquiry"
        >
          <svg 
          className="engagement-icon"
            viewBox="0 0 24 24" 
            fill="currentColor"
            width="20" 
            height="20"
          >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
          </svg>
          <div className="engagement-count">{inquiry?.stats?.inquiries || '0'}</div>
                </div>
        <div 
          className={`engagement-item ${inquiry?.stats?.isLiked ? 'active' : ''} ${isSubmittingAction ? 'disabled' : ''}`}
          onClick={() => inquiry?.id ? handleLikeClick(inquiry.id) : console.error('No inquiry ID available')}
          title={inquiry?.stats?.isLiked ? 'Unlike' : 'Like'}
        >
          <svg 
          className="engagement-icon"
            viewBox="0 0 24 24" 
            fill={inquiry?.stats?.isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            width="20" 
            height="20"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <div className="engagement-count">{inquiry?.stats?.likes || '0'}</div>
        </div>
        <div 
          className="engagement-item"
          title="Views"
        >
          <svg 
            className="engagement-icon" 
            viewBox="0 0 24 24" 
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="20" 
            height="20"
          >
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          <div className="engagement-count">{inquiry?.stats?.views || '0'}</div>
        </div>
        <div 
          className={`bookmark-icon-container ${inquiry?.stats?.isBookmarked ? 'active' : ''} ${isSubmittingAction ? 'disabled' : ''}`}
          onClick={() => inquiry?.id ? handleBookmarkClick(inquiry.id) : console.error('No inquiry ID available')}
          title={inquiry?.stats?.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <svg 
            className="bookmark-icon" 
            viewBox="0 0 24 24" 
            fill={inquiry?.stats?.isBookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            width="20" 
            height="20"
          >
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v12z"/>
          </svg>
        </div>
      </div>
    );
  };

  const SkeletonCard = () => (
    <div className="listing-card skeleton">
      <div className="user-avatar">
        <div className="skeleton-avatar"></div>
      </div>
      <div className="listing-content">
        <div className="user-info-section">
          <div className="skeleton-text-container">
            <div className="skeleton-text"></div>
            <div className="skeleton-text"></div>
          </div>
        </div>
        <div className="property-info">
          <div className="skeleton-text"></div>
          <div className="skeleton-text"></div>
          <div className="skeleton-text"></div>
        </div>
        <div className="skeleton-stats">
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
        </div>
      </div>
    </div>
  );

  const renderListings = () => {
    if (initialLoad) {
      return (
        <div className="listings-grid">
          {Array(8).fill(0).map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (inquiries.length === 0 && !loading) {
      return <div className="no-inquiries-message">No inquiries found.</div>;
    }

    return (
      <div className="listings-grid">
        {inquiries.map((inquiry, index) => (
          <div 
            key={inquiry.id} 
            className="listing-card"
            data-inquiry-id={inquiry.id}
            ref={index === inquiries.length - 1 ? lastInquiryCallback : null}
          >
            <div className="user-avatar">
              <img
                src={inquiry.userAvatar}
                className="avatar-image"
          alt=""
        />
              </div>
            <div className="listing-content">
              <div className="user-info-section">
                <div className="user-details">
                  <div className="user-name">{inquiry.userName}</div>
                  <div className="user-type">{inquiry.userType}</div>
                  <div className="time-info">
                <img
                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/0f9874589ee0bdb64fcbffa82d768a5938cf644e?placeholderIfAbsent=true"
                      className="time-icon"
                  alt=""
                />
                    <div className="time-text">{inquiry.postedTime}</div>
              </div>
                </div>
                <div className="menu-icon-container">
                <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/d4118c4b30442ce8baec8d3cdf276082acc79ad8?placeholderIfAbsent=true"
                    className="menu-icon"
                  alt=""
                />
              </div>
              </div>
              <div className="property-info">
                <div className="property-details">
                  <div className="property-title">
                    {inquiry.propertyTitle}
                  </div>
                  <div className="duration-badge">{inquiry.duration}</div>
                </div>
                <div className="location-info">
                  <div className="location-text">{inquiry.location}</div>
                </div>
              </div>
              <div className="date-price-section">
                <div className="date-info">{inquiry.date}</div>
                <div className="price-info">
                  <span className="price-amount">Ksh {inquiry.price}</span>
                  <span className="price-period">/night</span>
                </div>
              </div>
              <div className="description-section">
                <div className={`description-text ${expandedDescriptions.has(inquiry.id) ? 'expanded' : ''}`}>
                  <span className="description-content">{inquiry.description}</span>
                  {inquiry.description.length > 100 && (
                    <button 
                      className="show-more-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDescription(inquiry.id);
                      }}
                    >
                      {expandedDescriptions.has(inquiry.id) ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
                {renderEngagementStats(inquiry)}
              </div>
            </div>
          </div>
        ))}
        {loading && !initialLoad && (
          <div ref={loadingRef} className="loading-more">
            <SkeletonCard />
          </div>
        )}
            </div>
  );
  };

  const renderMainContent = () => {
    if (isSettingsOpen) {
      return <SettingsView onBack={handleCloseSettings} />;
    }

    switch (activeView) {
      case 'enquirers':
        return (
          <>
            <div className="my-posts-header">
              <h1 className="my-posts-title">Enquirers</h1>
              <div className="header-actions">
                <button className="action-button">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </button>
                <button className="action-button">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
              </div>
            </div>

          <div className="filters-section">
            <div className="filters-container">
              <div className="filter-group">
                <div className="filter-label">Location</div>
                  <select 
                    className="filter-select"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  >
                    <option value="Location">Location</option>
                    <option value="nairobi">Nairobi</option>
                    <option value="mombasa">Mombasa</option>
                    <option value="kisumu">Kisumu</option>
                  </select>
              </div>
              <div className="filter-group">
                <div className="filter-label">Requester</div>
                  <select 
                    className="filter-select"
                    value={requesterFilter}
                    onChange={(e) => setRequesterFilter(e.target.value)}
                  >
                    <option value="All Types">All Types</option>
                    <option value="tenant">Tenant</option>
                    <option value="agent">Agent</option>
                    <option value="landlord">Landlord</option>
                  </select>
              </div>
              <div className="filter-group">
                <div className="filter-label">Nights</div>
                  <select 
                    className="filter-select"
                    value={nightsFilter}
                    onChange={(e) => setNightsFilter(e.target.value)}
                  >
                    <option value="All Duration">All Duration</option>
                    <option value="1-7">1-7 nights</option>
                    <option value="8-14">8-14 nights</option>
                    <option value="15-30">15-30 nights</option>
                    <option value="30+">30+ nights</option>
                  </select>
                </div>
                <div className="filter-group">
                <div className="filter-label">Budget</div>
                  <select 
                    className="filter-select"
                    value={budgetFilter}
                    onChange={(e) => setBudgetFilter(e.target.value)}
                  >
                    <option value="All Duration">All Duration</option>
                    <option value="0-5000">Ksh 0 - 5,000</option>
                    <option value="5000-10000">Ksh 5,000 - 10,000</option>
                    <option value="10000-20000">Ksh 10,000 - 20,000</option>
                    <option value="20000+">Ksh 20,000+</option>
                  </select>
                </div>
              </div>
              <button className="mobile-filters-toggle" onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
                </svg>
              </button>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

          <div className="listings-section">
              {renderListings()}
            </div>
          </>
        );
      case 'chats':
        return <ChatsView onChatSelect={handleChatClick} />;
      case 'my-posts':
        return <MyPostsView />;
      case 'bookmarked':
        return <BookmarkedView onSettingsClick={handleSettingsClick} />;
      case 'settings':
        return <SettingsView onBack={() => setActiveView('enquirers')} />;
      default:
        return null;
    }
  };

  return (
    <div className="business-connect">
      {showSuccessMessage && (
        <div className="success-message">
          Inquiry posted successfully
        </div>
      )}
      <div className="main-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">Business Connect</div>
          </div>
          <div className="sidebar-content">
            <div className="stats-section">
              <div 
                className={`stat-item ${activeView === 'enquirers' ? 'highlighted' : ''}`}
                onClick={() => setActiveView('enquirers')}
              >
                <div className="stat-content">
                        <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/b30d3607606836bd998be227d60f33c78ef5bd8e?placeholderIfAbsent=true"
                    className="stat-icon"
                    alt=""
                  />
                  <div className="stat-label">Enquirers</div>
                </div>
                <div className="stat-value">1k</div>
              </div>
              <div 
                className={`stat-item ${activeView === 'chats' ? 'highlighted' : ''}`}
                onClick={() => setActiveView('chats')}
              >
                <div className="stat-content">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/bbbf52528f3155040a47c8851dbd1d2ab2ba520b?placeholderIfAbsent=true"
                    className="stat-icon"
                          alt=""
                        />
                  <div className="stat-label">Chats</div>
                </div>
                <div className="stat-value">1k</div>
                      </div>
              <div 
                className={`stat-item ${activeView === 'my-posts' ? 'highlighted' : ''}`}
                onClick={() => setActiveView('my-posts')}
              >
                <div className="stat-content">
                        <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/bbbf52528f3155040a47c8851dbd1d2ab2ba520b?placeholderIfAbsent=true"
                    className="stat-icon"
                          alt=""
                        />
                  <div className="stat-label">My post</div>
                </div>
                <div className="stat-value">5</div>
                      </div>
              <div 
                className={`stat-item ${activeView === 'bookmarked' ? 'highlighted' : ''}`}
                onClick={() => setActiveView('bookmarked')}
              >
                <div className="stat-content">
                        <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/bbbf52528f3155040a47c8851dbd1d2ab2ba520b?placeholderIfAbsent=true"
                    className="stat-icon"
                          alt=""
                        />
                  <div className="stat-label">Book Marked</div>
                </div>
                <div className="stat-value">5</div>
              </div>
                      </div>
            <div className="sidebar-actions">
              <div className="post-inquiry-button" onClick={handlePostInquiryClick}>
                <div className="plus-icon">
                        <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/33e392588c432c151aabb4b2686715e445d3016c?placeholderIfAbsent=true"
                          alt=""
                        />
                      </div>
                <div className="post-inquiry-text">Post inquiry</div>
              </div>
              <div className="settings-item" onClick={() => setActiveView('settings')}>
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/b0728b7babb5d3b4040f4d23333bc916b684b5d6?placeholderIfAbsent=true"
                  className="settings-icon"
                  alt=""
                />
                <div className="settings-text">Settings</div>
              </div>
              <div className="logout-item" onClick={handleLogout}>
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/354b7239dc16dc4fdcbc674451a2b24b0ffef15c?placeholderIfAbsent=true"
                  className="logout-icon"
                  alt=""
                />
                <div className="logout-text">Log out</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="main-content">
          {renderMainContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <div 
          className={`nav-item ${activeView === 'enquirers' ? 'active' : ''}`}
          onClick={() => setActiveView('enquirers')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V18c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-1.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <span>Enquirers</span>
                  </div>
        <div 
          className={`nav-item ${activeView === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveView('chats')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
          <span>Chats</span>
                </div>
        <div 
          className={`nav-item ${activeView === 'my-posts' ? 'active' : ''}`}
          onClick={() => setActiveView('my-posts')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/>
          </svg>
          <span>My post</span>
              </div>
        <div 
          className={`nav-item ${activeView === 'bookmarked' ? 'active' : ''}`}
          onClick={() => setActiveView('bookmarked')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v12z"/>
                  </svg>
          <span>Bookmarks</span>
        </div>
        <div 
          className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveView('settings')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
                  </svg>
          <span>Settings</span>
              </div>
      </nav>

      {/* Floating Post Button */}
      {activeView !== 'chats' && activeView !== 'settings' && (
        <button className="floating-post-button" onClick={handlePostInquiryClick}>
          <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </button>
      )}

      {renderPostInquiryModal()}
    </div>
  );
}

export default HomePage;
