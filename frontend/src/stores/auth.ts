import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/lib/api";

interface UserInfo {
  id: number;
  name: string;
  email: string;
  roles: { id: number; name: string; slug: string; permissions: string[] }[];
}

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(localStorage.getItem("accessToken"));
  const refreshToken = ref<string | null>(localStorage.getItem("refreshToken"));
  const user = ref<UserInfo | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!accessToken.value);
  const userRoles = computed(() => user.value?.roles?.map((r) => r.slug) || []);
  const userPermissions = computed(() => {
    if (!user.value?.roles) return [];
    const perms = new Set<string>();
    user.value.roles.forEach((r) => {
      if (r.permissions) r.permissions.forEach((p) => perms.add(p));
    });
    return Array.from(perms);
  });

  function setTokens(access: string, refresh: string) {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  }

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setTokens(data.accessToken, data.refreshToken);
      user.value = data.user;
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchProfile() {
    try {
      const { data } = await api.get("/auth/profile");
      user.value = data;
    } catch {
      logout();
    }
  }

  function logout() {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  function hasRole(role: string) {
    return userRoles.value.includes(role);
  }

  function hasAnyRole(roles: string[]) {
    return roles.some((r) => userRoles.value.includes(r));
  }

  function hasPermission(permission: string) {
    if (userRoles.value.includes("superadmin")) return true;
    return userPermissions.value.includes(permission);
  }

  function hasAnyPermission(permissions: string[]) {
    if (userRoles.value.includes("superadmin")) return true;
    return permissions.some((p) => userPermissions.value.includes(p));
  }

  return {
    accessToken,
    refreshToken,
    user,
    loading,
    isAuthenticated,
    userRoles,
    setTokens,
    login,
    fetchProfile,
    logout,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
  };
});
