'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  TrendingUp, 
  Star, 
  Plus,
  Settings,
  ChevronRight,
  Edit,
  Eye
} from 'lucide-react';
import { instructorApi, coursesApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Course {
  id: string;
  title: string;
  cover_image: string;
  status: string;
  student_count: number;
  average_rating: number;
  rating_count: number;
  view_count: number;
  total_lessons: number;
  created_at: string;
}

interface Stats {
  total_courses: number;
  total_students: number;
  total_ratings: number;
  average_rating: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
};

export default function InstructorDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'courses'>('overview');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'instructor') {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [coursesRes, statsRes, categoriesRes] = await Promise.all([
          instructorApi.getCourses(),
          instructorApi.getStats(),
          coursesApi.getCategories(),
        ]);
        setCourses(coursesRes.data.courses);
        setStats(statsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Failed to fetch instructor data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'instructor') {
      fetchData();
    }
  }, [user, router]);

  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) return;

    setCreatingCourse(true);
    try {
      const res = await coursesApi.createCourse({
        title: newCourseTitle,
        category_id: newCourseCategory || undefined,
        status: 'draft',
      });
      router.push(`/instructor/courses/${res.data.course.id}/edit`);
    } catch (error) {
      console.error('Failed to create course:', error);
    } finally {
      setCreatingCourse(false);
    }
  };

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">讲师工作台</h1>
              <p className="text-gray-500 mt-1">管理您的课程和查看统计数据</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>创建课程</span>
            </button>
          </div>

          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <LayoutDashboard className="w-4 h-4" />
                <span>数据概览</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'courses'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>我的课程</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">课程数量</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total_courses || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">学员总数</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total_students || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">平均评分</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stats?.average_rating ? stats.average_rating.toFixed(1) : '0.0'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600 fill-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">评价数量</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total_ratings || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">最近课程</h2>
              </div>
              {courses.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">还没有课程</h3>
                  <p className="text-gray-500 mb-6">创建您的第一门课程，开始您的讲师之旅</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>创建课程</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y">
                  {courses.slice(0, 5).map((course) => (
                    <div key={course.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <img
                          src={course.cover_image || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=course%20cover%20image&image_size=square'}
                          alt={course.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{course.title}</h3>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span className={`px-2 py-0.5 rounded ${statusColors[course.status]}`}>
                              {statusLabels[course.status]}
                            </span>
                            <span>{course.student_count} 学员</span>
                            <span>{course.total_lessons} 课时</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/courses/${course.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="预览"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <Link
                          href={`/instructor/courses/${course.id}/edit`}
                          className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {courses.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有课程</h3>
                <p className="text-gray-500 mb-6">创建您的第一门课程，开始您的讲师之旅</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>创建课程</span>
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {courses.map((course) => (
                  <div key={course.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <img
                        src={course.cover_image || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=course%20cover%20image&image_size=square'}
                        alt={course.title}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900 text-lg">{course.title}</h3>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`px-2 py-1 rounded text-sm ${statusColors[course.status]}`}>
                            {statusLabels[course.status]}
                          </span>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Users className="w-4 h-4" />
                            <span>{course.student_count} 学员</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span>{course.average_rating.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <BookOpen className="w-4 h-4" />
                            <span>{course.total_lessons} 课时</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/courses/${course.id}`}
                        className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>预览</span>
                      </Link>
                      <Link
                        href={`/instructor/courses/${course.id}/edit`}
                        className="flex items-center space-x-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        <span>编辑</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">创建新课程</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  课程标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="请输入课程标题"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  课程分类
                </label>
                <select
                  value={newCourseCategory}
                  onChange={(e) => setNewCourseCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">请选择分类（可选）</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleCreateCourse}
                disabled={!newCourseTitle.trim() || creatingCourse}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {creatingCourse ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span>创建课程</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
