import locationsData from '../Kenya_counties_subcounties_constituencies_wards.json';

// Extract the actual data arrays from the JSON structure
const counties = locationsData.find(item => item.type === 'table' && item.name === 'counties')?.data || [];
const subcounties = locationsData.find(item => item.type === 'table' && item.name === 'subcounties')?.data || [];
const stations = locationsData.find(item => item.type === 'table' && item.name === 'station')?.data || [];

// Get all counties
export const getAllCounties = () => {
  return counties.map(county => ({
    id: county.county_id,
    name: county.county_name.toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }));
};

// Get wards for a specific county
export const getWardsByCounty = (countyId) => {
  // First get all subcounties for this county
  const countySubcounties = subcounties.filter(sc => sc.county_id === countyId);
  
  // Then get all stations (wards) in these subcounties
  const countyWards = new Set();
  countySubcounties.forEach(subcounty => {
    const subcountyStations = stations.filter(station => 
      station.subcounty_id === subcounty.subcounty_id && 
      station.ward && 
      station.ward.trim() !== ''
    );
    
    subcountyStations.forEach(station => {
      countyWards.add({
        id: station.station_id,
        name: station.ward.toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        subcountyId: station.subcounty_id
      });
    });
  });

  return Array.from(countyWards);
};

// Get a county by ID
export const getCountyById = (countyId) => {
  const county = counties.find(c => c.county_id === countyId);
  return county ? {
    id: county.county_id,
    name: county.county_name.toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  } : null;
};

// Get a ward by ID
export const getWardById = (wardId) => {
  const station = stations.find(s => s.station_id === wardId);
  return station ? {
    id: station.station_id,
    name: station.ward.toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    subcountyId: station.subcounty_id
  } : null;
};

// Search locations by name
export const searchLocations = (query) => {
  const searchTerm = query.toLowerCase();
  
  const matchingCounties = counties
    .filter(county => county.county_name.toLowerCase().includes(searchTerm))
    .map(county => ({
      id: county.county_id,
      name: county.county_name.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      type: 'county'
    }));

  const matchingStations = stations
    .filter(station => station.ward && station.ward.toLowerCase().includes(searchTerm))
    .map(station => ({
      id: station.station_id,
      name: station.ward.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      subcountyId: station.subcounty_id,
      type: 'ward'
    }));

  return [...matchingCounties, ...matchingStations];
}; 