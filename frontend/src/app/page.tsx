'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, TrendingUp, Star, Users, ChevronRight, Search, GraduationCap, Clock } from 'lucide-react';
import { recommendationsApi, coursesApi } from '../lib/api';
import CourseCard from '../components/CourseCard';
import LoadingSpinner from '../components/LoadingSpinner';

interface Course {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  category_name: string;
  difficulty: string;
  is_free: boolean;
  instructor_name: string;
  student_count: number;
  average_rating: number;
  rating_count: number;
}

interface HomeData {
  popular: Course[];
  new: Course[];
  top_rated: Course[];
  personalized: Course[];
}

export default function HomePage() {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [homeRes, categoriesRes] = await Promise.all([
          recommendationsApi.getHome(),
          coursesApi.getCategories(),
        ]);
        setHomeData(homeRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                探索知识的海洋
                <br />
                <span className="text-primary-200">开启您的学习之旅</span>
              </h1>
              <p className="text-lg text-primary-100 mb-8">
                CourseHub 提供数千门优质课程，由行业专家亲自授课，帮助您掌握新技能，实现职业突破。
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/courses"
                  className="px-8 py-4 bg-white text-primary-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
                >
                  浏览全部课程
                </Link>
                <Link
                  href="/register?role=instructor"
                  className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors text-center"
                >
                  成为讲师
                </Link>
              </div>
              
              <div className="mt-10 flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary-200" />
                  <span className="text-sm text-primary-100">10,000+ 学员</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-primary-200" />
                  <span className="text-sm text-primary-100">500+ 课程</span>
                </div>
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-primary-200" />
                  <span className="text-sm text-primary-100">100+ 讲师</span>
                </div>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="relative">
                <img
                  src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20online%20education%20platform%20hero%20image%20students%20learning%20laptop%20digital%20course&image_size=landscape_4_3"
                  alt="在线学习"
                  className="rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">完课率</p>
                      <p className="text-xl font-bold text-gray-900">92%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/courses?category_id=${cat.id}`}
                className="px-4 py-2 bg-white rounded-full text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors border"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {homeData?.personalized?.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">为您推荐</h2>
                <p className="text-gray-500 mt-1">基于您的学习历史推荐</p>
              </div>
              <Link
                href="/courses"
                className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
              >
                <span>查看更多</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {homeData.personalized.slice(0, 4).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>
      )}

      {homeData?.popular?.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">热门课程</h2>
                <p className="text-gray-500 mt-1">最受欢迎的优质课程</p>
              </div>
              <Link
                href="/courses?sort=hot"
                className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
              >
                <span>查看更多</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {homeData.popular.slice(0, 4).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>
      )}

      {homeData?.new?.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">新课程</h2>
                <p className="text-gray-500 mt-1">最新上线的课程</p>
              </div>
              <Link
                href="/courses?sort=newest"
                className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
              >
                <span>查看更多</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {homeData.new.slice(0, 4).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>
      )}

      {homeData?.top_rated?.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">好评如潮</h2>
                <p className="text-gray-500 mt-1">学员高度评价的课程</p>
              </div>
              <Link
                href="/courses?sort=rating"
                className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
              >
                <span>查看更多</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {homeData.top_rated.slice(0, 4).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            准备好开始学习了吗？
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            加入数千名学员，开始您的学习之旅。从入门到精通，我们提供完整的学习路径。
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center px-8 py-4 bg-white text-primary-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            立即开始
            <ChevronRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
}
