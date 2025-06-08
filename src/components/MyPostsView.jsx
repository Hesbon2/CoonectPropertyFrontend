import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/MyPostsView.css';
import inquiryService from '../services/inquiry.service';
import authService from '../services/auth.service';
import socketService from '../services/socket.service';
import { getInitialsAvatar } from '../utils/avatarUtils';
import FiltersSection from './FiltersSection';

const ITEMS_PER_PAGE = 10;

const MyPostsView = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const lastPostRef = useRef();
  const loadingRef = useRef();

  // Filters
  const [locationFilter, setLocationFilter] = useState('Location');
  const [nightsFilter, setNightsFilter] = useState('All Duration');
  const [budgetFilter, setBudgetFilter] = useState('All Duration');

  const lastPostCallback = useCallback(node => {
    if (loading) return;
    if (lastPostRef.current) lastPostRef.current.disconnect();

    lastPostRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) lastPostRef.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    fetchUserInquiries(true);

    // Setup socket listeners for real-time updates
    const socket = socketService.connect();

    socket.on('inquiry_updated', handleInquiryUpdated);
    socket.on('inquiry_deleted', handleInquiryDeleted);

    return () => {
      socket.off('inquiry_updated', handleInquiryUpdated);
      socket.off('inquiry_deleted', handleInquiryDeleted);
    };
  }, []);

  useEffect(() => {
    if (!initialLoad) {
      fetchUserInquiries(false);
    }
  }, [page]);

  const fetchUserInquiries = async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) {
        setLoading(true);
        setPage(1);
      }

      const data = await inquiryService.getMyInquiries(page, ITEMS_PER_PAGE);
      
      const formattedPosts = data.map(inquiry => ({
          id: inquiry._id,
        title: `${inquiry.houseType} ${inquiry.unitSize}`,
        location: `${inquiry.ward}, ${inquiry.county}`,
        status: inquiry.status || 'Active',
        nights: Math.ceil((new Date(inquiry.checkOutDate) - new Date(inquiry.checkInDate)) / (1000 * 60 * 60 * 24)),
        dateRange: `${new Date(inquiry.checkInDate).toLocaleDateString()} - ${new Date(inquiry.checkOutDate).toLocaleDateString()}`,
        price: inquiry.budget,
        description: inquiry.description,
        views: inquiry.engagement?.views || 0,
        postedTime: `${Math.ceil((new Date() - new Date(inquiry.createdAt)) / (1000 * 60 * 60 * 24))}d`
      }));

      setPosts(prev => isInitialFetch ? formattedPosts : [...prev, ...formattedPosts]);
      setHasMore(formattedPosts.length === ITEMS_PER_PAGE);
      setError(null);
      setInitialLoad(false);
    } catch (err) {
      setError('Failed to fetch inquiries. Please try again later.');
      console.error('Error fetching inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInquiryUpdated = (updatedInquiry) => {
      setPosts(prev => prev.map(post => 
        post.id === updatedInquiry._id ? formatPost(updatedInquiry) : post
      ));
  };

  const handleInquiryDeleted = (inquiryId) => {
    setPosts(prev => prev.filter(post => post.id !== inquiryId));
  };

  const handleEdit = (postId) => {
    // Implement edit functionality
    console.log('Edit post:', postId);
  };

  const handleDelete = async (postId) => {
    try {
      await inquiryService.deleteInquiry(postId);
      setPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const formatPost = (inquiry) => ({
    id: inquiry._id,
    title: `${inquiry.houseType} ${inquiry.unitSize}`,
    location: `${inquiry.ward}, ${inquiry.county}`,
    status: inquiry.status || 'Active',
    nights: Math.ceil((new Date(inquiry.checkOutDate) - new Date(inquiry.checkInDate)) / (1000 * 60 * 60 * 24)),
    dateRange: `${new Date(inquiry.checkInDate).toLocaleDateString()} - ${new Date(inquiry.checkOutDate).toLocaleDateString()}`,
    price: inquiry.budget,
    description: inquiry.description,
    views: inquiry.engagement?.views || 0,
    postedTime: `${Math.ceil((new Date() - new Date(inquiry.createdAt)) / (1000 * 60 * 60 * 24))}d`
  });

  const handlePostNew = () => {
    // Implement post new functionality
    console.log('Post new clicked');
  };

  return (
    <div className="my-posts-container">
      {/* Header Section */}
      <div className="my-posts-header">
        <h1 className="header-title">My Posts</h1>
        <button className="post-new-button" onClick={handlePostNew}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          Post New
          </button>
      </div>

      {/* Filters Section */}
      <FiltersSection
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        nightsFilter={nightsFilter}
        setNightsFilter={setNightsFilter}
        budgetFilter={budgetFilter}
        setBudgetFilter={setBudgetFilter}
      />

      {/* Posts Grid */}
      <div className="posts-grid">
        {posts.map((post, index) => (
          <div 
            key={post.id} 
            className="post-card"
            ref={index === posts.length - 1 ? lastPostCallback : null}
          >
            <div className="post-header">
              <div className="post-title">{post.title}</div>
              <div className="post-status">{post.status}</div>
            </div>

            <div className="post-location-time">
              <div className="post-info">
                <div className="post-location">{post.location}</div>
                <div className="posted-time">{post.postedTime}</div>
              </div>
              <div className="nights-badge">{post.nights} nights</div>
            </div>

            <div className="post-details">
              <div className="date-range">{post.dateRange}</div>
              <div className="price">
                <span className="amount">Ksh {post.price.toLocaleString()}</span>
                <span className="period">/night</span>
              </div>
            </div>

            <div className="post-description">{post.description}</div>

            <div className="post-footer">
              <div className="post-stats">
                <span className="views-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5C5.636 5 2 12 2 12s3.636 7 10 7 10-7 10-7-3.636-7-10-7zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/>
                    <circle cx="12" cy="12" r="2"/>
            </svg>
                  {post.views}
                </span>
              </div>
              <div className="post-actions">
                <button onClick={() => handleEdit(post.id)} className="edit-button">
                  <span className="button-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
                  </span>
                  <span className="button-text">Edit</span>
          </button>
                <button onClick={() => handleDelete(post.id)} className="delete-button">
                  <span className="button-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
                  </span>
                  <span className="button-text">Delete</span>
          </button>
                <span className="post-id">ID: {post.id}</span>
              </div>
        </div>
      </div>
        ))}

        {loading && <div className="loading-indicator">Loading...</div>}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => fetchUserInquiries(true)} className="retry-button">
            Try Again
          </button>
        </div>
        )}
      </div>
    </div>
  );
};

export default MyPostsView; 