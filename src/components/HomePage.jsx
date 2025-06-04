import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/HomePage.css';
import ChatsView from "./ChatsView";
import BookmarkedView from './BookmarkedView';
import SettingsView from './SettingsView';
import MyPostsView from './MyPostsView';
import LocationSelector from './LocationSelector';
import inquiryService from '../services/inquiry.service';
import chatService from '../services/chat.service';
import authService from '../services/auth.service';
import socketService from '../services/socket.service';
import { getInitialsAvatar } from '../utils/avatarUtils';
import { getAllCounties, getWardsByCounty } from '../utils/locations';
import statsService from '../services/stats.service';

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
    county: '',
    ward: '',
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
  const [filterCounty, setFilterCounty] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [stats, setStats] = useState({
    enquirers: 0,
    totalInquiries: 0,
    chats: 0,
    posts: 0,
    bookmarks: 0
  });
  const [filters, setFilters] = useState({
    county: '',
    ward: '',
    requesterType: '',
    houseType: '',
    unitSize: '',
    minBudget: '',
    maxBudget: '',
    checkInDate: '',
    checkOutDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    fetchStats();

    // Setup socket listeners for real-time updates
    const socket = socketService.connect();

    socket.on('inquiry_created', handleInquiryCreated);
    socket.on('inquiry_updated', handleInquiryUpdated);
    socket.on('inquiry_deleted', handleInquiryDeleted);
    socket.on('engagement_updated', handleEngagementUpdated);
    socket.on('bookmark_updated', handleBookmarkUpdated);
    socket.on('like_updated', handleLikeUpdated);
    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('stats_updated', handleStatsUpdated);

    return () => {
      socket.off('inquiry_created', handleInquiryCreated);
      socket.off('inquiry_updated', handleInquiryUpdated);
      socket.off('inquiry_deleted', handleInquiryDeleted);
      socket.off('engagement_updated', handleEngagementUpdated);
      socket.off('bookmark_updated', handleBookmarkUpdated);
      socket.off('like_updated', handleLikeUpdated);
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.off('stats_updated', handleStatsUpdated);
    };
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
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('limit', ITEMS_PER_PAGE);

      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await inquiryService.getInquiries(queryParams);
      const currentUser = authService.getCurrentUser();
      
      // Transform the response data to match the UI format
      const formattedInquiries = response.inquiries.map(inquiry => {
        if (!inquiry._id && !inquiry.id) {
          console.error('Inquiry missing ID:', inquiry);
          return null;
        }

        const firstName = inquiry.user?.firstName || '';
        const lastName = inquiry.user?.lastName || '';

        // Handle location data from both frontend and backend formats
        let locationText;
        if (inquiry.ward && inquiry.county) {
          locationText = `${inquiry.ward}, ${inquiry.county}`;
        } else if (inquiry.location) {
          // If location is stored as a combined string, split it
          const [ward, county] = inquiry.location.split(', ');
          locationText = `${ward}, ${county}`;
        } else {
          locationText = 'Location not specified';
        }

        return {
          id: inquiry._id || inquiry.id,
          userId: inquiry.user?._id,
          userAvatar: getInitialsAvatar(firstName, lastName),
          userName: `${firstName} ${lastName}`.trim() || 'Anonymous User',
          userType: inquiry.requesterType || inquiry.user?.userType || 'User',
          propertyTitle: `${inquiry.houseType} - ${inquiry.unitSize}`,
          location: locationText,
          date: `${new Date(inquiry.checkInDate).toLocaleDateString()} - ${new Date(inquiry.checkOutDate).toLocaleDateString()}`,
          price: inquiry.budget.toLocaleString(),
          duration: `${Math.ceil((new Date(inquiry.checkOutDate) - new Date(inquiry.checkInDate)) / (1000 * 60 * 60 * 24))} nights`,
          description: inquiry.description,
          stats: {
            inquiries: inquiry.engagement?.inquiries?.toString() || '0',
            likes: inquiry.engagement?.likes?.toString() || '0',
            views: inquiry.engagement?.views?.toString() || '0',
            isLiked: Array.isArray(inquiry.likes) && inquiry.likes.includes(currentUser?._id),
            isBookmarked: Array.isArray(inquiry.bookmarks) && inquiry.bookmarks.includes(currentUser?._id)
          },
          userStatus: {
            isOnline: inquiry.user?.isOnline || false,
            lastSeen: inquiry.user?.lastSeen
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
      county: '',
      ward: '',
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
      
      // Get county and ward names from their IDs
      const selectedCounty = getAllCounties().find(c => c.id === formData.county);
      const selectedWard = getWardsByCounty(formData.county).find(w => w.id === formData.ward);

      if (!selectedCounty || !selectedWard) {
        setError('Please select valid location');
        return;
      }

      // Format budget to number and dates to ISO strings
      const formattedData = {
        ...formData,
        budget: parseFloat(formData.budget.replace(/[^0-9.]/g, '')),
        checkInDate: new Date(formData.checkInDate).toISOString(),
        checkOutDate: new Date(formData.checkOutDate).toISOString(),
        county: selectedCounty.name,
        ward: selectedWard.name,
        location: `${selectedWard.name}, ${selectedCounty.name}` // Add combined location field
      };

      const response = await inquiryService.createInquiry(formattedData);
      
      // Emit socket event for real-time update
      socketService.emitInquiryCreated(response);
      
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
      
      // Refresh stats after toggling bookmark
      fetchStats();
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

      // Refresh stats after creating a new chat
      fetchStats();

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
              <label className="form-label">Budget per Night</label>
              <div className="currency-input">
                <span className="currency-label">KSH</span>
                <input 
                  type="text" 
                  className="form-input"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="0.00"
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
                required
              />
            </div>
            <div className="form-group full-width">
              <LocationSelector
                selectedCounty={formData.county}
                selectedWard={formData.ward}
                onCountyChange={(countyId) => handleInputChange({ target: { name: 'county', value: countyId } })}
                onWardChange={(wardId) => handleInputChange({ target: { name: 'ward', value: wardId } })}
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Special Requirements</label>
              <textarea 
                className="form-textarea"
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleInputChange}
                placeholder="Any specific requirements or preferences?"
              ></textarea>
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

  const renderFilters = () => (
    <div className="filters-section">
      <div className="filters-row">
        <div className="mobile-visible-filters">
          <LocationSelector
            selectedCounty={filters.county}
            selectedWard={filters.ward}
            onCountyChange={(countyId) => handleFilterChange('county', countyId)}
            onWardChange={(wardId) => handleFilterChange('ward', wardId)}
          />
        </div>

        <button 
          className="mobile-filters-toggle"
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          aria-label="Toggle filters"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 21v-7m0-4V3M12 21v-9m0-4V3M20 21v-5m0-4V3M1 14h6M9 10h6M17 16h6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className={`mobile-filters-content ${isMobileFiltersOpen ? 'open' : ''}`}>
          <select
            className="filter-select"
            value={filters.requesterType}
            onChange={(e) => handleFilterChange('requesterType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="tenant">Tenant</option>
            <option value="agent">Agent</option>
            <option value="landlord">Landlord</option>
          </select>

          <select
            className="filter-select"
            value={filters.houseType}
            onChange={(e) => handleFilterChange('houseType', e.target.value)}
          >
            <option value="">All Houses</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
          </select>

          <select
            className="filter-select"
            value={filters.unitSize}
            onChange={(e) => handleFilterChange('unitSize', e.target.value)}
          >
            <option value="">All Sizes</option>
            <option value="1br">1 Bedroom</option>
            <option value="2br">2 Bedrooms</option>
            <option value="3br">3 Bedrooms</option>
            <option value="4br+">4+ Bedrooms</option>
          </select>

          <div className="budget-filter">
            <input
              type="number"
              placeholder="Min Budget"
              value={filters.minBudget}
              onChange={(e) => handleFilterChange('minBudget', e.target.value)}
              className="filter-input"
            />
            <input
              type="number"
              placeholder="Max Budget"
              value={filters.maxBudget}
              onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="date-filter">
            <input
              type="date"
              value={filters.checkInDate}
              onChange={(e) => handleFilterChange('checkInDate', e.target.value)}
              className="filter-input"
            />
            <input
              type="date"
              value={filters.checkOutDate}
              onChange={(e) => handleFilterChange('checkOutDate', e.target.value)}
              className="filter-input"
            />
          </div>

          <button
            className="clear-filters-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>
      {isMobileFiltersOpen && (
        <div 
          className={`filters-overlay ${isMobileFiltersOpen ? 'open' : ''}`}
          onClick={() => setIsMobileFiltersOpen(false)}
        />
      )}
    </div>
  );

  const renderMainContent = () => {
    if (isSettingsOpen) {
      return <SettingsView onBack={handleCloseSettings} />;
    }

    switch (activeView) {
      case 'enquirers':
        return (
          <>
            {renderFilters()}
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
        return <BookmarkedView onSettingsClick={handleSettingsClick} setActiveView={setActiveView} />;
      case 'settings':
        return <SettingsView onBack={() => setActiveView('enquirers')} />;
      default:
        return null;
    }
  };

  // Real-time update handlers
  const handleInquiryCreated = (inquiry) => {
    if (!inquiry || (!inquiry._id && !inquiry.id)) {
      console.error('Invalid inquiry data received:', inquiry);
      return;
    }

    const formattedInquiry = formatInquiry(inquiry);
    if (!formattedInquiry) return;
    
    // Check if the inquiry already exists to prevent duplicates
    setInquiries(prev => {
      const exists = prev.some(i => i.id === formattedInquiry.id);
      if (exists) return prev;
      return [formattedInquiry, ...prev];
    });

    // Refresh stats when a new inquiry is created
    fetchStats();
  };

  const handleInquiryUpdated = (updatedInquiry) => {
    if (!updatedInquiry || (!updatedInquiry._id && !updatedInquiry.id)) {
      console.error('Invalid inquiry data received:', updatedInquiry);
      return;
    }

    const formattedInquiry = formatInquiry(updatedInquiry);
    if (!formattedInquiry) return;

    setInquiries(prev => prev.map(inquiry => 
      inquiry.id === formattedInquiry.id ? formattedInquiry : inquiry
    ));
  };

  const handleInquiryDeleted = (inquiryId) => {
    if (!inquiryId) {
      console.error('Invalid inquiry ID received:', inquiryId);
      return;
    }

    setInquiries(prev => prev.filter(inquiry => inquiry.id !== inquiryId));
  };

  const handleEngagementUpdated = ({ inquiryId, engagement, inquiry }) => {
    if (!inquiryId || !engagement) {
      console.error('Invalid engagement update data:', { inquiryId, engagement });
      return;
    }

    setInquiries(prev => prev.map(prevInquiry => {
      if (prevInquiry.id === inquiryId) {
        // If we have the full inquiry data, use formatInquiry
        if (inquiry) {
          const formattedInquiry = formatInquiry(inquiry);
          if (formattedInquiry) {
            return {
              ...formattedInquiry,
              stats: {
                ...formattedInquiry.stats,
                inquiries: engagement.inquiries.toString(),
                views: engagement.views.toString(),
                likes: engagement.likes.toString()
              }
            };
          }
        }
        
        // Fallback to just updating engagement stats
        return {
          ...prevInquiry,
          stats: {
            ...prevInquiry.stats,
            inquiries: engagement.inquiries.toString(),
            views: engagement.views.toString(),
            likes: engagement.likes.toString()
          }
        };
      }
      return prevInquiry;
    }));
  };

  const handleBookmarkUpdated = ({ inquiryId, isBookmarked }) => {
    if (!inquiryId) {
      console.error('Invalid bookmark update data:', { inquiryId, isBookmarked });
      return;
    }

    setInquiries(prev => prev.map(inquiry => {
      if (inquiry.id === inquiryId) {
        return {
          ...inquiry,
          stats: {
            ...inquiry.stats,
            isBookmarked
          }
        };
      }
      return inquiry;
    }));
  };

  const handleLikeUpdated = ({ inquiryId, isLiked, likesCount }) => {
    if (!inquiryId) {
      console.error('Invalid like update data:', { inquiryId, isLiked, likesCount });
      return;
    }

    setInquiries(prev => prev.map(inquiry => {
      if (inquiry.id === inquiryId) {
        return {
          ...inquiry,
          stats: {
            ...inquiry.stats,
            isLiked,
            likes: likesCount.toString()
          }
        };
      }
      return inquiry;
    }));
  };

  const handleUserStatusChanged = ({ userId, isOnline, lastSeen }) => {
    setInquiries(prev => prev.map(inquiry => {
      if (inquiry.userId === userId) {
        return {
          ...inquiry,
          userStatus: {
            isOnline,
            lastSeen
          }
        };
      }
      return inquiry;
    }));
  };

  const handleStatsUpdated = (newStats) => {
    setStats(newStats);
  };

  // Helper function to format inquiry data
  const formatInquiry = (inquiry) => {
    if (!inquiry || (!inquiry._id && !inquiry.id)) {
      console.error('Invalid inquiry data received:', inquiry);
      return null;
    }

    const firstName = inquiry.user?.firstName || '';
    const lastName = inquiry.user?.lastName || '';
    const currentUser = authService.getCurrentUser();

    // Handle location data from both frontend and backend formats
    let locationText;
    if (inquiry.ward && inquiry.county) {
      locationText = `${inquiry.ward}, ${inquiry.county}`;
    } else if (inquiry.location) {
      // If location is stored as a combined string, split it
      const [ward, county] = inquiry.location.split(', ');
      locationText = `${ward}, ${county}`;
    } else {
      locationText = 'Location not specified';
    }

    return {
      id: inquiry._id || inquiry.id,
      userId: inquiry.user?._id,
      userAvatar: getInitialsAvatar(firstName, lastName),
      userName: `${firstName} ${lastName}`.trim() || 'Anonymous User',
      userType: inquiry.requesterType || inquiry.user?.userType || 'User',
      propertyTitle: `${inquiry.houseType} - ${inquiry.unitSize}`,
      location: locationText,
      date: `${new Date(inquiry.checkInDate).toLocaleDateString()} - ${new Date(inquiry.checkOutDate).toLocaleDateString()}`,
      price: inquiry.budget.toLocaleString(),
      duration: `${Math.ceil((new Date(inquiry.checkOutDate) - new Date(inquiry.checkInDate)) / (1000 * 60 * 60 * 24))} nights`,
      description: inquiry.description,
      stats: {
        inquiries: inquiry.engagement?.inquiries?.toString() || '0',
        likes: inquiry.engagement?.likes?.toString() || '0',
        views: inquiry.engagement?.views?.toString() || '0',
        isLiked: Array.isArray(inquiry.likes) && inquiry.likes.includes(currentUser?._id),
        isBookmarked: Array.isArray(inquiry.bookmarks) && inquiry.bookmarks.includes(currentUser?._id)
      },
      userStatus: {
        isOnline: inquiry.user?.isOnline || false,
        lastSeen: inquiry.user?.lastSeen
      },
      postedTime: getTimeAgo(new Date(inquiry.createdAt))
    };
  };

  const fetchStats = async () => {
    try {
      const stats = await statsService.getOverallStats();
      setStats(stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    // Fetch inquiries with new filters
    fetchInquiries(true);
  };

  const clearFilters = () => {
    setFilters({
      county: '',
      ward: '',
      requesterType: '',
      houseType: '',
      unitSize: '',
      minBudget: '',
      maxBudget: '',
      checkInDate: '',
      checkOutDate: '',
    });
    fetchInquiries(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const filtersContent = document.querySelector('.mobile-filters-content');
      const filtersToggle = document.querySelector('.mobile-filters-toggle');
      
      if (isMobileFiltersOpen && filtersContent && filtersToggle) {
        if (!filtersContent.contains(event.target) && !filtersToggle.contains(event.target)) {
          setIsMobileFiltersOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileFiltersOpen]);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isSidebarOpen]);

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="business-connect">
      {showSuccessMessage && (
        <div className="success-message">
          Inquiry posted successfully
        </div>
      )}
      
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="main-layout">
        {/* Sidebar Overlay */}
        <div 
          className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
          onClick={handleCloseSidebar}
        />

        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-title">Business Connect</div>
          </div>
          <div className="sidebar-content">
            <div className="stats-section">
              <div 
                className={`stat-item ${activeView === 'enquirers' ? 'highlighted' : ''}`}
                onClick={() => {
                  setActiveView('enquirers');
                  handleCloseSidebar();
                }}
              >
                <div className="stat-content">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/b30d3607606836bd998be227d60f33c78ef5bd8e?placeholderIfAbsent=true"
                    className="stat-icon"
                    alt=""
                  />
                  <div className="stat-info">
                    <div className="stat-label">Enquirers</div>
                    <div className="stat-sublabel">{stats.totalInquiries} total inquiries</div>
                  </div>
                </div>
                <div className="stat-value">{stats.enquirers}</div>
              </div>
              <div 
                className={`stat-item ${activeView === 'chats' ? 'highlighted' : ''}`}
                onClick={() => {
                  setActiveView('chats');
                  handleCloseSidebar();
                }}
              >
                <div className="stat-content">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/bbbf52528f3155040a47c8851dbd1d2ab2ba520b?placeholderIfAbsent=true"
                    className="stat-icon"
                    alt=""
                  />
                  <div className="stat-label">Chats</div>
                </div>
                <div className="stat-value">{stats.chats}</div>
              </div>
              <div 
                className={`stat-item ${activeView === 'my-posts' ? 'highlighted' : ''}`}
                onClick={() => {
                  setActiveView('my-posts');
                  handleCloseSidebar();
                }}
              >
                <div className="stat-content">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/bbbf52528f3155040a47c8851dbd1d2ab2ba520b?placeholderIfAbsent=true"
                    className="stat-icon"
                    alt=""
                  />
                  <div className="stat-label">My post</div>
                </div>
                <div className="stat-value">{stats.posts}</div>
              </div>
              <div 
                className={`stat-item ${activeView === 'bookmarked' ? 'highlighted' : ''}`}
                onClick={() => {
                  setActiveView('bookmarked');
                  handleCloseSidebar();
                }}
              >
                <div className="stat-content">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/bbbf52528f3155040a47c8851dbd1d2ab2ba520b?placeholderIfAbsent=true"
                    className="stat-icon"
                    alt=""
                  />
                  <div className="stat-label">Book Marked</div>
                </div>
                <div className="stat-value">{stats.bookmarks}</div>
              </div>
            </div>
            <div className="sidebar-actions">
              <div 
                className="post-inquiry-button" 
                onClick={() => {
                  handlePostInquiryClick();
                  handleCloseSidebar();
                }}
              >
                <div className="plus-icon">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/TEMP/33e392588c432c151aabb4b2686715e445d3016c?placeholderIfAbsent=true"
                    alt=""
                  />
                </div>
                <div className="post-inquiry-text">Post inquiry</div>
              </div>
              <div 
                className="settings-item" 
                onClick={() => {
                  setActiveView('settings');
                  handleCloseSidebar();
                }}
              >
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/TEMP/b0728b7babb5d3b4040f4d23333bc916b684b5d6?placeholderIfAbsent=true"
                  className="settings-icon"
                  alt=""
                />
                <div className="settings-text">Settings</div>
              </div>
              <div 
                className="logout-item" 
                onClick={() => {
                  handleLogout();
                  handleCloseSidebar();
                }}
              >
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
