import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/HomePage.css';
import ChatsView from "./ChatsView";
import SettingsView from './SettingsView';
import MyPostsView from './MyPostsView';
import LocationSelector from './LocationSelector';
import inquiryService from '../services/inquiry.service';
import chatService from '../services/chat.service';
import authService from '../services/auth.service';
import socketService from '../services/socket.service';
import { getInitialsAvatar } from '../utils/avatarUtils';
import { getAllCounties, getWardsByCounty, getCountyById, getWardById } from '../utils/locations';
import statsService from '../services/stats.service';
import { getCounties } from '../utils/locations';
import FilterModal from './FilterModal';

const ITEMS_PER_PAGE = 12;

const HOUSE_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'maisonette', label: 'Maisonette' },
  { value: 'penthouse', label: 'Penthouse' }
];

const ROOM_TYPES = [
  { value: 'studio', label: 'Studio' },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: `${i + 1}br`,
    label: `${i + 1} BR`
  }))
];

const REQUESTER_TYPES = [
  { value: 'Customer', label: 'Customer' },
  { value: 'Host', label: 'Host' },
  { value: 'Agent', label: 'Agent' }
];

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
    houseType: '',
    unitSize: '',
    budget: '',
    checkInDate: '',
    checkOutDate: '',
    county: '',
    ward: '',
    specialRequirements: '',
    description: '',
    requesterType: '' // Initialize requester type
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
    posts: 0
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
  const [activeTab, setActiveTab] = useState('all');
  const [inquiryDescription, setInquiryDescription] = useState('');
  const [isLoadingInquiry, setIsLoadingInquiry] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const contactModalRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [areas, setAreas] = useState([]);
  const locationFilterRef = useRef(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get current user data on component mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser?.userType) {
      setFormData(prev => ({
        ...prev,
        requesterType: currentUser.userType
      }));
    } else {
      // If no user data in localStorage, fetch from API
      const fetchUserData = async () => {
        try {
          const userData = await authService.getProfile();
          if (userData?.userType) {
            setFormData(prev => ({
              ...prev,
              requesterType: userData.userType
            }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setError('Failed to load user data');
        }
      };
      fetchUserData();
    }
  }, []);

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
    socket.on('like_updated', handleLikeUpdated);
    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('stats_updated', handleStatsUpdated);

    return () => {
      socket.off('inquiry_created', handleInquiryCreated);
      socket.off('inquiry_updated', handleInquiryUpdated);
      socket.off('inquiry_deleted', handleInquiryDeleted);
      socket.off('engagement_updated', handleEngagementUpdated);
      socket.off('like_updated', handleLikeUpdated);
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.off('stats_updated', handleStatsUpdated);
    };
  }, []);

  useEffect(() => {
    fetchInquiries(true);
  }, [activeTab]); // Refetch when activeTab changes

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contactModalRef.current && !contactModalRef.current.contains(event.target)) {
        setShowContactModal(false);
      }
    };

    if (showContactModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContactModal]);

  useEffect(() => {
    if (selectedCounty) {
      const countyAreas = getWardsByCounty(selectedCounty);
      setAreas(countyAreas || []);
    } else {
      setAreas([]);
    }
    setSelectedArea('');
  }, [selectedCounty]);

  const fetchInquiries = async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) {
        setLoading(true);
        setPage(1);
      }
      
      // Prepare query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('limit', ITEMS_PER_PAGE);

      // Add view-specific filters
      switch (activeTab) {
        case 'unread':
          queryParams.append('unread', 'true');
          break;
        case 'favorites':
          queryParams.append('favorites', 'true');
          break;
        // 'all' case doesn't need additional parameters
      }

      // Add any existing filters
      if (filters.county) queryParams.append('county', filters.county);
      if (filters.ward) queryParams.append('ward', filters.ward);
      if (filters.requesterType) queryParams.append('requesterType', filters.requesterType);
      if (filters.houseType) queryParams.append('houseType', filters.houseType);
      if (filters.unitSize) queryParams.append('unitSize', filters.unitSize);
      if (filters.minBudget) queryParams.append('minBudget', filters.minBudget);
      if (filters.maxBudget) queryParams.append('maxBudget', filters.maxBudget);
      if (filters.checkInDate) queryParams.append('checkInDate', filters.checkInDate);
      if (filters.checkOutDate) queryParams.append('checkOutDate', filters.checkOutDate);
      if (searchQuery) queryParams.append('searchQuery', searchQuery);
      
      const response = await inquiryService.getInquiries(queryParams);
      const currentUser = authService.getCurrentUser();
      
      // Transform the response data
      const formattedInquiries = response.inquiries.map(inquiry => {
        if (!inquiry._id && !inquiry.id) {
          console.error('Inquiry missing ID:', inquiry);
          return null;
        }

        const firstName = inquiry.user?.firstName || '';
        const lastName = inquiry.user?.lastName || '';

        let locationText;
        if (inquiry.ward && inquiry.county) {
          locationText = `${inquiry.ward}, ${inquiry.county}`;
        } else if (inquiry.location) {
          const [ward, county] = inquiry.location.split(', ');
          locationText = `${ward}, ${county}`;
        } else {
          locationText = 'Location not specified';
        }

        // Check if the inquiry is unread by checking if the current user's ID is in the views array
        const isUnread = !inquiry.views || !Array.isArray(inquiry.views) || !inquiry.views.includes(currentUser?._id);

        return {
          id: inquiry._id || inquiry.id,
          userId: inquiry.user?._id,
          userAvatar: getInitialsAvatar(firstName, lastName),
          userName: `${firstName} ${lastName}`.trim() || 'Anonymous User',
          userType: inquiry.user?.userType || 'Unknown',
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
            isUnread
          },
          userStatus: {
            isOnline: inquiry.user?.isOnline || false,
            lastSeen: inquiry.user?.lastSeen
          },
          postedTime: getTimeAgo(new Date(inquiry.createdAt)),
          createdAt: new Date(inquiry.createdAt) // Add this field for sorting
        };
      }).filter(Boolean);

      // Sort inquiries by date (newest first)
      const sortedInquiries = formattedInquiries.sort((a, b) => b.createdAt - a.createdAt);

      setInquiries(prev => isInitialFetch ? sortedInquiries : [...prev, ...sortedInquiries]);
      
      // Update hasMore based on the total number of results and current page
      const totalPages = Math.ceil(response.pagination.total / ITEMS_PER_PAGE);
      setHasMore(page < totalPages);
      
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
      houseType: '',
      unitSize: '',
      budget: '',
      checkInDate: '',
      checkOutDate: '',
      county: '',
      ward: '',
      specialRequirements: '',
      description: '',
      requesterType: '' // Initialize requester type
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

  const handleListingClick = async (inquiry) => {
    console.log('Clicked inquiry:', inquiry);

    try {
      // Fetch the full inquiry data with populated user information
      const fullInquiry = await inquiryService.getInquiry(inquiry.id);
      console.log('Full inquiry:', fullInquiry);

      // Mark the inquiry as read
      const readResponse = await inquiryService.markAsRead(inquiry.id);
      console.log('Mark as read response:', readResponse);
      
      // Update local state to reflect the read status
      setInquiries(prev => prev.map(item => {
        if (item.id === inquiry.id) {
          return {
            ...item,
            stats: {
              ...item.stats,
              isUnread: false
            },
            views: readResponse.views // Store the updated views array
          };
        }
        return item;
      }));

      // Update unread count
      const newUnreadCount = inquiries.filter(item => 
        item.id !== inquiry.id && item.stats.isUnread
      ).length;
      setUnreadCount(newUnreadCount);

    // Create a chat-friendly listing object
    const chatListing = {
      _id: inquiry.id, // Changed from id to _id to match what handleLikeClick expects
        inquiryId: inquiry.id,
      userId: inquiry.userId,
      userAvatar: inquiry.userAvatar,
      userName: inquiry.userName,
        userType: inquiry.user?.userType || 'Customer',
      propertyTitle: inquiry.propertyTitle,
      location: inquiry.location,
      date: inquiry.date,
      price: inquiry.price,
      duration: inquiry.duration,
        description: inquiry.description,
        user: {
          phoneNumber: fullInquiry.user?.phoneNumber,
          whatsappNumber: fullInquiry.user?.whatsappNumber
      },
      isLiked: inquiry.stats?.isLiked || false,
      stats: {
        likes: inquiry.stats?.likes || '0',
        views: inquiry.stats?.views || '0',
        inquiries: inquiry.stats?.inquiries || '0',
        isLiked: inquiry.stats?.isLiked || false
      }
    };
      
      console.log('Chat listing:', chatListing);
    
    setSelectedListing(chatListing);
    setIsChatOpen(true);
      
      // Fetch inquiry description
      setInquiryDescription(fullInquiry.description);
      
    if (window.innerWidth <= 991) {
      document.body.style.overflow = 'hidden';
      }
    } catch (error) {
      console.error('Error fetching full inquiry:', error);
    }
  };

  // Add effect to update unread count when inquiries change
  useEffect(() => {
    const count = inquiries.filter(inquiry => inquiry.stats.isUnread).length;
    setUnreadCount(count);
  }, [inquiries]);

  // Add effect to update unread count when activeTab changes
  useEffect(() => {
    if (activeTab === 'unread') {
      const count = inquiries.filter(inquiry => inquiry.stats.isUnread).length;
      setUnreadCount(count);
    }
  }, [activeTab, inquiries]);

  const fetchInquiryDescription = async (inquiryId) => {
    setIsLoadingInquiry(true);
    try {
      const response = await inquiryService.getInquiry(inquiryId);
      if (response && response.description) {
        setInquiryDescription(response.description);
      } else {
        setInquiryDescription('No inquiry details available.');
      }
    } catch (error) {
      console.error('Error fetching inquiry details:', error);
      setInquiryDescription('Failed to load inquiry details. Please try again later.');
    } finally {
      setIsLoadingInquiry(false);
    }
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedListing(null);
    setInquiryDescription('');
    document.body.style.overflow = 'auto';
  };

  const handleLikeClick = async (inquiryId) => {
    if (isSubmittingAction) return;
    
    try {
      setIsSubmittingAction(true);
      
      // Optimistic update for inquiries list
      setInquiries(prev => prev.map(inquiry => {
        if (inquiry.id === inquiryId) {
          const newLikesCount = inquiry.stats.isLiked ? 
            parseInt(inquiry.stats.likes) - 1 : 
            parseInt(inquiry.stats.likes) + 1;
          
          return {
            ...inquiry,
            stats: {
              ...inquiry.stats,
              isLiked: !inquiry.stats.isLiked,
              likes: newLikesCount.toString()
            }
          };
        }
        return inquiry;
      }));

      // Optimistic update for selected listing in chat window
      if (selectedListing && selectedListing._id === inquiryId) {
        setSelectedListing(prev => {
          // Initialize stats if they don't exist
          const currentStats = prev.stats || {
            likes: '0',
            views: '0',
            inquiries: '0',
            isLiked: false
          };
          
          const newLikesCount = currentStats.isLiked ? 
            parseInt(currentStats.likes || '0') - 1 : 
            parseInt(currentStats.likes || '0') + 1;

          return {
            ...prev,
            isLiked: !currentStats.isLiked,
            stats: {
              ...currentStats,
              isLiked: !currentStats.isLiked,
              likes: newLikesCount.toString()
            }
          };
        });
      }

      await inquiryService.toggleLike(inquiryId);
      
      // Refetch inquiries if we're in the favorites tab
      if (activeTab === 'favorites') {
        fetchInquiries(true);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update on error
      fetchInquiries(true);
      if (selectedListing && selectedListing._id === inquiryId) {
        try {
          const updatedInquiry = await inquiryService.getInquiry(inquiryId);
          if (updatedInquiry) {
            setSelectedListing(prev => ({
              ...prev,
              isLiked: updatedInquiry.stats?.isLiked || false,
              stats: updatedInquiry.stats || {
                likes: '0',
                views: '0',
                inquiries: '0',
                isLiked: false
              }
            }));
          }
        } catch (error) {
          console.error('Error fetching updated inquiry:', error);
        }
      }
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
        handleListingClick(chatData);
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

    const currentUser = authService.getCurrentUser();
    const requesterTypeLabel = REQUESTER_TYPES.find(
      type => type.value === (currentUser?.userType || formData.requesterType)
    )?.label || 'Unknown Type';

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
              <label className="form-label">Requester Type</label>
              <select 
                className="form-select"
                name="requesterType"
                value={formData.requesterType}
                disabled
              >
                <option value={formData.requesterType}>{requesterTypeLabel}</option>
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
                {HOUSE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Room Type</label>
              <select 
                className="form-select"
                name="unitSize"
                value={formData.unitSize}
                onChange={handleInputChange}
                required
              >
                <option value="">Select</option>
                {ROOM_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Budget (KSh)</label>
              <div className="currency-input">
                <span className="currency-label">KSh</span>
                <input 
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">County</label>
              <select
                name="county"
                value={formData.county}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">Select County</option>
                {getAllCounties().map(county => (
                  <option key={county.id} value={county.id}>
                    {county.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Area</label>
              <select
                name="ward"
                value={formData.ward}
                onChange={handleInputChange}
                className="form-select"
                required
                disabled={!formData.county}
              >
                <option value="">Select Area</option>
                {formData.county && getWardsByCounty(formData.county).map(ward => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Check-in Date</label>
              <input 
                type="date" 
                name="checkInDate"
                value={formData.checkInDate}
                onChange={handleInputChange}
                className="form-input"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Check-out Date</label>
              <input 
                type="date" 
                name="checkOutDate"
                value={formData.checkOutDate}
                onChange={handleInputChange}
                className="form-input"
                min={formData.checkInDate || new Date().toISOString().split('T')[0]}
                required
                disabled={!formData.checkInDate}
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

  const handleChatClick = async (listing) => {
    setSelectedListing(listing);
    setIsLoadingInquiry(true);
    
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/inquiries/${listing.inquiryId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inquiry details');
      }
      const data = await response.json();
      setInquiryDescription(data.description);
    } catch (error) {
      console.error('Error fetching inquiry details:', error);
      setInquiryDescription('Failed to load inquiry details. Please try again later.');
    } finally {
      setIsLoadingInquiry(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).toUpperCase();
  };

  const formatMessageDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      content: messageInput,
      timestamp: new Date(),
      sender: 'sent',
      isRead: false
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');

    // Simulate message being read after 2 seconds
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, isRead: true } : msg
        )
      );
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessages = () => {
    let lastDate = null;

    return (
      <>
        {messages.map((message) => {
          const messageDate = formatMessageDate(message.timestamp);
          const showDate = lastDate !== messageDate;
          if (showDate) {
            lastDate = messageDate;
          }

          return (
            <React.Fragment key={message.id}>
              {showDate && (
                <div className="message-date">
                  {messageDate}
      </div>
              )}
              <div className={`message ${message.sender}`}>
                <div className="message-content">{message.content}</div>
                <div className="message-footer">
                  <span className="message-time">{formatDate(message.timestamp)}</span>
                  {message.sender === 'sent' && (
                    <span className="read-receipt">
                      {message.isRead ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M18 7L9.5 15.5L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M18 12L9.5 20.5L6 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M18 7L9.5 15.5L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  )}
    </div>
              </div>
            </React.Fragment>
  );
        })}
        <div ref={messagesEndRef} />
      </>
    );
  };

  const renderChatWindow = () => {
    if (!selectedListing) return null;

    return (
      <div className="chat-window">
        <div className="chat-header">
          <div className="chat-header-content">
            <div className="chat-avatar-column">
              <img
                src={selectedListing.userAvatar}
                alt=""
                className="chat-avatar"
              />
            </div>
            
            <div className="chat-info-column">
              <div className="chat-header-top">
                <div className="chat-user-meta">
                  <span className="chat-user-name">{selectedListing.userName}</span>
                  {selectedListing.userType && (
                  <span className="user-type">{selectedListing.userType}</span>
                  )}
                  <span className="post-time">• 5h</span>
                </div>
                
                <div className="chat-header-actions">
                  <button className="chat-action-button" title="Call" onClick={handleContactClick}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                    </svg>
                  </button>
                  <button 
                    className={`chat-action-button ${selectedListing.isLiked ? 'active' : ''}`} 
                    title={selectedListing.isLiked ? "Remove from favorites" : "Add to favorites"}
                    onClick={() => handleLikeClick(selectedListing._id)}
                  >
                    <svg viewBox="0 0 24 24" fill={selectedListing.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                  <button className="chat-action-button" title="More options">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  <button onClick={handleCloseChat} className="close-chat-button" title="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="chat-listing-details">
                <div className="listing-title-row">
                  <div className="listing-title">{selectedListing.propertyTitle}</div>
                  <div className="duration-badge">{selectedListing.duration}</div>
                </div>
                <div className="listing-location">{selectedListing.location}</div>
                <div className="listing-date-price">
                  <div className="listing-date">{selectedListing.date}</div>
                  <div className="listing-price">
                    <span className="price-amount">Ksh {selectedListing.price}</span>
                    <span className="price-period">/night</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="inquiry-description">
          <div className="inquiry-description-content">
            <p className={`inquiry-text ${!expandedDescription ? 'collapsed' : ''}`}>
              {isLoadingInquiry ? 'Loading inquiry details...' : 
               inquiryDescription || 'No inquiry details available.'}
            </p>
            {inquiryDescription && inquiryDescription.length > 100 && (
              <button 
                className="show-more-button" 
                onClick={() => setExpandedDescription(!expandedDescription)}
              >
                {expandedDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>

        <div className="chat-messages">
          {renderMessages()}
        </div>
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <div className="chat-input-actions">
              <button className="chat-action-icon" title="Add emoji">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              placeholder="Type your message..."
              className="chat-input"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <div className="chat-input-actions">
              <button className="chat-action-icon" title="Attach file">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button 
                className="send-message-button" 
                title="Send message"
                onClick={handleSendMessage}
              >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListingsHeader = () => {
    return (
      <>
        <div className="listings-header">
          <h1 className="header-title">Enquirers</h1>
          <div className="header-actions">
            <button className="action-button" title="Add new" onClick={handlePostInquiryClick}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </button>
            <button 
              className="action-button"
              onClick={handleOpenFilterModal}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M3 6h18M6 12h12M9 18h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="action-button" title="Location" onClick={handleLocationClick}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="filter-tabs">
          <div className="filter-tabs-left">
          <button 
            className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            Unread
              {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </button>
          <button 
            className={`filter-tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites
          </button>
        </div>
          <div className="search-container">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search a listing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </>
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
            <div className="listings-container">
              {renderListingsHeader()}
              {renderFilters()}
              <div className="listings-section">
                {renderListings()}
              </div>
            </div>
            <div className={`chat-container ${isChatOpen ? 'active' : ''}`}>
              {renderChatWindow()}
            </div>
            {LocationFilterModal()}
          </>
        );
      case 'chats':
        return <ChatsView onChatSelect={handleListingClick} />;
      case 'my-posts':
        return <MyPostsView />;
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
      userType: inquiry.user?.userType || 'Unknown',  // Use the actual user type from the database
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
        isLiked: Array.isArray(inquiry.likes) && inquiry.likes.includes(currentUser?._id)
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
  };

  const handleApplyFilters = (newFilters) => {
    // Reset page and fetch inquiries with new filters immediately
    setPage(1);
    setInitialLoad(true);
    setLoading(true);
    
    // Build query parameters using new filters directly
    const queryParams = new URLSearchParams();
    queryParams.append('page', '1');
    queryParams.append('limit', ITEMS_PER_PAGE);

    // Add filters to query params
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        // Handle county and ward (could be either IDs or names)
        if (key === 'county') {
          // If it's an ID, convert to name
          const countyName = getCountyById(value)?.name || value;
          queryParams.append('county', countyName);
        }
        else if (key === 'ward') {
          // If it's an ID, convert to name
          const wardName = getWardById(value)?.name || value;
          queryParams.append('ward', wardName);
        }
        // Handle budget range
        else if (key === 'budget') {
          const [min, max] = value.split('-');
          if (min) queryParams.append('minBudget', min);
          if (max) queryParams.append('maxBudget', max);
        }
        // Handle date ranges
        else if (key === 'checkInDate' || key === 'checkOutDate') {
          queryParams.append(key, value);
        }
        // Handle search query
        else if (key === 'searchQuery' && value.trim()) {
          queryParams.append('searchQuery', value.trim());
        }
        // Handle all other filters
        else {
          queryParams.append(key, value);
        }
      }
    });

    // Add search query if exists
    if (searchQuery.trim()) {
      queryParams.append('searchQuery', searchQuery.trim());
    }
    
    console.log('Applying new filters:', Object.fromEntries(queryParams.entries()));
    
    // Update filters state immediately with the new filters
    setFilters(newFilters);
    
    // Fetch data with new filters
    inquiryService.getInquiries(queryParams)
      .then(response => {
        const currentUser = authService.getCurrentUser();
        
        // Transform the response data
        const formattedInquiries = response.inquiries.map(inquiry => {
          if (!inquiry._id && !inquiry.id) {
            console.error('Inquiry missing ID:', inquiry);
            return null;
          }

          const firstName = inquiry.user?.firstName || '';
          const lastName = inquiry.user?.lastName || '';

          let locationText;
          if (inquiry.ward && inquiry.county) {
            locationText = `${inquiry.ward}, ${inquiry.county}`;
          } else if (inquiry.location) {
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
            userType: inquiry.user?.userType || 'Unknown',
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
              isLiked: Array.isArray(inquiry.likes) && inquiry.likes.includes(currentUser?._id)
            },
            userStatus: {
              isOnline: inquiry.user?.isOnline || false,
              lastSeen: inquiry.user?.lastSeen
            },
            postedTime: getTimeAgo(new Date(inquiry.createdAt))
          };
        }).filter(Boolean);

        // Update state with new data
        setInquiries(formattedInquiries);
        
        // Update pagination
        const totalPages = Math.ceil(response.pagination.total / ITEMS_PER_PAGE);
        setHasMore(1 < totalPages);
        
        setError(null);
        setInitialLoad(false);
      })
      .catch(err => {
        console.error('Error applying filters:', err);
        setError('Failed to apply filters. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const clearFilters = () => {
    const emptyFilters = {
      county: '',
      ward: '',
      requesterType: '',
      houseType: '',
      unitSize: '',
      minBudget: '',
      maxBudget: '',
      checkInDate: '',
      checkOutDate: '',
    };
    
    // Apply empty filters immediately
    handleApplyFilters(emptyFilters);
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContactModal(true);
  };

  const handleCloseContactModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowContactModal(false);
  };

  const formatPhoneNumber = (number) => {
    if (!number) return '';
    // Remove any non-digit characters
    const cleaned = number.replace(/\D/g, '');
    
    // Assume Tanzania number format if no country code
    if (cleaned.length === 9) {
      return `+255 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    
    // If number includes country code
    if (cleaned.startsWith('255')) {
      return `+255 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }
    
    // For other international numbers, just add + prefix
    return `+${cleaned}`;
  };

  const renderContactModal = () => {
    if (!showContactModal || !selectedListing) return null;

    console.log('Selected listing:', selectedListing); // Add this line for debugging

    const whatsappNumber = selectedListing.user?.whatsappNumber || selectedListing.user?.phoneNumber;
    const formattedWhatsapp = formatPhoneNumber(whatsappNumber);
    const formattedPhone = formatPhoneNumber(selectedListing.user?.phoneNumber);

    return (
      <div className="contact-modal" ref={contactModalRef}>
        <div className="contact-modal-header">
          <h3 className="contact-modal-title">Contact details</h3>
          <button className="contact-modal-close" onClick={handleCloseContactModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="contact-details">
          <a 
            href={`https://wa.me/${whatsappNumber?.replace(/\D/g, '')}`} 
            className="contact-item" 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="contact-text-container">
              <span className="contact-label">WhatsApp</span>
              <span className="contact-number">{formattedWhatsapp || 'Not available'}</span>
            </div>
            <svg className="contact-icon whatsapp-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
          <a 
            href={`tel:${selectedListing.user?.phoneNumber?.replace(/\D/g, '')}`} 
            className="contact-item"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="contact-text-container">
              <span className="contact-label">Phone Number</span>
              <span className="contact-number">{formattedPhone || 'Not available'}</span>
            </div>
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
            </svg>
          </a>
        </div>
      </div>
    );
  };

  const handleLocationClick = () => {
    setShowLocationFilter(true);
  };

  const handleCloseLocationFilter = () => {
    setShowLocationFilter(false);
  };

  const handleApplyLocationFilter = () => {
    if (selectedCounty || selectedArea) {
      // Get county and ward names from their IDs
      const county = selectedCounty ? getCountyById(selectedCounty) : null;
      const ward = selectedArea ? getWardById(selectedArea) : null;

      // Create new filters object with updated location
      const newFilters = {
        ...filters,
        county: county ? county.name : '',
        ward: ward ? ward.name : ''
      };

      // Apply the new filters which will trigger a fetch
      handleApplyFilters(newFilters);
    }
    setShowLocationFilter(false);
  };

  const handleClearLocationFilter = () => {
    setSelectedCounty('');
    setSelectedArea('');
    handleFilterChange('county', '');
    handleFilterChange('ward', '');
  };

  const LocationFilterModal = () => {
    if (!showLocationFilter) return null;

    return (
      <div className="location-filter-modal" onClick={handleCloseLocationFilter}>
        <div 
          className={`location-filter-content ${showLocationFilter ? 'open' : ''}`}
          onClick={e => e.stopPropagation()}
          ref={locationFilterRef}
        >
          <div className="location-filter-header">
            <h2 className="location-filter-title">Filter by Location</h2>
            <button className="location-filter-close" onClick={handleCloseLocationFilter}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="location-filter-form">
            <LocationSelector
              selectedCounty={selectedCounty}
              selectedWard={selectedArea}
              onCountyChange={setSelectedCounty}
              onWardChange={setSelectedArea}
              className="location-filter-selector"
            />
          </div>
          <div className="location-filter-actions">
            <button 
              className="location-filter-button clear"
              onClick={handleClearLocationFilter}
            >
              Clear
            </button>
            <button 
              className="location-filter-button apply"
              onClick={handleApplyLocationFilter}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  const handleCloseFilterModal = () => {
    setIsFilterModalOpen(false);
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
            className={`listing-card ${inquiry.stats.isUnread ? 'unread' : ''}`}
            data-inquiry-id={inquiry.id}
            ref={index === inquiries.length - 1 ? lastInquiryCallback : null}
            onClick={() => handleListingClick(inquiry)}
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar-column">
              <img
                src={inquiry.userAvatar}
                className="avatar-image"
                alt=""
              />
            </div>
            <div className="content-column">
              <div className="property-details">
                <div className="property-title">
                  {inquiry.propertyTitle}
                </div>
                <div className="duration-badge">{inquiry.duration}</div>
              </div>
              <div className="location-info">
                <div className="location-text">{inquiry.location}</div>
                <div className="time-info">                  
                  <div className="time-text">{inquiry.postedTime}</div>
                </div>
              </div>
              <div className="date-price-section">
                <div className="date-info">{inquiry.date}</div>
                <div className="price-info">
                  <span className="price-amount">Ksh {inquiry.price}</span>
                  <span className="price-period">/night</span>
                </div>
              </div>
              <div className="engagement-stats-section" onClick={(e) => e.stopPropagation()}>
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
        <LocationSelector
          selectedCounty={filters.county}
          selectedWard={filters.ward}
          onCountyChange={(countyId) => handleFilterChange('county', countyId)}
          onWardChange={(wardId) => handleFilterChange('ward', wardId)}
        />

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
  );

  return (
    <div className="business-connect" data-active-view={activeView}>
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
                  <div className="stat-info">
                    <div className="stat-label">Enquirers</div>
                    <div className="stat-sublabel">{stats.totalInquiries} total inquiries</div>
                  </div>
                </div>
                <div className="stat-value">{stats.enquirers}</div>
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
                <div className="stat-value">{stats.chats}</div>
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
                <div className="stat-value">{stats.posts}</div>
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
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span className="nav-item-label">Enquirers</span>
        </div>
        <div 
          className={`nav-item ${activeView === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveView('chats')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          <span className="nav-item-label">Chats</span>
        </div>
        <div 
          className={`nav-item ${activeView === 'my-posts' ? 'active' : ''}`}
          onClick={() => setActiveView('my-posts')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
          </svg>
          <span className="nav-item-label">My Posts</span>
        </div>
        <div 
          className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveView('settings')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          <span className="nav-item-label">Settings</span>
        </div>
      </nav>

      {/* Floating Post Button - Only show in enquirers and my-posts views */}
      {(activeView === 'enquirers' || activeView === 'my-posts') && (
        <button className="floating-post-button" onClick={handlePostInquiryClick}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      )}

      {renderPostInquiryModal()}
      {renderContactModal()}

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilterModal}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
}

export default HomePage;
