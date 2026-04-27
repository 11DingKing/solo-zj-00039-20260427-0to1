import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { username: string; email: string; password: string; role: 'student' | 'instructor' }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
  updateProfile: (data: any) => api.put('/api/auth/profile', data),
};

export const coursesApi = {
  getCategories: () => api.get('/api/courses/categories'),
  getCourses: (params?: any) => api.get('/api/courses', { params }),
  getCourse: (id: string) => api.get(`/api/courses/${id}`),
  createCourse: (data: any) => api.post('/api/courses', data),
  updateCourse: (id: string, data: any) => api.put(`/api/courses/${id}`, data),
  
  createChapter: (courseId: string, data: any) =>
    api.post(`/api/courses/${courseId}/chapters`, data),
  updateChapter: (chapterId: string, data: any) =>
    api.put(`/api/courses/chapters/${chapterId}`, data),
  deleteChapter: (chapterId: string) =>
    api.delete(`/api/courses/chapters/${chapterId}`),
  reorderChapters: (chapterIds: string[]) =>
    api.post('/api/courses/chapters/reorder', { chapter_ids: chapterIds }),
  
  createLesson: (chapterId: string, data: any) =>
    api.post(`/api/courses/chapters/${chapterId}/lessons`, data),
  getLesson: (lessonId: string) => api.get(`/api/courses/lessons/${lessonId}`),
  updateLesson: (lessonId: string, data: any) =>
    api.put(`/api/courses/lessons/${lessonId}`, data),
  deleteLesson: (lessonId: string) =>
    api.delete(`/api/courses/lessons/${lessonId}`),
  reorderLessons: (lessonIds: string[]) =>
    api.post('/api/courses/lessons/reorder', { lesson_ids: lessonIds }),
};

export const progressApi = {
  enroll: (courseId: string) => api.post(`/api/progress/enroll/${courseId}`),
  getEnrollment: (courseId: string) => api.get(`/api/progress/enrollment/${courseId}`),
  updateVideoProgress: (lessonId: string, data: { progress: number; total_duration: number }) =>
    api.post(`/api/progress/lesson/${lessonId}/video`, data),
  markTextRead: (lessonId: string) =>
    api.post(`/api/progress/lesson/${lessonId}/text`),
  submitQuiz: (lessonId: string, data: { answers: Record<string, string> }) =>
    api.post(`/api/progress/lesson/${lessonId}/quiz`, data),
  getAllProgress: (courseId: string) => api.get(`/api/progress/course/${courseId}/all`),
};

export const reviewsApi = {
  getCourseReviews: (courseId: string, params?: any) =>
    api.get(`/api/reviews/course/${courseId}`, { params }),
  createReview: (courseId: string, data: { rating: number; comment?: string; is_anonymous?: boolean }) =>
    api.post(`/api/reviews/course/${courseId}`, data),
  updateReview: (reviewId: string, data: any) =>
    api.put(`/api/reviews/${reviewId}`, data),
  replyToReview: (reviewId: string, reply: string) =>
    api.post(`/api/reviews/${reviewId}/reply`, { reply }),
};

export const certificatesApi = {
  generate: (courseId: string) =>
    api.post(`/api/certificates/generate/${courseId}`),
  getMyCertificates: () => api.get('/api/certificates/mine'),
  getCertificate: (certId: string) => api.get(`/api/certificates/${certId}`),
  verify: (certNumber: string) => api.get(`/api/certificates/verify/${certNumber}`),
};

export const instructorApi = {
  getCourses: () => api.get('/api/instructor/courses'),
  getCourseStudents: (courseId: string, params?: any) =>
    api.get(`/api/instructor/course/${courseId}/students`, { params }),
  getStudentProgress: (courseId: string, studentId: string) =>
    api.get(`/api/instructor/course/${courseId}/progress/${studentId}`),
  getCourseStats: (courseId: string) =>
    api.get(`/api/instructor/course/${courseId}/stats`),
  getStats: () => api.get('/api/instructor/stats'),
};

export const studentApi = {
  getMyCourses: (status?: string) =>
    api.get('/api/student/courses', { params: { status } }),
  getTimeline: (params?: any) =>
    api.get('/api/student/timeline', { params }),
  addRecord: (data: any) => api.post('/api/student/record', data),
  getStats: () => api.get('/api/student/stats'),
  getMyReviews: () => api.get('/api/student/reviews'),
};

export const recommendationsApi = {
  getHome: () => api.get('/api/recommendations/home'),
  getSimilar: (courseId: string) => api.get(`/api/recommendations/similar/${courseId}`),
};

export const uploadApi = {
  uploadVideo: (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    return api.post('/api/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/api/upload/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/api/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
