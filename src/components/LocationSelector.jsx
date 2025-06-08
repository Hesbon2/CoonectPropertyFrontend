import React, { useState, useEffect, useRef } from 'react';
import { getAllCounties, getWardsByCounty } from '../utils/locations';
import '../styles/LocationSelector.css';

const LocationSelector = ({ 
  onCountyChange, 
  onWardChange, 
  selectedCounty, 
  selectedWard,
  className = ''
}) => {
  const [counties, setCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [countySearch, setCountySearch] = useState('');
  const [wardSearch, setWardSearch] = useState('');
  const [filteredCounties, setFilteredCounties] = useState([]);
  const [filteredWards, setFilteredWards] = useState([]);
  const [isCountyFocused, setIsCountyFocused] = useState(false);
  const [isWardFocused, setIsWardFocused] = useState(false);
  const countyInputRef = useRef(null);
  const wardInputRef = useRef(null);

  // Sort locations alphabetically, case-insensitive
  const sortLocations = (locations) => {
    return [...locations].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  };

  useEffect(() => {
    // Load and sort counties on component mount
    const loadedCounties = getAllCounties();
    const sortedCounties = sortLocations(loadedCounties);
    setCounties(sortedCounties);
    setFilteredCounties(sortedCounties);
  }, []);

  useEffect(() => {
    // Load and sort wards when county changes
    if (selectedCounty) {
      const loadedWards = getWardsByCounty(selectedCounty.toString()); // Convert to string
      const sortedWards = sortLocations(loadedWards);
      setWards(sortedWards);
      setFilteredWards(sortedWards);
    } else {
      setWards([]);
      setFilteredWards([]);
    }
    setWardSearch('');
  }, [selectedCounty]);

  useEffect(() => {
    // Filter counties based on search, case-insensitive
    const searchTerm = countySearch.toLowerCase();
    if (searchTerm) {
      const filtered = counties.filter(county =>
        county.name.toLowerCase().includes(searchTerm)
      );
      setFilteredCounties(filtered);

      // If there's an exact match (case-insensitive), select it
      const exactMatch = filtered.find(county => 
        county.name.toLowerCase() === searchTerm
      );
      if (exactMatch) {
        onCountyChange(exactMatch.id.toString()); // Convert to string
      }
    } else {
      setFilteredCounties(counties);
    }
  }, [countySearch, counties]);

  useEffect(() => {
    // Filter wards based on search, case-insensitive
    const searchTerm = wardSearch.toLowerCase();
    if (searchTerm) {
      const filtered = wards.filter(ward =>
        ward.name.toLowerCase().includes(searchTerm)
      );
      setFilteredWards(filtered);

      // If there's an exact match (case-insensitive), select it
      const exactMatch = filtered.find(ward => 
        ward.name.toLowerCase() === searchTerm
      );
      if (exactMatch) {
        onWardChange(exactMatch.id.toString()); // Convert to string
      }
    } else {
      setFilteredWards(wards);
    }
  }, [wardSearch, wards]);

  const handleCountyKeyDown = (e) => {
    if (e.key === 'Backspace') {
      if (!countySearch) {
        // If backspace is pressed and search is empty, clear selection
        onCountyChange('');
        onWardChange('');
      } else {
        // Remove last character from search
        setCountySearch(prev => prev.slice(0, -1));
      }
      e.preventDefault();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // If it's a single character key press (not a control key)
      const newSearch = countySearch + e.key;
      setCountySearch(newSearch);
      e.preventDefault();
    }
  };

  const handleWardKeyDown = (e) => {
    if (e.key === 'Backspace') {
      if (!wardSearch) {
        // If backspace is pressed and search is empty, clear selection
        onWardChange('');
      } else {
        // Remove last character from search
        setWardSearch(prev => prev.slice(0, -1));
      }
      e.preventDefault();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // If it's a single character key press (not a control key)
      const newSearch = wardSearch + e.key;
      setWardSearch(newSearch);
      e.preventDefault();
    }
  };

  const handleCountyChange = (e) => {
    const countyId = e.target.value;
    if (countyId) {
      const selectedCountyObj = counties.find(c => c.id === countyId);
      if (selectedCountyObj) {
        setCountySearch(selectedCountyObj.name);
      }
    }
    onCountyChange(countyId); // Already a string from select value
    onWardChange(''); // Reset ward when county changes
  };

  const handleWardChange = (e) => {
    const wardId = e.target.value;
    if (wardId) {
      const selectedWardObj = wards.find(w => w.id === wardId);
      if (selectedWardObj) {
        setWardSearch(selectedWardObj.name);
      }
    }
    onWardChange(wardId); // Already a string from select value
  };

  const handleCountyFocus = () => {
    setIsCountyFocused(true);
    if (!selectedCounty) {
      setCountySearch('');
    }
  };

  const handleWardFocus = () => {
    setIsWardFocused(true);
    if (!selectedWard) {
      setWardSearch('');
    }
  };

  const handleCountyBlur = () => {
    setIsCountyFocused(false);
    if (!selectedCounty) {
      setCountySearch('');
    }
  };

  const handleWardBlur = () => {
    setIsWardFocused(false);
    if (!selectedWard) {
      setWardSearch('');
    }
  };

  // Get the display value for county select
  const getCountyDisplayValue = () => {
    if (countySearch) return countySearch;
    if (selectedCounty) {
      const county = counties.find(c => c.id === selectedCounty.toString()); // Convert to string
      return county ? county.name : '';
    }
    return '';
  };

  // Get the display value for ward select
  const getWardDisplayValue = () => {
    if (wardSearch) return wardSearch;
    if (selectedWard) {
      const ward = wards.find(w => w.id === selectedWard.toString()); // Convert to string
      return ward ? ward.name : '';
    }
    return '';
  };

  return (
    <div className={`location-fields ${className}`}>
      <div className="location-field">
        <label htmlFor="county" className="form-label">
          County
        </label>
        <div className={`select-container ${isCountyFocused ? 'focused' : ''}`}>
          <select
            id="county"
            value={selectedCounty || ''}
            onChange={handleCountyChange}
            onKeyDown={handleCountyKeyDown}
            onFocus={handleCountyFocus}
            onBlur={handleCountyBlur}
            className="form-select searchable-select"
            ref={countyInputRef}
          >
            <option value="">{getCountyDisplayValue() || 'Type to search county...'}</option>
            {filteredCounties.map((county) => (
              <option key={county.id} value={county.id}>
                {county.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="location-field">
        <label htmlFor="ward" className="form-label">
          Area
        </label>
        <div className={`select-container ${isWardFocused ? 'focused' : ''}`}>
          <select
            id="ward"
            value={selectedWard || ''}
            onChange={handleWardChange}
            onKeyDown={handleWardKeyDown}
            onFocus={handleWardFocus}
            onBlur={handleWardBlur}
            disabled={!selectedCounty}
            className="form-select searchable-select"
            ref={wardInputRef}
          >
            <option value="">{getWardDisplayValue() || 'Type to search area...'}</option>
            {filteredWards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector; 