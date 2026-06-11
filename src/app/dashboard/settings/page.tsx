"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, User, Lock, Trash, Sliders } from "lucide-react";

interface ProfileFormData {
  name: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: session?.user?.name || "",
      email: session?.user?.email || "",
    },
  });
  
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>();
  
  const newPassword = watch("newPassword");
  
  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsProfileLoading(true);
    
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Failed to update profile");
      }
      
      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: data.name,
        },
      });
      
      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsProfileLoading(false);
    }
  };
  
  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsPasswordLoading(true);
    
    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Failed to update password");
      }
      
      toast.success("Password updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsPasswordLoading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    
    setIsDeleteLoading(true);
    
    try {
      const response = await fetch("/api/user", {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to delete account");
      }
      
      toast.success("Account deleted successfully");
      router.push("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
    } finally {
      setIsDeleteLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <ThemeToggle />
      </div>
      
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <div className="w-full lg:w-64">
          <div className="rounded-lg border bg-card">
            <div className="flex flex-col space-y-1 p-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "profile"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "password"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Lock className="h-4 w-4" />
                Password
              </button>
              <button
                onClick={() => setActiveTab("appearance")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "appearance"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Sun className="h-4 w-4" />
                Appearance
              </button>
              <button
                onClick={() => setActiveTab("preferences")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "preferences"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Sliders className="h-4 w-4" />
                Preferences
              </button>
              <button
                onClick={() => setActiveTab("danger")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "danger"
                    ? "bg-destructive text-destructive-foreground"
                    : "text-destructive hover:bg-destructive/10"
                }`}
              >
                <Trash className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <div className="rounded-lg border bg-card p-6">
            {activeTab === "profile" && (
              <div>
                <h2 className="mb-6 text-xl font-semibold">Profile Settings</h2>
                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-sm font-medium">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                        profileErrors.name ? "border-destructive" : ""
                      }`}
                      {...registerProfile("name", {
                        required: "Name is required",
                        maxLength: {
                          value: 50,
                          message: "Name cannot be more than 50 characters",
                        },
                      })}
                    />
                    {profileErrors.name && (
                      <p className="text-xs text-destructive">{profileErrors.name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm opacity-70"
                      disabled
                      {...registerProfile("email")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                  
                  <Button type="submit" disabled={isProfileLoading}>
                    {isProfileLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </div>
            )}
            
            {activeTab === "password" && (
              <div>
                <h2 className="mb-6 text-xl font-semibold">Change Password</h2>
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="currentPassword" className="text-sm font-medium">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                        passwordErrors.currentPassword ? "border-destructive" : ""
                      }`}
                      {...registerPassword("currentPassword", {
                        required: "Current password is required",
                      })}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="text-xs text-destructive">
                        {passwordErrors.currentPassword.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="newPassword" className="text-sm font-medium">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                        passwordErrors.newPassword ? "border-destructive" : ""
                      }`}
                      {...registerPassword("newPassword", {
                        required: "New password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                    />
                    {passwordErrors.newPassword && (
                      <p className="text-xs text-destructive">
                        {passwordErrors.newPassword.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                        passwordErrors.confirmPassword ? "border-destructive" : ""
                      }`}
                      {...registerPassword("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (value) =>
                          value === newPassword || "Passwords do not match",
                      })}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-xs text-destructive">
                        {passwordErrors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  
                  <Button type="submit" disabled={isPasswordLoading}>
                    {isPasswordLoading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </div>
            )}
            
            {activeTab === "appearance" && (
              <div>
                <h2 className="mb-6 text-xl font-semibold">Appearance</h2>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred theme
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex flex-col items-center justify-center rounded-lg border p-4 ${
                        theme === "light" ? "border-primary bg-primary/10" : ""
                      }`}
                    >
                      <Sun className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Light</span>
                    </button>
                    
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center justify-center rounded-lg border p-4 ${
                        theme === "dark" ? "border-primary bg-primary/10" : ""
                      }`}
                    >
                      <Moon className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                    
                    <button
                      onClick={() => setTheme("system")}
                      className={`flex flex-col items-center justify-center rounded-lg border p-4 ${
                        theme === "system" ? "border-primary bg-primary/10" : ""
                      }`}
                    >
                      <Laptop className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">System</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "preferences" && (
              <PreferencesSettings />
            )}
            
            {activeTab === "danger" && (
              <div>
                <h2 className="mb-6 text-xl font-semibold text-destructive">
                  Delete Account
                </h2>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. This action
                    cannot be undone. All of your bookmarks and folders will be
                    permanently deleted.
                  </p>
                  
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleteLoading}
                  >
                    {isDeleteLoading ? "Deleting..." : "Delete My Account"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferencesSettings() {
  const [prefs, setPrefs] = useState({
    defaultLandingPage: "/dashboard",
    defaultExportFormat: "json",
    compactMode: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((res) => res.json())
      .then((data) => {
        setPrefs({
          defaultLandingPage: data.defaultLandingPage || "/dashboard",
          defaultExportFormat: data.defaultExportFormat || "json",
          compactMode: Boolean(data.compactMode),
        });
        setIsLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load preferences");
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setPrefs({
        defaultLandingPage: data.defaultLandingPage || "/dashboard",
        defaultExportFormat: data.defaultExportFormat || "json",
        compactMode: Boolean(data.compactMode),
      });
      toast.success("Preferences saved successfully");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading preferences...</div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">User Preferences</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="defaultLandingPage" className="text-sm font-medium">
            Default Landing Page
          </label>
          <select
            id="defaultLandingPage"
            value={prefs.defaultLandingPage}
            onChange={(e) => setPrefs({ ...prefs, defaultLandingPage: e.target.value })}
            className="w-full rounded-md border bg-background border-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="/dashboard">Dashboard</option>
            <option value="/dashboard/bookmarks">All Bookmarks</option>
            <option value="/dashboard/folders">Folders</option>
            <option value="/dashboard/goals">Goals & Productivity</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Choose which page to show after logging in.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="defaultExportFormat" className="text-sm font-medium">
            Default Export Format
          </label>
          <select
            id="defaultExportFormat"
            value={prefs.defaultExportFormat}
            onChange={(e) => setPrefs({ ...prefs, defaultExportFormat: e.target.value })}
            className="w-full rounded-md border bg-background border-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="json">JSON Format (Backup/Restore)</option>
            <option value="csv">CSV Format (Spreadsheets)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Your preferred format in the Export Center.
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.compactMode}
              onChange={(e) => setPrefs({ ...prefs, compactMode: e.target.checked })}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4 accent-primary"
            />
            <div>
              <span className="text-sm font-medium">Enable Compact Mode</span>
              <p className="text-xs text-muted-foreground">
                Display bookmarks in a denser list layout with less padding.
              </p>
            </div>
          </label>
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </form>
    </div>
  );
} 