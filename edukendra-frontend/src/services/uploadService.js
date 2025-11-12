const API_BASE_URL = 'http://localhost:5000/api';

export const uploadService = {
  // Upload video file
  async uploadVideo(file) {
    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch(`${API_BASE_URL}/uploads/video`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload video');
      }

      return data;
    } catch (error) {
      console.error('Video upload error:', error);
      throw error;
    }
  },

  // Upload material file
  async uploadMaterial(file) {
    try {
      const formData = new FormData();
      formData.append('material', file);

      const response = await fetch(`${API_BASE_URL}/uploads/material`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload material');
      }

      return data;
    } catch (error) {
      console.error('Material upload error:', error);
      throw error;
    }
  },

  // Upload assignment file
  async uploadAssignment(file) {
    try {
      const formData = new FormData();
      formData.append('assignment', file);

      const response = await fetch(`${API_BASE_URL}/uploads/assignment`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload assignment file');
      }

      return data;
    } catch (error) {
      console.error('Assignment upload error:', error);
      throw error;
    }
  },

  // Upload student assignment submission
  async uploadSubmission(file) {
    try {
      const formData = new FormData();
      formData.append('submission', file);

      const response = await fetch(`${API_BASE_URL}/uploads/submission`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload submission');
      }

      return data;
    } catch (error) {
      console.error('Submission upload error:', error);
      throw error;
    }
  },

  // Check if backend is available
  async checkBackend() {
    try {
      const response = await fetch(`${API_BASE_URL}/test`);
      return response.ok;
    } catch (error) {
      console.log('Backend not available, using local storage fallback');
      return false;
    }
  }
};