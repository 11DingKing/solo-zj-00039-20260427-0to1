"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  Save,
  Upload,
  Eye,
  EyeOff,
  UserCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { authApi, uploadApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";

interface ProfileForm {
  username: string;
  bio: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileForm>();

  const newPassword = watch("newPassword");

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/profile");
      return;
    }

    setValue("username", user.username || "");
    setValue("bio", user.bio || "");
    setAvatar(user.avatar || "");
    setLoading(false);
  }, [user, router, setValue]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const res = await uploadApi.uploadAvatar(file);
      setAvatar(res.data.url);

      await authApi.updateProfile({ avatar: res.data.url });
      updateUser({ user: { ...user, avatar: res.data.url } });

      alert("头像更新成功！");
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      alert("头像上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const updateData: any = {
        username: data.username,
        bio: data.bio,
      };

      if (data.newPassword) {
        updateData.password = data.newPassword;
      }

      const res = await authApi.updateProfile(updateData);
      updateUser(res);

      alert("个人信息更新成功！");
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("更新失败，请重试");
    } finally {
      setSaving(false);
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900">个人设置</h1>
          <p className="text-gray-500 mt-1">管理您的个人信息和账户设置</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3">
              <UserCircle className="w-6 h-6 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="flex-shrink-0">
                <label className="block">
                  <div className="relative group cursor-pointer">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-12 h-12 text-primary-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Upload className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                </label>
                <label
                  htmlFor="avatar-upload"
                  className="block mt-3 text-center text-sm text-primary-600 hover:text-primary-700 cursor-pointer"
                >
                  更换头像
                </label>
              </div>

              <div className="flex-1 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    用户名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("username", {
                      required: "请输入用户名",
                      minLength: {
                        value: 2,
                        message: "用户名至少2个字符",
                      },
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">邮箱地址不可修改</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    个人简介
                  </label>
                  <textarea
                    {...register("bio")}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="介绍一下自己..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    账户角色
                  </label>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        user?.role === "instructor"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {user?.role === "instructor" ? "讲师" : "学员"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center space-x-3 mb-4">
                <Settings className="w-6 h-6 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  修改密码
                </h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                如不需要修改密码，请留空以下字段
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    当前密码
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register("currentPassword")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-12"
                      placeholder="请输入当前密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新密码
                  </label>
                  <input
                    type="password"
                    {...register("newPassword", {
                      minLength: {
                        value: 6,
                        message: "密码至少6个字符",
                      },
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="请输入新密码"
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    确认新密码
                  </label>
                  <input
                    type="password"
                    {...register("confirmPassword", {
                      validate: (value) =>
                        !newPassword ||
                        value === newPassword ||
                        "两次输入的密码不一致",
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="请再次输入新密码"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>保存修改</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
