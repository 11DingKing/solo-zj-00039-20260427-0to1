'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Play, 
  BookOpen, 
  Award,
  Save,
  ArrowLeft,
  Eye,
  Upload,
  Check
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dynamic from 'next/dynamic';
import { coursesApi, uploadApi } from '../../../../../lib/api';
import { useAuth } from '../../../../../contexts/AuthContext';
import LoadingSpinner from '../../../../../components/LoadingSpinner';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

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
  chapter_id: string;
  order_index: number;
  duration: number;
  video_url: string;
  video_duration: number;
  text_content: string;
  quiz_questions: string;
}

interface QuizQuestionForm {
  id: number;
  question: string;
  options: { id: string; text: string }[];
  correct_answer: string;
}

const SortableChapterItem = ({ 
  chapter, 
  onEdit, 
  onDelete,
  expandedChapterId,
  onToggleExpand,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onReorderLessons,
  currentCourse
}: { 
  chapter: Chapter; 
  onEdit: () => void;
  onDelete: () => void;
  expandedChapterId: string | null;
  onToggleExpand: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
  onReorderLessons: (lessonIds: string[]) => void;
  currentCourse: any;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const lessonIds = chapter.lessons.map(l => l.id);
      const oldIndex = lessonIds.indexOf(active.id as string);
      const newIndex = lessonIds.indexOf(over.id as string);
      const newLessonIds = arrayMove(lessonIds, oldIndex, newIndex);
      onReorderLessons(newLessonIds);
    }
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

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl shadow-sm border mb-4">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleExpand}
            className="flex-1 text-left"
          >
            <h3 className="font-medium text-gray-900">{chapter.title}</h3>
            <p className="text-sm text-gray-500">
              {chapter.lessons.length} 课时
            </p>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddLesson}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="添加课时"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="编辑章节"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除章节"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {expandedChapterId === chapter.id && (
        <div className="px-4 pb-4 border-t">
          {chapter.lessons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无课时，点击上方 + 按钮添加
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleLessonDragEnd}
            >
              <SortableContext
                items={chapter.lessons.map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {chapter.lessons.map((lesson) => (
                    <SortableLessonItem
                      key={lesson.id}
                      lesson={lesson}
                      onEdit={() => onEditLesson(lesson)}
                      onDelete={() => onDeleteLesson(lesson.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
};

const SortableLessonItem = ({ 
  lesson, 
  onEdit, 
  onDelete 
}: { 
  lesson: Lesson; 
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const lessonTypeColors: Record<string, string> = {
    video: 'bg-blue-100 text-blue-700',
    text: 'bg-green-100 text-green-700',
    quiz: 'bg-purple-100 text-purple-700',
  };

  const lessonTypeIcons: Record<string, React.ReactNode> = {
    video: <Play className="w-4 h-4" />,
    text: <BookOpen className="w-4 h-4" />,
    quiz: <Award className="w-4 h-4" />,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className={`p-1.5 rounded ${lessonTypeColors[lesson.lesson_type]}`}>
          {lessonTypeIcons[lesson.lesson_type]}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
          {lesson.duration > 0 && (
            <p className="text-xs text-gray-500">{lesson.duration} 分钟</p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-1">
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-600 hover:bg-white rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function CourseEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [isFree, setIsFree] = useState(true);
  const [status, setStatus] = useState('draft');
  const [coverImage, setCoverImage] = useState('');

  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterDescription, setChapterDescription] = useState('');

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState<string>('');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<'video' | 'text' | 'quiz'>('video');
  const [lessonDuration, setLessonDuration] = useState(0);
  
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  
  const [textContent, setTextContent] = useState('');
  
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionForm[]>([]);

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user && user.role !== 'instructor') {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [courseRes, categoriesRes] = await Promise.all([
          coursesApi.getCourse(courseId),
          coursesApi.getCategories(),
        ]);
        
        setCourse(courseRes.data);
        setChapters(courseRes.data.chapters || []);
        setCategories(categoriesRes.data);

        setTitle(courseRes.data.title);
        setDescription(courseRes.data.description || '');
        setCategoryId(courseRes.data.category_id || '');
        setDifficulty(courseRes.data.difficulty);
        setIsFree(courseRes.data.is_free);
        setStatus(courseRes.data.status);
        setCoverImage(courseRes.data.cover_image || '');

        if (courseRes.data.chapters && courseRes.data.chapters.length > 0) {
          setExpandedChapterId(courseRes.data.chapters[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch course:', error);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchData();
    }
  }, [courseId, user, router]);

  const handleSaveCourse = async () => {
    setSaving(true);
    try {
      await coursesApi.updateCourse(courseId, {
        title,
        description,
        category_id: categoryId || undefined,
        difficulty,
        is_free: isFree,
        status,
        cover_image: coverImage,
      });
      alert('保存成功！');
    } catch (error) {
      console.error('Failed to save course:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const chapterIds = chapters.map(ch => ch.id);
      const oldIndex = chapterIds.indexOf(active.id as string);
      const newIndex = chapterIds.indexOf(over.id as string);
      const newChapters = arrayMove(chapters, oldIndex, newIndex);
      setChapters(newChapters);

      const newOrderIds = newChapters.map((ch, index) => {
        return { id: ch.id, order: index + 1 };
      });

      newOrderIds.forEach(async ({ id, order }) => {
        await coursesApi.updateChapter(id, { order_index: order });
      });
    }
  };

  const openCreateChapterModal = () => {
    setEditingChapter(null);
    setChapterTitle('');
    setChapterDescription('');
    setShowChapterModal(true);
  };

  const openEditChapterModal = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterTitle(chapter.title);
    setChapterDescription(chapter.description || '');
    setShowChapterModal(true);
  };

  const handleSaveChapter = async () => {
    if (!chapterTitle.trim()) return;

    try {
      if (editingChapter) {
        await coursesApi.updateChapter(editingChapter.id, {
          title: chapterTitle,
          description: chapterDescription,
        });
        setChapters(chapters.map(ch => 
          ch.id === editingChapter.id 
            ? { ...ch, title: chapterTitle, description: chapterDescription }
            : ch
        ));
      } else {
        const res = await coursesApi.createChapter(courseId, {
          title: chapterTitle,
          description: chapterDescription,
        });
        const newChapter: Chapter = {
          id: res.data.chapter.id,
          title: res.data.chapter.title,
          description: res.data.chapter.description,
          order_index: res.data.chapter.order_index,
          lessons: [],
        };
        setChapters([...chapters, newChapter]);
      }
      setShowChapterModal(false);
    } catch (error) {
      console.error('Failed to save chapter:', error);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('确定要删除这个章节吗？')) return;

    try {
      await coursesApi.deleteChapter(chapterId);
      setChapters(chapters.filter(ch => ch.id !== chapterId));
    } catch (error) {
      console.error('Failed to delete chapter:', error);
    }
  };

  const openCreateLessonModal = (chapterId: string) => {
    setCurrentChapterId(chapterId);
    setEditingLesson(null);
    setLessonTitle('');
    setLessonType('video');
    setLessonDuration(0);
    setVideoUrl('');
    setVideoDuration(0);
    setTextContent('');
    setQuizQuestions([]);
    setShowLessonModal(true);
  };

  const openEditLessonModal = (lesson: Lesson) => {
    setCurrentChapterId(lesson.chapter_id);
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonType(lesson.lesson_type);
    setLessonDuration(lesson.duration);
    setVideoUrl(lesson.video_url || '');
    setVideoDuration(lesson.video_duration);
    setTextContent(lesson.text_content || '');
    
    try {
      setQuizQuestions(lesson.quiz_questions ? JSON.parse(lesson.quiz_questions) : []);
    } catch {
      setQuizQuestions([]);
    }
    
    setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) return;

    try {
      const lessonData: any = {
        title: lessonTitle,
        lesson_type: lessonType,
        duration: lessonDuration,
      };

      if (lessonType === 'video') {
        lessonData.video_url = videoUrl;
        lessonData.video_duration = videoDuration;
      } else if (lessonType === 'text') {
        lessonData.text_content = textContent;
      } else if (lessonType === 'quiz') {
        lessonData.quiz_questions = JSON.stringify(quizQuestions);
      }

      if (editingLesson) {
        await coursesApi.updateLesson(editingLesson.id, lessonData);
        setChapters(chapters.map(ch => ({
          ...ch,
          lessons: ch.lessons.map(l => 
            l.id === editingLesson.id 
              ? { ...l, ...lessonData }
              : l
          ),
        })));
      } else {
        const res = await coursesApi.createLesson(currentChapterId, lessonData);
        const newLesson: Lesson = {
          id: res.data.lesson.id,
          title: res.data.lesson.title,
          lesson_type: res.data.lesson.lesson_type,
          chapter_id: currentChapterId,
          order_index: res.data.lesson.order_index,
          duration: res.data.lesson.duration,
          video_url: '',
          video_duration: 0,
          text_content: '',
          quiz_questions: '',
        };
        setChapters(chapters.map(ch => 
          ch.id === currentChapterId 
            ? { ...ch, lessons: [...ch.lessons, newLesson] }
            : ch
        ));
      }
      setShowLessonModal(false);
    } catch (error) {
      console.error('Failed to save lesson:', error);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('确定要删除这个课时吗？')) return;

    try {
      await coursesApi.deleteLesson(lessonId);
      setChapters(chapters.map(ch => ({
        ...ch,
        lessons: ch.lessons.filter(l => l.id !== lessonId),
      })));
    } catch (error) {
      console.error('Failed to delete lesson:', error);
    }
  };

  const handleReorderLessons = async (chapterId: string, lessonIds: string[]) => {
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (!chapter) return;

    const orderedLessons: Lesson[] = [];
    lessonIds.forEach((id, index) => {
      const lesson = chapter.lessons.find(l => l.id === id);
      if (lesson) {
        orderedLessons.push({ ...lesson, order_index: index + 1 });
      }
    });

    setChapters(chapters.map(ch => 
      ch.id === chapterId 
        ? { ...ch, lessons: orderedLessons }
        : ch
    ));

    await coursesApi.reorderLessons(lessonIds);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    try {
      const res = await uploadApi.uploadVideo(file);
      setVideoUrl(res.data.url);
      alert('视频上传成功！');
    } catch (error) {
      console.error('Failed to upload video:', error);
      alert('视频上传失败');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const res = await uploadApi.uploadCover(file);
      setCoverImage(res.data.url);
    } catch (error) {
      console.error('Failed to upload cover:', error);
      alert('封面上传失败');
    } finally {
      setUploadingCover(false);
    }
  };

  const addQuizQuestion = () => {
    const newQuestion: QuizQuestionForm = {
      id: Date.now(),
      question: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      correct_answer: 'A',
    };
    setQuizQuestions([...quizQuestions, newQuestion]);
  };

  const removeQuizQuestion = (questionId: number) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== questionId));
  };

  const updateQuizQuestion = (questionId: number, field: string, value: any) => {
    setQuizQuestions(quizQuestions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const updateQuizOption = (questionId: number, optionId: string, text: string) => {
    setQuizQuestions(quizQuestions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: q.options.map(o => 
              o.id === optionId ? { ...o, text } : o
            ) 
          } 
        : q
    ));
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
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/instructor')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回工作台</span>
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">编辑课程</h1>
                <p className="text-sm text-gray-500">{title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href={`/courses/${courseId}`}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>预览</span>
              </Link>
              <button
                onClick={handleSaveCourse}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>保存</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">课程基本信息</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    课程标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    课程分类
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">请选择分类</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    难度等级
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="beginner">入门</option>
                    <option value="intermediate">进阶</option>
                    <option value="advanced">高级</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    课程状态
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">免费课程</span>
                  <button
                    onClick={() => setIsFree(!isFree)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isFree ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isFree ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    课程封面
                  </label>
                  {coverImage ? (
                    <div className="relative">
                      <img
                        src={`http://localhost:5000${coverImage}`}
                        alt="Cover"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setCoverImage('')}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                      {uploadingCover ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">上传封面图片</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    课程描述
                  </label>
                  <ReactQuill
                    theme="snow"
                    value={description}
                    onChange={setDescription}
                    className="h-48"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">课程章节</h2>
              <button
                onClick={openCreateChapterModal}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>添加章节</span>
              </button>
            </div>

            {chapters.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有章节</h3>
                <p className="text-gray-500 mb-6">添加章节来组织您的课程内容</p>
                <button
                  onClick={openCreateChapterModal}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>添加章节</span>
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleChapterDragEnd}
              >
                <SortableContext
                  items={chapters.map(ch => ch.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {chapters.map((chapter) => (
                    <SortableChapterItem
                      key={chapter.id}
                      chapter={chapter}
                      onEdit={() => openEditChapterModal(chapter)}
                      onDelete={() => handleDeleteChapter(chapter.id)}
                      expandedChapterId={expandedChapterId}
                      onToggleExpand={() => setExpandedChapterId(
                        expandedChapterId === chapter.id ? null : chapter.id
                      )}
                      onAddLesson={() => openCreateLessonModal(chapter.id)}
                      onEditLesson={openEditLessonModal}
                      onDeleteLesson={handleDeleteLesson}
                      onReorderLessons={(lessonIds) => handleReorderLessons(chapter.id, lessonIds)}
                      currentCourse={course}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {showChapterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingChapter ? '编辑章节' : '添加章节'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  章节标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入章节标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  章节描述
                </label>
                <textarea
                  value={chapterDescription}
                  onChange={(e) => setChapterDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="请输入章节描述（可选）"
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => setShowChapterModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleSaveChapter}
                disabled={!chapterTitle.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingLesson ? '编辑课时' : '添加课时'}
              </h2>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  课时标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入课时标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  课时类型
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['video', 'text', 'quiz'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setLessonType(type)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        lessonType === type
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`flex items-center justify-center mb-1 ${
                        lessonType === type ? 'text-primary-600' : 'text-gray-400'
                      }`}>
                        {type === 'video' ? <Play className="w-6 h-6" /> : 
                         type === 'text' ? <BookOpen className="w-6 h-6" /> : 
                         <Award className="w-6 h-6" />}
                      </div>
                      <span className={`text-sm font-medium ${
                        lessonType === type ? 'text-primary-600' : 'text-gray-600'
                      }`}>
                        {type === 'video' ? '视频课时' : 
                         type === 'text' ? '图文课时' : '测验课时'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预计时长（分钟）
                </label>
                <input
                  type="number"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {lessonType === 'video' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      上传视频
                    </label>
                    {videoUrl ? (
                      <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700">视频已上传</span>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                        {uploadingVideo ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">点击上传视频</span>
                            <span className="text-xs text-gray-400 mt-1">支持 MP4, WebM, MOV 格式</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      视频时长（秒）
                    </label>
                    <input
                      type="number"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {lessonType === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    图文内容
                  </label>
                  <ReactQuill
                    theme="snow"
                    value={textContent}
                    onChange={setTextContent}
                    className="h-64"
                  />
                </div>
              )}

              {lessonType === 'quiz' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">测验题目</span>
                    <button
                      onClick={addQuizQuestion}
                      className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>添加题目</span>
                    </button>
                  </div>

                  {quizQuestions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                      <Award className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p>点击上方按钮添加测验题目</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {quizQuestions.map((question, index) => (
                        <div key={question.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <span className="font-medium text-gray-900">
                              题目 {index + 1}
                            </span>
                            <button
                              onClick={() => removeQuizQuestion(question.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <input
                            type="text"
                            value={question.question}
                            onChange={(e) => updateQuizQuestion(question.id, 'question', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="请输入题目内容"
                          />

                          <div className="space-y-2 mb-3">
                            {question.options.map((option) => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correct_answer === option.id}
                                  onChange={() => updateQuizQuestion(question.id, 'correct_answer', option.id)}
                                  className="w-4 h-4"
                                />
                                <span className="font-medium text-gray-700 w-6">{option.id}.</span>
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => updateQuizOption(question.id, option.id, e.target.value)}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                                  placeholder={`选项 ${option.id}`}
                                />
                              </div>
                            ))}
                          </div>

                          <p className="text-xs text-gray-500">
                            提示：单选按钮选择正确答案
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => setShowLessonModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleSaveLesson}
                disabled={!lessonTitle.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
