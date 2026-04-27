'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Users, 
  Star, 
  Play, 
  Check, 
  Clock,
  ChevronRight,
  ChevronDown,
  User,
  MessageSquare,
  Award,
  Lock,
  Unlock
} from 'lucide-react';
import Link from 'next/link';
import { coursesApi, progressApi, reviewsApi } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import RatingStars from '../../../components/RatingStars';
import LoadingSpinner from '../../../components/LoadingSpinner';
import parse from 'html-react-parser';

interface Chapter {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  lesson_type: 'video' | 'text' | 'quiz';
  duration: number;
  video_duration: number;
  order_index: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  category_name: string;
  difficulty: string;
  is_free: boolean;
  instructor_id: string;
  instructor_name: string;
  instructor_avatar: string;
  status: string;
  view_count: number;
  student_count: number;
  average_rating: number;
  rating_count: number;
  chapters: Chapter[];
}

interface Enrollment {
  id: string;
  progress: number;
  status: string;
  total_lessons: number;
  completed_lessons: number;
}

interface ProgressMap {
  [lessonId: string]: {
    is_completed: boolean;
    video_progress: number;
    text_read: boolean;
    quiz_score: number;
  };
}

const difficultyLabels: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

const lessonTypeIcons: Record<string, React.ReactNode> = {
  video: <Play className="w-4 h-4" />,
  text: <BookOpen className="w-4 h-4" />,
  quiz: <Award className="w-4 h-4" />,
};

