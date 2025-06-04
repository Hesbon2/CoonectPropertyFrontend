// Cloudinary configuration with direct values
const CLOUD_NAME = 'mangs'; // Directly set cloud name
const UPLOAD_PRESET = 'chat_images'; // Directly set upload preset
const FOLDER = 'property-connect/chat-images'; // Folder structure in Cloudinary

export const uploadImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('cloud_name', CLOUD_NAME);
    formData.append('folder', FOLDER);

    console.log('Uploading to Cloudinary with config:', {
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
      folder: FOLDER
    });

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary upload failed:', data);
      throw new Error(data.error?.message || 'Upload failed');
    }

    console.log('Cloudinary upload successful:', {
      url: data.secure_url,
      publicId: data.public_id
    });

    return {
      url: data.secure_url,
      publicId: data.public_id
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

export const deleteImage = async (publicId) => {
  // Note: Image deletion should be handled through your backend
  // for security reasons, as it requires API secret
  throw new Error('Image deletion must be handled through the backend');
}; 