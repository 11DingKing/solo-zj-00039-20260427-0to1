'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Award, 
  Download, 
  Calendar, 
  User,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { certificatesApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Certificate {
  id: string;
  certificate_number: string;
  course_id: string;
  course_title: string;
  instructor_name: string;
  student_name: string;
  issue_date: string;
  cover_image: string | null;
}

export default function CertificatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/certificates');
      return;
    }

    const fetchCertificates = async () => {
      try {
        const res = await certificatesApi.getMyCertificates();
        setCertificates(res.data.certificates);
      } catch (error) {
        console.error('Failed to fetch certificates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [user, router]);

  const drawCertificate = (cert: Certificate) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 600;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(0.5, '#e0f2fe');
    gradient.addColorStop(1, '#f0f9ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, width - 70, height - 70);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('结业证书', width / 2, 120);

    ctx.fillStyle = '#64748b';
    ctx.font = '16px Arial';
    ctx.fillText('CERTIFICATE OF COMPLETION', width / 2, 150);

    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 150, 180);
    ctx.lineTo(width / 2 + 150, 180);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '18px Arial';
    ctx.fillText('兹证明', width / 2, 230);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(cert.student_name, width / 2, 290);

    ctx.fillStyle = '#475569';
    ctx.font = '18px Arial';
    ctx.fillText('已完成课程', width / 2, 340);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(cert.course_title, width / 2, 380);

    ctx.fillStyle = '#64748b';
    ctx.font = '16px Arial';
    ctx.fillText(`授课讲师：${cert.instructor_name}`, width / 2, 420);

    const issueDate = new Date(cert.issue_date);
    const dateStr = issueDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    ctx.fillStyle = '#475569';
    ctx.font = '16px Arial';
    ctx.fillText(`颁发日期：${dateStr}`, width / 2, 470);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Arial';
    ctx.fillText(`证书编号：${cert.certificate_number}`, width / 2, 520);

    ctx.fillStyle = '#78716c';
    ctx.font = 'italic 14px Arial';
    ctx.fillText('CourseHub 在线学习平台', width / 2, 560);
  };

  useEffect(() => {
    if (selectedCert) {
      setTimeout(() => drawCertificate(selectedCert), 50);
    }
  }, [selectedCert]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `certificate-${selectedCert?.certificate_number}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900">我的证书</h1>
          <p className="text-gray-500 mt-1">查看和下载您获得的结业证书</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {certificates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">还没有证书</h3>
            <p className="text-gray-500 mb-6">
              完成课程后即可获得结业证书
            </p>
            <Link
              href="/my-courses"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              <span>查看我的课程</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">证书列表</h2>
              <div className="space-y-4">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    onClick={() => setSelectedCert(cert)}
                    className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all ${
                      selectedCert?.id === cert.id
                        ? 'border-primary-500 ring-2 ring-primary-200'
                        : 'hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-8 h-8 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {cert.course_title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          讲师：{cert.instructor_name}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(cert.issue_date).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{cert.student_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">证书预览</h2>
              {selectedCert ? (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        证书编号：{selectedCert.certificate_number}
                      </span>
                      <button
                        onClick={handleDownload}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载证书</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={600}
                      className="w-full border rounded-lg shadow certificate-canvas"
                    />
                  </div>
                  <div className="p-4 bg-gray-50 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        完成时间：{new Date(selectedCert.issue_date).toLocaleDateString('zh-CN')}
                      </span>
                      <Link
                        href={`/courses/${selectedCert.course_id}`}
                        className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                      >
                        <span>查看课程</span>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">选择左侧证书查看详情</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