const lessonTypeLabels: Record<string, string> = {
  video: '视频',
  text: '图文',
  quiz: '测验',
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [reviews, setReviews] = useState<any[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [activeTab, setActiveTab] = useState<'intro' | 'reviews'>('intro');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseRes = await coursesApi.getCourse(courseId);
        setCourse(courseRes.data);

        if (courseRes.data.chapters.length > 0) {
          setExpandedChapters(new Set([courseRes.data.chapters[0].id]));
        }

        if (user) {
          try {
            const [enrollmentRes, progressRes] = await Promise.all([
              progressApi.getEnrollment(courseId),
              progressApi.getAllProgress(courseId),
            ]);
            setEnrollment(enrollmentRes.data);
            setProgressMap(progressRes.data.progress_map);
          } catch (err: any) {
            if (err.response?.status !== 404) {
              console.error('Failed to fetch progress:', err);
            }
          }
        }

        const reviewsRes = await reviewsApi.getCourseReviews(courseId);
        setReviews(reviewsRes.data.reviews);
      } catch (error) {
        console.error('Failed to fetch course:', error);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchData();
    }
  }, [courseId, user]);

  const handleEnroll = async () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${courseId}`);
      return;
    }

    setEnrolling(true);
    try {
      const res = await progressApi.enroll(courseId);
      setEnrollment(res.data.enrollment);
    } catch (error) {
      console.error('Failed to enroll:', error);
    } finally {
      setEnrolling(false);
    }
  };

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const getLessonStatus = (lessonId: string) => {
    const progress = progressMap[lessonId];
    if (!progress) return { status: 'not_started', icon: <Lock className="w-4 h-4 text-gray-400" /> };
    if (progress.is_completed) return { status: 'completed', icon: <Check className="w-4 h-4 text-green-500" /> };
    if (progress.video_progress > 0 || progress.text_read) return { status: 'in_progress', icon: <Unlock className="w-4 h-4 text-primary-500" /> };
    return { status: 'not_started', icon: <Lock className="w-4 h-4 text-gray-400" /> };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">课程不存在</h2>
          <Link href="/courses" className="text-primary-600 hover:underline">
            返回课程列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">
                  {course.category_name}
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm">
                  {difficultyLabels[course.difficulty] || course.difficulty}
                </span>
                {course.is_free && (
                  <span className="px-3 py-1 bg-green-500 rounded-full text-sm font-medium">
                    免费
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
              
              {course.description && (
                <p className="text-gray-300 mb-6 line-clamp-3">
                  {course.description}
                </p>
              )}

              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{course.instructor_name}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{course.student_count} 人学习</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{course.average_rating.toFixed(1)}</span>
                  <span className="text-gray-400">({course.rating_count})</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span>
                    {course.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)} 课时
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="relative">
                  <img
                    src={course.cover_image || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=course%20learning%20platform%20cover%20image&image_size=landscape_16_9'}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  {!enrollment && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-primary-600 ml-1" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  {enrollment ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">学习进度</span>
                          <span className="font-medium text-primary-600">
                            {Math.round(enrollment.progress)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <Link
                        href={`/courses/${courseId}/learn`}
                        className="block w-full py-3 bg-primary-600 text-white text-center rounded-lg font-medium hover:bg-primary-700 transition-colors"
                      >
                        {enrollment.progress > 0 ? '继续学习' : '开始学习'}
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enrolling ? <LoadingSpinner size="sm" /> : course.is_free ? '免费加入' : '立即购买'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('intro')}
                    className={`px-6 py-4 font-medium transition-colors ${
                      activeTab === 'intro'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    课程介绍
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-6 py-4 font-medium transition-colors ${
                      activeTab === 'reviews'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    学员评价 ({course.rating_count})
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'intro' ? (
                  <div className="prose max-w-none">
                    {course.description ? parse(course.description) : (
                      <p className="text-gray-500">暂无课程介绍</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviews.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">暂无评价</p>
                      </div>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="border-b pb-6 last:border-0 last:pb-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-primary-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{review.student_name}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(review.created_at).toLocaleDateString('zh-CN')}
                                </p>
                              </div>
                            </div>
                            <RatingStars rating={review.rating} size="sm" readonly />
                          </div>
                          {review.comment && (
                            <p className="text-gray-700 mb-3">{review.comment}</p>
                          )}
                          {review.instructor_reply && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm font-medium text-gray-900 mb-1">讲师回复：</p>
                              <p className="text-sm text-gray-600">{review.instructor_reply}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">讲师介绍</h3>
              </div>
              <div className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                    {course.instructor_avatar ? (
                      <img
                        src={course.instructor_avatar}
                        alt={course.instructor_name}
                        className="w-14 h-14 rounded-full"
                      />
                    ) : (
                      <User className="w-7 h-7 text-primary-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{course.instructor_name}</p>
                    <p className="text-sm text-gray-500">课程讲师</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">课程目录</h3>
                <span className="text-sm text-gray-500">
                  {course.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)} 课时
                </span>
              </div>
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {course.chapters.map((chapter) => (
                  <div key={chapter.id}>
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedChapters.has(chapter.id) ? '' : '-rotate-90'
                          }`}
                        />
                        <span className="font-medium text-gray-900">{chapter.title}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {chapter.lessons.length} 课时
                      </span>
                    </button>
                    
                    {expandedChapters.has(chapter.id) && (
                      <div className="bg-gray-50">
                        {chapter.lessons.map((lesson) => {
                          const { status, icon } = getLessonStatus(lesson.id);
                          return (
                            <Link
                              key={lesson.id}
                              href={enrollment ? `/courses/${courseId}/learn?lesson=${lesson.id}` : '#'}
                              className={`flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 transition-colors ${
                                !enrollment ? 'cursor-not-allowed' : ''
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                status === 'completed'
                                  ? 'bg-green-100 text-green-600'
                                  : status === 'in_progress'
                                  ? 'bg-primary-100 text-primary-600'
                                  : 'bg-gray-100 text-gray-400'
                              }`}>
                                {status === 'completed' ? icon : lessonTypeIcons[lesson.lesson_type]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                  status === 'not_started' && !enrollment
                                    ? 'text-gray-400'
                                    : 'text-gray-900'
                                }`}>
                                  {lesson.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {lessonTypeLabels[lesson.lesson_type]}
                                  {lesson.duration > 0 && ` · ${lesson.duration} 分钟`}
                                </p>
                              </div>
                              {status === 'completed' && (
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
