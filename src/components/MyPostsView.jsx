import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/MyPostsView.css';
import inquiryService from '../services/inquiry.service';

const ITEMS_PER_PAGE = 10;

const MyPostsView = () => {
  const [locationFilter, setLocationFilter] = useState('Location');
  const [durationFilter, setDurationFilter] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const lastPostRef = useRef();
  const loadingRef = useRef();

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

      const response = await inquiryService.getMyInquiries(page, ITEMS_PER_PAGE);
      
      const formattedPosts = response.map(inquiry => ({
        id: inquiry.id || inquiry._id,
        postId: inquiry.postId || inquiry.id || inquiry._id,
        title: `${inquiry.houseType} - ${inquiry.unitSize}`,
        location: inquiry.location,
        date: `${new Date(inquiry.checkInDate).toLocaleDateString()} - ${new Date(inquiry.checkOutDate).toLocaleDateString()}`,
        price: inquiry.budget.toLocaleString(),
        duration: `${Math.ceil((new Date(inquiry.checkOutDate) - new Date(inquiry.checkInDate)) / (1000 * 60 * 60 * 24))} nights`,
        description: inquiry.description,
      stats: {
          inquiries: inquiry.engagement?.inquiries?.toString() || '0',
          likes: inquiry.engagement?.likes?.toString() || '0',
          views: inquiry.engagement?.views?.toString() || '0'
      },
        postedTime: getTimeAgo(new Date(inquiry.createdAt))
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

  const handleDeleteInquiry = async (inquiryId) => {
    try {
      // Optimistic update
      setPosts(prev => prev.filter(post => post.id !== inquiryId));
      
      await inquiryService.deleteInquiry(inquiryId);
    } catch (err) {
      console.error('Error deleting inquiry:', err);
      setError('Failed to delete inquiry. Please try again later.');
      // Revert optimistic update
      fetchUserInquiries(true);
    }
  };

  const SkeletonCard = () => (
    <div className="post-card skeleton">
      <div className="post-header">
        <div className="skeleton-text-container">
          <div className="skeleton-text"></div>
          <div className="skeleton-text"></div>
        </div>
      </div>
      <div className="post-content">
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

  const PostCard = ({ post }) => (
      <div className="post-card">
        <div className="post-header">
          <div className="post-title-section">
            <h3>{post.title}</h3>
          <div className="duration-tag">{post.duration}</div>
        </div>
      </div>
        <div className="post-location">{post.location}</div>
        <div className="post-date-price">
          <span>{post.date}</span>
          <span className="price">Ksh {post.price}/night</span>
        </div>
      <p className="post-description">{post.description}</p>
        <div className="post-stats">
          <div className="stat">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM17 11h-4v4h-2v-4H7V9h4V5h2v4h4v2z"/>
            </svg>
            <span>{post.stats.inquiries}</span>
          </div>
          <div className="stat">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>{post.stats.likes}</span>
          </div>
          <div className="stat">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            <span>{post.stats.views}</span>
          </div>
        </div>
        <div className="post-actions">
          <div className="action-buttons-group">
          <button className="action-button">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            <span>Edit</span>
            </button>
          <button className="action-button">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            <span>Preview</span>
            </button>
          <button className="action-button delete" onClick={() => handleDeleteInquiry(post.id)}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="my-posts-container">
      <div className="my-posts-header">
        <h1 className="my-posts-title">My Posts</h1>
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

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => fetchUserInquiries(true)} className="retry-button">
            Try Again
          </button>
        </div>
      )}

      <div className="posts-grid">
        {initialLoad ? (
          // Show skeletons on initial load
          Array(4).fill(0).map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`} />
          ))
        ) : (
          <>
            {posts.map((post, index) => (
              <div
                key={post.id}
                ref={index === posts.length - 1 ? lastPostCallback : null}
              >
                <PostCard post={post} />
              </div>
            ))}
            {loading && !initialLoad && (
              <div ref={loadingRef} className="loading-more">
                <SkeletonCard />
              </div>
            )}
            {posts.length === 0 && !loading && (
              <div className="no-posts-message">
                You haven't posted any inquiries yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyPostsView; 