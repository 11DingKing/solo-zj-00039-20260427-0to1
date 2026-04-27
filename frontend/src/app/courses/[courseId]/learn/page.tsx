'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { 
  Play, 
  Pause, 
  Check, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  BookOpen,
  Award,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { coursesApi, progressApi, certificatesApi } from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import parse from 'html-react-parser';

interface Chapter {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  lesson_type: 'video' | 'text' | 'quiz';
  chapter_id: string;
  course_id: string;
  order_index: number;
  duration: number;
  video_url: string;
  video_duration: number;
  text_content: string;
  quiz_questions: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: { id: string; text: string }[];
  correct_answer: string;
}

interface ProgressMap {
  [lessonId: string]: {
    is_completed: boolean;
    video_progress: number;
    text_read: boolean;
    quiz_score: number;
  };
}

export default function LearnPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const courseId = params.courseId as string;
  const lessonIdFromQuery = searchParams.get('lesson');

  const [course, setCourse] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; total: number } | null>(null);

  const [showCertificate, setShowCertificate] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const allLessons = chapters.flatMap(ch => ch.lessons);
  const currentLessonIndex = allLessons.findIndex(l => l.id === currentLesson?.id);
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, enrollmentRes, progressRes] = await Promise.all([
          coursesApi.getCourse(courseId),
          progressApi.getEnrollment(courseId),
          progressApi.getAllProgress(courseId),
        ]);
        
        setCourse(courseRes.data);
        setChapters(courseRes.data.chapters);
        setEnrollment(enrollmentRes.data);
        setProgressMap(progressRes.data.progress_map);

        if (courseRes.data.chapters.length > 0) {
          setExpandedChapters(new Set([courseRes.data.chapters[0].id]));
        }

        if (lessonIdFromQuery) {
          const lesson = courseRes.data.chapters
            .flatMap((ch: Chapter) => ch.lessons)
            .find((l: Lesson) => l.id === lessonIdFromQuery);
          if (lesson) {
            setCurrentLesson(lesson);
          }
        } else {
          const firstLesson = courseRes.data.chapters[0]?.lessons[0];
          if (firstLesson) {
            setCurrentLesson(firstLesson);
            router.replace(`/courses/${courseId}/learn?lesson=${firstLesson.id}`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch course data:', error);
        router.push(`/courses/${courseId}`);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchData();
    }

    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    };
  }, [courseId, lessonIdFromQuery, router]);

  useEffect(() => {
    if (currentLesson && enrollment?.progress >= 100 && !showCertificate) {
      checkCertificate();
    }
  }, [currentLesson, enrollment]);

  const checkCertificate = async () => {
    try {
      const res = await certificatesApi.getMyCertificates();
      const courseCert = res.data.certificates.find((c: any) => c.course_id === courseId);
      if (courseCert) {
        setCertificate(courseCert);
      }
    } catch (error) {
      console.error('Failed to check certificate:', error);
    }
  };

  useEffect(() => {
    if (currentLesson?.id === lessonIdFromQuery) {
      const progress = progressMap[currentLesson.id];
      if (progress) {
        setVideoProgress(progress.video_progress || 0);
        setQuizSubmitted(progress.quiz_score !== null);
        if (progress.quiz_score !== null && progress.quiz_total !== null) {
          setQuizResult({ score: progress.quiz_score, total: progress.quiz_total });
        }
      } else {
        setVideoProgress(0);
        setQuizSubmitted(false);
        setQuizResult(null);
        setQuizAnswers({});
      }
    }
  }, [currentLesson?.id, progressMap, lessonIdFromQuery]);

  useEffect(() => {
    if (currentLesson?.lesson_type === 'video' && videoRef.current && videoProgress > 0) {
      const video = videoRef.current;
      const targetTime = (videoProgress / 100) * video.duration;
      if (!isNaN(targetTime) && targetTime > 0) {
        video.currentTime = targetTime;
      }
    }
  }, [currentLesson?.lesson_type, videoProgress]);

  const handleVideoPlay = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    video.play();
    setIsVideoPlaying(true);

    progressUpdateInterval.current = setInterval(async () => {
      if (video.duration && video.currentTime) {
        const progress = (video.currentTime / video.duration) * 100;
        setVideoProgress(progress);
        
        await progressApi.updateVideoProgress(currentLesson!.id, {
          progress,
          total_duration: video.duration,
        });

        if (progress >= 90) {
          refreshProgress();
        }
      }
    }, 5000);
  };

  const handleVideoPause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
    }
  };

  const refreshProgress = async () => {
    try {
      const [progressRes, enrollmentRes] = await Promise.all([
        progressApi.getAllProgress(courseId),
        progressApi.getEnrollment(courseId),
      ]);
      setProgressMap(progressRes.data.progress_map);
      setEnrollment(enrollmentRes.data);
    } catch (error) {
      console.error('Failed to refresh progress:', error);
    }
  };

  const handleMarkTextRead = async () => {
    try {
      await progressApi.markTextRead(currentLesson!.id);
      await refreshProgress();
    } catch (error) {
      console.error('Failed to mark text read:', error);
    }
  };

  const handleQuizSubmit = async () => {
    try {
      const res = await progressApi.submitQuiz(currentLesson!.id, {
        answers: quizAnswers,
      });
      setQuizResult(res.data.result);
      setQuizSubmitted(true);
      await refreshProgress();
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  const handleGenerateCertificate = async () => {
    try {
      const res = await certificatesApi.generate(courseId);
      setCertificate(res.data.certificate);
      setShowCertificate(true);
    } catch (error) {
      console.error('Failed to generate certificate:', error);
    }
  };

  const goToLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    router.push(`/courses/${courseId}/learn?lesson=${lesson.id}`);
    window.scrollTo(0, 0);
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
    if (!progress) return 'not_started';
    if (progress.is_completed) return 'completed';
    if (progress.video_progress > 0 || progress.text_read) return 'in_progress';
    return 'not_started';
  };

  const getQuizQuestions = (): QuizQuestion[] => {
    if (!currentLesson?.quiz_questions) return [];
    try {
      return JSON.parse(currentLesson.quiz_questions);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">课程暂无课时</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/courses/${courseId}`)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">返回课程</span>
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="font-semibold text-gray-900">{course?.title}</h1>
                <p className="text-sm text-gray-500">
                  进度：{Math.round(enrollment?.progress || 0)}%
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {enrollment?.progress >= 100 && (
                <button
                  onClick={() => setShowCertificate(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  领取证书
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    currentLesson.lesson_type === 'video'
                      ? 'bg-blue-100 text-blue-700'
                      : currentLesson.lesson_type === 'text'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {currentLesson.lesson_type === 'video' ? '视频' : currentLesson.lesson_type === 'text' ? '图文' : '测验'}
                  </span>
                  {getLessonStatus(currentLesson.id) === 'completed' && (
                    <span className="flex items-center space-x-1 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>已完成</span>
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{currentLesson.title}</h2>
              </div>

              <div className="p-6">
                {currentLesson.lesson_type === 'video' && (
                  <div className="space-y-6">
                    <div className="video-player relative">
                      <video
                        ref={videoRef}
                        src={`http://localhost:5000${currentLesson.video_url}`}
                        className="w-full"
                        controls
                        onPlay={handleVideoPlay}
                        onPause={handleVideoPause}
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">播放进度</span>
                        <span className="font-medium text-primary-600">{Math.round(videoProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(videoProgress, 100)}%` }}
                        />
                      </div>
                      {videoProgress >= 90 && (
                        <p className="text-sm text-green-600 mt-2 flex items-center space-x-1">
                          <Check className="w-4 h-4" />
                          <span>播放进度已达标 (90%+)</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {currentLesson.lesson_type === 'text' && (
                  <div className="space-y-6">
                    <div className="prose max-w-none">
                      {currentLesson.text_content ? parse(currentLesson.text_content) : (
                        <p className="text-gray-500">暂无内容</p>
                      )}
                    </div>
                    
                    {getLessonStatus(currentLesson.id) !== 'completed' && (
                      <button
                        onClick={handleMarkTextRead}
                        className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                      >
                        标记为已读
                      </button>
                    )}
                  </div>
                )}

                {currentLesson.lesson_type === 'quiz' && (
                  <div className="space-y-6">
                    {getQuizQuestions().map((question, index) => {
                      const userAnswer = quizAnswers[String(question.id)];
                      const isCorrect = userAnswer === question.correct_answer;
                      
                      return (
                        <div key={question.id} className="border rounded-lg p-4">
                          <h3 className="font-medium text-gray-900 mb-4">
                            {index + 1}. {question.question}
                          </h3>
                          <div className="space-y-2">
                            {question.options.map((option) => {
                              const isSelected = userAnswer === option.id;
                              const showResult = quizSubmitted;
                              const isOptionCorrect = option.id === question.correct_answer;
                              
                              let optionClasses = 'p-3 border rounded-lg cursor-pointer transition-colors ';
                              if (showResult) {
                                if (isOptionCorrect) {
                                  optionClasses += 'bg-green-50 border-green-300';
                                } else if (isSelected && !isCorrect) {
                                  optionClasses += 'bg-red-50 border-red-300';
                                } else {
                                  optionClasses += 'bg-gray-50 border-gray-200';
                                }
                              } else {
                                if (isSelected) {
                                  optionClasses += 'bg-primary-50 border-primary-300';
                                } else {
                                  optionClasses += 'hover:bg-gray-50';
                                }
                              }

                              return (
                                <label
                                  key={option.id}
                                  className={optionClasses}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={option.id}
                                    checked={isSelected}
                                    onChange={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [String(question.id)]: option.id }))}
                                    disabled={quizSubmitted}
                                    className="mr-3"
                                  />
                                  <span className={showResult && isOptionCorrect ? 'font-medium' : ''}>
                                    {option.text}
                                    {showResult && isOptionCorrect && (
                                      <span className="ml-2 text-green-600 text-sm">(正确答案)</span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {!quizSubmitted ? (
                      <button
                        onClick={handleQuizSubmit}
                        disabled={Object.keys(quizAnswers).length < getQuizQuestions().length}
                        className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        提交测验
                      </button>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                          <Award className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">
                          测验完成
                        </p>
                        <p className="text-2xl font-bold text-primary-600">
                          {quizResult?.score} / {quizResult?.total} 分
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          正确率：{quizResult && quizResult.total > 0 ? Math.round((quizResult.score / quizResult.total) * 100) : 0}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  {prevLesson ? (
                    <button
                      onClick={() => goToLesson(prevLesson)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span className="text-sm font-medium">{prevLesson.title}</span>
                    </button>
                  ) : (
                    <div />
                  )}
                  
                  {nextLesson ? (
                    <button
                      onClick={() => goToLesson(nextLesson)}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <span className="text-sm font-medium">下一课</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : enrollment?.progress >= 100 ? (
                    <button
                      onClick={() => setShowCertificate(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Award className="w-4 h-4" />
                      <span className="text-sm font-medium">领取证书</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border sticky top-20">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">课程目录</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {enrollment?.completed_lessons || 0} / {allLessons.length} 课时完成
                </p>
              </div>
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {chapters.map((chapter) => (
                  <div key={chapter.id} className="border-b last:border-0">
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 text-left">
                          {chapter.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {chapter.lessons.filter(l => getLessonStatus(l.id) === 'completed').length}/{chapter.lessons.length}
                      </span>
                    </button>
                    
                    {expandedChapters.has(chapter.id) && (
                      <div className="bg-gray-50">
                        {chapter.lessons.map((lesson) => {
                          const status = getLessonStatus(lesson.id);
                          const isActive = lesson.id === currentLesson?.id;
                          
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => goToLesson(lesson)}
                              className={`w-full px-4 py-3 flex items-center space-x-3 text-left transition-colors ${
                                isActive
                                  ? 'bg-primary-50 border-l-2 border-primary-600'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                status === 'completed'
                                  ? 'bg-green-100'
                                  : isActive
                                  ? 'bg-primary-100'
                                  : 'bg-gray-100'
                              }`}>
                                {status === 'completed' ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <span className={`text-xs font-medium ${
                                    isActive ? 'text-primary-600' : 'text-gray-400'
                                  }`}>
                                    {lesson.lesson_type === 'video' ? '▶' : lesson.lesson_type === 'text' ? '▣' : '◉'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${
                                  isActive ? 'font-medium text-primary-600' : 'text-gray-700'
                                }`}>
                                  {lesson.title}
                                </p>
                              </div>
                              {status === 'completed' && (
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                              )}
                            </button>
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

      {showCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">结业证书</h3>
            </div>
            <div className="p-6">
              {certificate ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-primary-50 to-blue-50 p-8 rounded-xl text-center border-2 border-primary-200">
                    <div className="mb-4">
                      <Award className="w-16 h-16 text-primary-600 mx-auto" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">结业证书</h2>
                    <p className="text-gray-600 mb-6">Certificate of Completion</p>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">学员</p>
                        <p className="text-xl font-semibold text-gray-900">{certificate.student_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">已完成课程</p>
                        <p className="text-lg font-medium text-primary-600">{certificate.course_title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">颁发日期</p>
                        <p className="text-gray-900">
                          {new Date(certificate.issue_date).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">证书编号</p>
                        <p className="text-gray-700 font-mono text-sm">{certificate.certificate_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowCertificate(false)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      关闭
                    </button>
                    <Link
                      href="/certificates"
                      className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors text-center"
                    >
                      查看我的证书
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    恭喜您完成本课程！
                  </h3>
                  <p className="text-gray-500 mb-6">
                    您已完成所有课时，可以领取结业证书了
                  </p>
                  <button
                    onClick={handleGenerateCertificate}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    生成证书
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
