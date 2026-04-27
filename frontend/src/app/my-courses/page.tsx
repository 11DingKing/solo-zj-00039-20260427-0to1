'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  BookMarked, 
  CheckCircle, 
  Play,
  Clock,
  Award
} from 'lucide-react';
import { studentApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Course {
  id: string;
  title: string;
  cover_image: string;
  instructor_name: string;
  category_name: string;
  difficulty: string;
  progress: number;
  total_lessons: number;
  completed_lessons: number;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
}

export default function MyCoursesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/my-courses');
      return;
    }

    const fetchCourses = async () => {
      try {
        const res = await studentApi.getMyCourses();
        setCourses(res.data.courses);
      } catch (error) {
        console.error('Failed to fetch my courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user, router]);

  const filteredCourses = courses.filter((course) => {
    if (activeFilter === 'all') return true;
    return course.status === activeFilter;
  });

  const inProgressCount = courses.filter(c => c.status === 'in_progress').length;
  const completedCount = courses.filter(c => c.status === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900">我的课程</h1>
          <p className="text-gray-500 mt-1">查看您正在学习和已完成的课程</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>全部</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                {courses.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveFilter('in_progress')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'in_progress'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4" />
              <span>在学中</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                {inProgressCount}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'completed'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>已完成</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                {completedCount}
              </span>
            </div>
          </button>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookMarked className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeFilter === 'all' 
                ? '还没有加入任何课程' 
                : activeFilter === 'in_progress'
                ? '没有正在学习的课程'
                : '还没有完成的课程'}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeFilter === 'all' 
                ? '浏览课程市场，发现感兴趣的课程' 
                : activeFilter === 'in_progress'
                ? '去课程市场选择一门课程开始学习吧'
                : '继续努力学习，完成课程获得结业证书'}
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              <span>浏览课程</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link href={`/courses/${course.id}`}>
                  <div className="relative">
                    <img
                      src={course.cover_image || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=course%20learning%20platform%20cover&image_size=landscape_16_9'}
                      alt={course.title}
                      className="w-full h-40 object-cover"
                    />
                    {course.status === 'completed' && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                        <Award className="w-4 h-4" />
                        <span>已完成</span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={`/courses/${course.id}`}>
                    <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-primary-600 transition-colors">
                      {course.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">{course.instructor_name}</p>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">
                        {course.completed_lessons}/{course.total_lessons} 课时
                      </span>
                      <span className="font-medium text-primary-600">
                        {Math.round(course.progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          course.status === 'completed' ? 'bg-green-500' : 'bg-primary-500'
                        }`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      加入于 {new Date(course.enrolled_at).toLocaleDateString('zh-CN')}
                    </span>
                    <Link
                      href={`/courses/${course.id}/learn`}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        course.status === 'completed'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {course.status === 'completed' ? '复习课程' : '继续学习'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
