'use client';

import Link from 'next/link';
import { Star, Users, Clock } from 'lucide-react';

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
  progress?: number;
  status?: string;
}

const difficultyLabels: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/courses/${course.id}`}>
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
        <div className="relative">
          <img
            src={course.cover_image || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=course%20learning%20platform%20cover%20image%20modern%20education&image_size=landscape_16_9'}
            alt={course.title}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3 flex space-x-2">
            {course.category_name && (
              <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium text-gray-700">
                {course.category_name}
              </span>
            )}
            <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyColors[course.difficulty] || 'bg-gray-100 text-gray-700'}`}>
              {difficultyLabels[course.difficulty] || course.difficulty}
            </span>
          </div>
          {course.is_free && (
            <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
              免费
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
            {course.title}
          </h3>
          
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {course.description}
          </p>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{course.instructor_name}</span>
            <div className="flex items-center space-x-4">
              {course.average_rating > 0 && (
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-gray-700 font-medium">{course.average_rating.toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center space-x-1 text-gray-500">
                <Users className="w-4 h-4" />
                <span>{course.student_count}</span>
              </div>
            </div>
          </div>

          {course.progress !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">学习进度</span>
                <span className="text-primary-600 font-medium">{Math.round(course.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
