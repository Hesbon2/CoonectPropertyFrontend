import React, { useState, useEffect } from 'react';
import { getAllCounties, getWardsByCounty } from '../utils/locations';

const LocationSelector = ({ 
  onCountyChange, 
  onWardChange, 
  selectedCounty, 
  selectedWard,
  className = ''
}) => {
  const [counties, setCounties] = useState([]);
  const [wards, setWards] = useState([]);

  useEffect(() => {
    // Load counties on component mount
    const loadedCounties = getAllCounties();
    setCounties(loadedCounties);
  }, []);

  useEffect(() => {
    // Load wards when county changes
    if (selectedCounty) {
      const loadedWards = getWardsByCounty(selectedCounty);
      setWards(loadedWards);
    } else {
      setWards([]);
    }
  }, [selectedCounty]);

  const handleCountyChange = (e) => {
    const countyId = e.target.value;
    onCountyChange(countyId);
    onWardChange(''); // Reset ward when county changes
  };

  const handleWardChange = (e) => {
    const wardId = e.target.value;
    onWardChange(wardId);
  };

  return (
    <div className={`location-fields ${className}`}>
      <div className="location-field">
        <label htmlFor="county" className="form-label">
          County
        </label>
        <select
          id="county"
          value={selectedCounty || ''}
          onChange={handleCountyChange}
          className="form-select"
        >
          <option value="">Select County</option>
          {counties.map((county) => (
            <option key={county.id} value={county.id}>
              {county.name}
            </option>
          ))}
        </select>
      </div>

      <div className="location-field">
        <label htmlFor="ward" className="form-label">
          Ward
        </label>
        <select
          id="ward"
          value={selectedWard || ''}
          onChange={handleWardChange}
          disabled={!selectedCounty}
          className="form-select"
        >
          <option value="">Select Ward</option>
          {wards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LocationSelector; 