import React from 'react';

const FiltersSection = ({ 
  locationFilter, 
  setLocationFilter, 
  nightsFilter, 
  setNightsFilter, 
  budgetFilter, 
  setBudgetFilter 
}) => {
  const containerStyle = {
    display: 'block',
    background: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px 28px',
    marginBottom: '24px',
    width: '100%',
    boxSizing: 'border-box'
  };

  const titleStyle = {
    display: 'block',
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '16px'
  };

  const sectionStyle = {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  };

  const selectStyle = {
    display: 'block',
    padding: '12px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    background: '#fff',
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
    minWidth: '200px',
    flex: '1'
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        Filter by:
      </div>
      <div style={sectionStyle}>
        <select 
          value={locationFilter} 
          onChange={(e) => setLocationFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="Location" disabled>Select Location</option>
          <option value="All">All Locations</option>
          <option value="Nairobi">Nairobi</option>
          <option value="Mombasa">Mombasa</option>
          <option value="Kisumu">Kisumu</option>
        </select>

        <select 
          value={nightsFilter} 
          onChange={(e) => setNightsFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="All Duration" disabled>Select Duration</option>
          <option value="All">All Durations</option>
          <option value="1-3">1-3 nights</option>
          <option value="4-7">4-7 nights</option>
          <option value="8+">8+ nights</option>
        </select>

        <select 
          value={budgetFilter} 
          onChange={(e) => setBudgetFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="All Duration" disabled>Select Budget</option>
          <option value="All">All Budgets</option>
          <option value="0-5000">0-5,000 KSh</option>
          <option value="5000-10000">5,000-10,000 KSh</option>
          <option value="10000+">10,000+ KSh</option>
        </select>
      </div>
    </div>
  );
};

export default FiltersSection; 