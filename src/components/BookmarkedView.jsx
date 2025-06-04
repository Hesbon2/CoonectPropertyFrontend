import React, { useState, useRef, useEffect, useCallback } from 'react';
import inquiryService from '../services/inquiry.service';
import authService from '../services/auth.service';
import socketService from '../services/socket.service';
import '../styles/BookmarkedView.css';
import { getInitialsAvatar } from '../utils/avatarUtils';

const ITEMS_PER_PAGE = 10;

const BookmarkedView = ({ onSettingsClick, setActiveView }) => {
  const [locationFilter, setLocationFilter] = useState('');
  const [durationFilter, setDurationFilter] = useState('All Duration');
  const [budgetFilter, setBudgetFilter] = useState('All Duration');
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const observerRef = useRef();
  const loadingRef = useRef();

  const lastBookmarkRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    fetchBookmarks(true);

    // Setup socket listeners for real-time updates
    const socket = socketService.connect();

    socket.on('inquiry_updated', handleInquiryUpdated);
    socket.on('inquiry_deleted', handleInquiryDeleted);
    socket.on('engagement_updated', handleEngagementUpdated);
    socket.on('bookmark_updated', handleBookmarkUpdated);
    socket.on('like_updated', handleLikeUpdated);
    socket.on('user_status_changed', handleUserStatusChanged);

    return () => {
      socket.off('inquiry_updated', handleInquiryUpdated);
      socket.off('inquiry_deleted', handleInquiryDeleted);
      socket.off('engagement_updated', handleEngagementUpdated);
      socket.off('bookmark_updated', handleBookmarkUpdated);
      socket.off('like_updated', handleLikeUpdated);
      socket.off('user_status_changed', handleUserStatusChanged);
    };
  }, []);

  const fetchBookmarks = async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) {
        setLoading(true);
        setPage(1);
      }
      
      const data = await inquiryService.getBookmarkedInquiries(page, ITEMS_PER_PAGE);
      const currentUser = authService.getCurrentUser();
      
      // Transform the data to match our display format
      const formattedBookmarks = data.map(inquiry => {
        const firstName = inquiry.user?.firstName || '';
        const lastName = inquiry.user?.lastName || '';
        
        return {
          id: inquiry._id,
          avatar: getInitialsAvatar(firstName, lastName),
          userName: firstName && lastName ? 
            `${firstName} ${lastName}` : 'Anonymous User',
          userType: inquiry.user?.userType || "Customer",
          propertyTitle: `${inquiry.houseType || ''} ${inquiry.unitSize || ''}`.trim() || 'Property',
          location: inquiry.location || 'Location not specified',
          date: inquiry.checkInDate && inquiry.checkOutDate ? 
            `${new Date(inquiry.checkInDate).toLocaleDateString()} - ${new Date(inquiry.checkOutDate).toLocaleDateString()}` : '',
          price: inquiry.budget?.toLocaleString() || '0',
          duration: inquiry.checkInDate && inquiry.checkOutDate ? 
            `${Math.ceil((new Date(inquiry.checkOutDate) - new Date(inquiry.checkInDate)) / (1000 * 60 * 60 * 24))} nights` : '',
          description: inquiry.description || '',
      stats: {
            inquiries: inquiry.engagement?.inquiries?.toString() || '0',
            likes: inquiry.engagement?.likes?.toString() || '0',
            views: inquiry.engagement?.views?.toString() || '0',
            isLiked: Array.isArray(inquiry.likes) && inquiry.likes.includes(currentUser?._id),
            isBookmarked: true
      },
          postedTime: getTimeAgo(new Date(inquiry.createdAt))
        };
      });

      setBookmarks(prev => isInitialFetch ? formattedBookmarks : [...prev, ...formattedBookmarks]);
      setHasMore(formattedBookmarks.length === ITEMS_PER_PAGE);
      setError(null);
      setInitialLoad(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      setError('Failed to load bookmarks. Please try again.');
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Real-time update handlers
  const handleInquiryUpdated = (updatedInquiry) => {
    setBookmarks(prev => prev.map(bookmark => 
      bookmark.id === updatedInquiry._id ? formatBookmark(updatedInquiry) : bookmark
    ));
  };

  const handleInquiryDeleted = (inquiryId) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== inquiryId));
  };

  const handleEngagementUpdated = ({ inquiryId, engagement }) => {
    setBookmarks(prev => prev.map(bookmark => {
      if (bookmark.id === inquiryId) {
        return {
          ...bookmark,
          stats: {
            ...bookmark.stats,
            inquiries: engagement.inquiries.toString(),
            views: engagement.views.toString(),
            likes: engagement.likes.toString()
          }
        };
      }
      return bookmark;
    }));
  };

  const handleBookmarkUpdated = ({ inquiryId, isBookmarked }) => {
    if (!isBookmarked) {
      // Remove from bookmarks if unbookmarked
      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== inquiryId));
    }
  };

  const handleLikeUpdated = ({ inquiryId, isLiked, likesCount }) => {
    setBookmarks(prev => prev.map(bookmark => {
      if (bookmark.id === inquiryId) {
        return {
          ...bookmark,
          stats: {
            ...bookmark.stats,
            isLiked,
            likes: likesCount.toString()
          }
        };
      }
      return bookmark;
    }));
  };

  const handleUserStatusChanged = ({ userId, isOnline, lastSeen }) => {
    setBookmarks(prev => prev.map(bookmark => {
      if (bookmark.userId === userId) {
        return {
          ...bookmark,
          userStatus: {
            isOnline,
            lastSeen
          }
        };
      }
      return bookmark;
    }));
  };

  // Helper function to format bookmark data
  const formatBookmark = (inquiry) => {
    const firstName = inquiry.user?.firstName || '';
    const lastName = inquiry.user?.lastName || '';
    const currentUser = authService.getCurrentUser();

    return {
      id: inquiry._id,
      userId: inquiry.user?._id,
      avatar: getInitialsAvatar(firstName, lastName),
      userName: firstName && lastName ? 
        `${firstName} ${lastName}` : 'Anonymous User',
      userType: inquiry.user?.userType || "Customer",
      propertyTitle: `${inquiry.houseType || ''} ${inquiry.unitSize || ''}`.trim() || 'Property',
      location: inquiry.location || 'Location not specified',
      date: inquiry.checkInDate && inquiry.checkOutDate ? 
        `${new Date(inquiry.checkInDate).toLocaleDateString()} - ${new Date(inquiry.checkOutDate).toLocaleDateString()}` : '',
      price: inquiry.budget?.toLocaleString() || '0',
      duration: inquiry.checkInDate && inquiry.checkOutDate ? 
        `${Math.ceil((new Date(inquiry.checkOutDate) - new Date(inquiry.checkInDate)) / (1000 * 60 * 60 * 24))} nights` : '',
      description: inquiry.description || '',
      stats: {
        inquiries: inquiry.engagement?.inquiries?.toString() || '0',
        likes: inquiry.engagement?.likes?.toString() || '0',
        views: inquiry.engagement?.views?.toString() || '0',
        isLiked: Array.isArray(inquiry.likes) && inquiry.likes.includes(currentUser?._id),
        isBookmarked: true
      },
      userStatus: {
        isOnline: inquiry.user?.isOnline || false,
        lastSeen: inquiry.user?.lastSeen
      },
      postedTime: getTimeAgo(new Date(inquiry.createdAt))
    };
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

  const handleUnbookmark = async (bookmarkId) => {
    try {
      // Optimistic update - remove from UI immediately
      setBookmarks(prevBookmarks => prevBookmarks.filter(bookmark => bookmark.id !== bookmarkId));
      
      // Make API call
      await inquiryService.toggleBookmark(bookmarkId);
    } catch (err) {
      // Revert the optimistic update on error
      console.error('Error removing bookmark:', err);
      fetchBookmarks(true); // Refresh the list to ensure consistency
      setError('Failed to remove bookmark. Please try again.');
    }
  };

  const BookmarkCard = ({ bookmark }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showShowMore, setShowShowMore] = useState(false);
    const descriptionRef = useRef(null);

    useEffect(() => {
      if (descriptionRef.current) {
        const element = descriptionRef.current;
        setShowShowMore(element.scrollHeight > element.clientHeight);
      }
    }, [bookmark.description]);

    return (
      <div className="bookmark-card">
        <div className="bookmark-header">
          <div className="user-info">
            <img 
              src={bookmark.avatar} 
              alt={bookmark.userName} 
              className="user-avatar"
            />
            <div className="user-details">
              <div className="user-name-type">
                <h3>{bookmark.userName}</h3>
                <span className="user-type">{bookmark.userType}</span>
              </div>
              <span className="post-time">{bookmark.postedTime}</span>
            </div>
          </div>
          <button 
            className="more-options"
            onClick={onSettingsClick}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        </div>

        <div className="property-info">
          <div className="property-main">
            <h2 className="property-title">{bookmark.propertyTitle}</h2>
            <span className="duration-badge">{bookmark.duration}</span>
          </div>
          <div className="property-location">{bookmark.location}</div>
          <div className="property-dates">
            <span>{bookmark.date}</span>
            <span className="property-price">Ksh {bookmark.price}/night</span>
          </div>
        </div>

        <p className={`property-description ${!isExpanded ? 'collapsed' : ''}`} ref={descriptionRef}>
          {bookmark.description}
          {showShowMore && !isExpanded && (
            <button className="show-more" onClick={() => setIsExpanded(true)}>
              Show more
            </button>
          )}
          {isExpanded && (
            <button className="show-more" onClick={() => setIsExpanded(false)}>
              Show less
            </button>
          )}
        </p>

        <div className="engagement-stats">
          <div className="stat-item">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM17 11h-4v4h-2v-4H7V9h4V5h2v4h4v2z"/>
            </svg>
            <span>{bookmark.stats.inquiries}</span>
          </div>
          <div className="stat-item">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>{bookmark.stats.likes}</span>
          </div>
          <div className="stat-item">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            <span>{bookmark.stats.views}</span>
          </div>
          <button 
            className="bookmark-button active"
            onClick={() => handleUnbookmark(bookmark.id)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const SkeletonCard = () => (
    <div className="bookmark-card skeleton">
      <div className="bookmark-header">
        <div className="user-info">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-text-container">
            <div className="skeleton-text"></div>
            <div className="skeleton-text"></div>
          </div>
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
  );

  if (error && !bookmarks.length) {
    return (
      <div className="bookmarked-container">
        <div className="error-message">
          {error}
          <button onClick={() => fetchBookmarks(true)} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmarked-container">
      <div className="bookmarked-header">
        <h1 className="bookmarked-title">Bookmarked</h1>
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
        <div className="filters-row">
          <button className="filter-button">
            <span>Location</span>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>

          <button className="filter-button">
            <span>Dates</span>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>

          <button className="filter-button">
            <span>Room Type</span>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>

          <button className="filter-toggle">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="bookmarked-list">
        {initialLoad && loading ? (
          // Show skeletons only during initial load
          Array(4).fill(0).map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`} />
          ))
        ) : bookmarks.length === 0 && !loading ? (
          // Show no bookmarks message when there are no bookmarks and not loading
          <div className="no-bookmarks-message">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style={{ opacity: 0.5 }}>
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
            </svg>
            <p>No bookmarked inquiries yet</p>
            <button 
              className="browse-button" 
              onClick={() => setActiveView('enquirers')}
              style={{
                padding: '8px 16px',
                background: '#0066CC',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              Browse Inquiries
            </button>
          </div>
        ) : (
          <>
            {bookmarks.map((bookmark, index) => (
              <div
                key={bookmark.id}
                ref={index === bookmarks.length - 1 ? lastBookmarkRef : null}
              >
                <BookmarkCard bookmark={bookmark} />
              </div>
        ))}
            {loading && !initialLoad && (
              <div ref={loadingRef} className="loading-more">
                <SkeletonCard />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BookmarkedView; 