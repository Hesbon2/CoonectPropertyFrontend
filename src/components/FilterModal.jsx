import React, { useState, useRef, useEffect } from 'react';
import LocationSelector from './LocationSelector';
import '../styles/FilterModal.css';
import { getCountyById, getWardById } from '../utils/locations';

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
  { value: 'client', label: 'Client' },
  { value: 'agent', label: 'Agent' },
  { value: 'host', label: 'Host' }
];

const FilterModal = ({ isOpen, onClose, onApplyFilters }) => {
  const [filters, setFilters] = useState({
    county: '',
    area: '',
    houseType: '',
    roomType: '',
    requester: '',
    checkInDate: '',
    checkOutDate: '',
    minBudget: '',
    maxBudget: ''
  });

  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleClear = () => {
    setFilters({
      county: '',
      area: '',
      houseType: '',
      roomType: '',
      requester: '',
      checkInDate: '',
      checkOutDate: '',
      minBudget: '',
      maxBudget: ''
    });
  };

  const handleApply = () => {
    // Log initial filters
    console.log('Initial filters:', filters);

    // Format the filters before applying
    const formattedFilters = {
      ...filters,
      // Keep county and area as IDs
      county: filters.county || '',
      ward: filters.area || '',
      // Format budget range
      budget: filters.minBudget || filters.maxBudget ? 
        `${filters.minBudget || ''}-${filters.maxBudget || ''}` : '',
      // Format dates
      checkInDate: filters.checkInDate ? new Date(filters.checkInDate).toISOString() : '',
      checkOutDate: filters.checkOutDate ? new Date(filters.checkOutDate).toISOString() : '',
    };

    // Log formatted filters before cleanup
    console.log('Formatted filters before cleanup:', formattedFilters);

    // Remove empty filters and area field
    Object.keys(formattedFilters).forEach(key => {
      if (!formattedFilters[key] || key === 'area') {
        delete formattedFilters[key];
      }
    });

    // Log final formatted filters
    console.log('Final formatted filters:', formattedFilters);
    
    onApplyFilters(formattedFilters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="filter-modal-overlay" onClick={handleClickOutside}>
      <div className="filter-modal" ref={modalRef}>
        <div className="filter-modal-header">
          <h2>All Filters</h2>
          <button className="close-button" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
        </div>

        <div className="filter-modal-content">
          <div className="filter-section">
            <h3>Location</h3>
            <LocationSelector
              selectedCounty={filters.county}
              selectedWard={filters.area}
              onCountyChange={(value) => setFilters(prev => ({ ...prev, county: value, area: '' }))}
              onWardChange={(value) => setFilters(prev => ({ ...prev, area: value }))}
            />
          </div>

          <div className="filter-section">
            <h3 className="filter-section-title">Requester Type</h3>
            <div className="filter-options-container">
              {REQUESTER_TYPES.map(type => (
                <button
                  key={type.value}
                  className={`filter-option-button ${filters.requester === type.value ? 'selected' : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, requester: type.value }))}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3 className="filter-section-title">House Type</h3>
            <div className="filter-options-container">
              {HOUSE_TYPES.map(type => (
                <button
                  key={type.value}
                  className={`filter-option-button ${filters.houseType === type.value ? 'selected' : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, houseType: type.value }))}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3 className="filter-section-title">Room Type</h3>
            <div className="filter-options-container">
              {ROOM_TYPES.map(type => (
                <button
                  key={type.value}
                  className={`filter-option-button ${filters.roomType === type.value ? 'selected' : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, roomType: type.value }))}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Dates</h3>
            <div className="date-inputs">
              <div className="date-field">
                <label>Check-in</label>
                <input
                  type="date"
                  value={filters.checkInDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, checkInDate: e.target.value }))}
                  className="filter-input"
                />
              </div>
              <div className="date-field">
                <label>Check-out</label>
                <input
                  type="date"
                  value={filters.checkOutDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, checkOutDate: e.target.value }))}
                  className="filter-input"
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h3>Budget (KSh)</h3>
            <div className="budget-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.minBudget}
                onChange={(e) => setFilters(prev => ({ ...prev, minBudget: e.target.value }))}
                className="filter-input"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxBudget}
                onChange={(e) => setFilters(prev => ({ ...prev, maxBudget: e.target.value }))}
                className="filter-input"
              />
            </div>
          </div>
        </div>

        <div className="filter-modal-footer">
          <button className="clear-button" onClick={handleClear}>
            Clear
          </button>
          <button className="apply-button" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;