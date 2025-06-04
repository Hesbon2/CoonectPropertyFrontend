const DEFAULT_COLORS = [
  '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
  '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
  '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#f39c12',
  '#d35400', '#c0392b', '#bdc3c7', '#7f8c8d'
];

export const getInitialsAvatar = (firstName, lastName) => {
  // Get initials
  const initials = `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  
  // Generate consistent color based on name
  const colorIndex = Math.abs(
    (firstName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
    (lastName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % DEFAULT_COLORS.length;
  
  const backgroundColor = DEFAULT_COLORS[colorIndex];
  
  // Create SVG for avatar with better text positioning
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="100%" height="100%">
      <rect width="40" height="40" fill="${backgroundColor}" rx="20" ry="20"/>
      <text 
        x="20" 
        y="20" 
        fill="white" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
        font-size="16"
        font-weight="500"
        text-anchor="middle"
        dominant-baseline="central"
        letter-spacing="1"
      >
        ${initials}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml,${encodeURIComponent(svgContent.trim())}`;
}; 