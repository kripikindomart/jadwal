import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Auth routes
    {
      path: "/login",
      name: "login",
      component: () => import("@/pages/auth/LoginPage.vue"),
      meta: { layout: "auth", guest: true },
    },

    // Dashboard
    {
      path: "/",
      name: "dashboard",
      component: () => import("@/pages/dashboard/DashboardPage.vue"),
      meta: { layout: "admin" },
    },

    // Users & ACL
    {
      path: "/users",
      name: "users",
      component: () => import("@/pages/users/UsersListPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/users/create",
      name: "users.create",
      component: () => import("@/pages/users/UserFormPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/users/:id/edit",
      name: "users.edit",
      component: () => import("@/pages/users/UserFormPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/users/roles",
      name: "roles",
      component: () => import("@/pages/users/RolesListPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/users/roles/create",
      name: "roles.create",
      component: () => import("@/pages/users/RoleFormPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/users/roles/:id/edit",
      name: "roles.edit",
      component: () => import("@/pages/users/RoleFormPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/users/permissions",
      name: "permissions",
      component: () => import("@/pages/users/PermissionsPage.vue"),
      meta: { layout: "admin" },
    },

    // Academic Master Data
    {
      path: "/semesters",
      name: "semesters",
      component: () => import("@/pages/academic/SemesterPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/prodis",
      name: "prodis",
      component: () => import("@/pages/academic/ProdiPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/courses",
      name: "courses",
      component: () => import("@/pages/academic/CoursePage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/rooms",
      name: "rooms",
      component: () => import("@/pages/academic/RoomPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/timeslots",
      name: "timeslots",
      component: () => import("@/pages/academic/TimeslotPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/grade-components",
      name: "grade.components",
      component: () => import("@/pages/academic/GradeComponentPage.vue"),
      meta: { layout: "admin" },
    },

    // Classes & Schedules
    {
      path: "/classes",
      name: "classes",
      component: () => import("@/pages/academic/ClassPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/classes/:id",
      name: "classes.detail",
      component: () => import("@/pages/academic/ClassDetailPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/schedules",
      name: "schedules",
      component: () => import("@/pages/academic/SchedulePage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/my-schedule",
      name: "my-schedule",
      component: () => import("@/pages/academic/MySchedulePage.vue"),
      meta: { layout: "admin" },
    },

    // Lecturers & Students
    {
      path: "/lecturers",
      name: "lecturers",
      component: () => import("@/pages/lecturers/LecturerPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/students",
      name: "students",
      component: () => import("@/pages/students/StudentPage.vue"),
      meta: { layout: "admin" },
    },

    // Surveys / EDOM
    {
      path: "/survey/s/:hash",
      name: "surveys.public",
      component: () => import("@/pages/surveys/PublicSurveyPage.vue"),
      meta: { public: true, layout: "blank" },
    },
    {
      path: "/survey/s/:hash/results",
      name: "surveys.public.results",
      component: () => import("@/pages/surveys/PublicSurveyResultsPage.vue"),
      meta: { public: true, layout: "blank" },
    },
    {
      path: "/surveys",
      name: "surveys",
      component: () => import("@/pages/surveys/SurveyListPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/surveys/my-pending",
      name: "surveys.my-pending",
      component: () => import("@/pages/surveys/MyPendingSurveysPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/surveys/:id/builder",
      name: "surveys.builder",
      component: () => import("@/pages/surveys/SurveyBuilderPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/surveys/:id/results",
      name: "surveys.results",
      component: () => import("@/pages/surveys/SurveyResultsPage.vue"),
      meta: { layout: "admin" },
    },
    {
      path: "/surveys/:instrumentId/fill/:classCourseId/:lecturerId",
      name: "surveys.fill",
      component: () => import("@/pages/surveys/SurveyFormPage.vue"),
      meta: { layout: "admin" },
    },

    {
      path: "/survey-portal",
      name: "survey.portal.home",
      component: () => import("@/pages/surveys/SurveyPortalHome.vue"),
      meta: { public: true, layout: "blank" },
    },
    // Catch all
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

// Navigation guard
router.beforeEach(async (to, _from, next) => {
  const isSurveyPortal = import.meta.env.VITE_IS_SURVEY_PORTAL === "true";

  // If we are on the dedicated survey portal, block all non-public routes
  if (isSurveyPortal && !to.meta.public) {
    return next({ name: "survey.portal.home" });
  }

  const authStore = useAuthStore();

  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchProfile();
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    return next({ name: "dashboard" });
  }

  if (!to.meta.public && !to.meta.guest && !authStore.isAuthenticated) {
    return next({ name: "login" });
  }

  next();
});

export default router;
