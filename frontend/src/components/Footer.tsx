'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <BookOpen className="w-8 h-8 text-primary-400" />
              <span className="text-xl font-bold text-white">CourseHub</span>
            </Link>
            <p className="text-gray-400 max-w-md">
              CourseHub 是一个现代化的在线学习平台，提供丰富的课程资源，帮助你实现技能提升和职业发展。
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">平台</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/courses" className="hover:text-white transition-colors">
                  全部课程
                </Link>
              </li>
              <li>
                <Link href="/register?role=instructor" className="hover:text-white transition-colors">
                  成为讲师
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">帮助</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  使用帮助
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  联系我们
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            2026 CourseHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
