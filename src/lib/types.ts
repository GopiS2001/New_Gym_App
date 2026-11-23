export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type Ref = { id: number; name: string; slug?: string };

export type Me = {
  id: number;
  name: string;
  email: string;
  type: 'MEMBER' | 'ADMIN';
  status: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  onboarding: { onboardingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'; onboardingStep: string | null } | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: Omit<Me, 'onboarding'>;
};

// ---- Onboarding --------------------------------------------------------------

export type Option = { id: number; label: string; slug: string; description: string | null; imageUrl: string | null; allowsFreeText?: boolean };
export type Catalog = { id: number; name: string; slug: string; description: string | null; imageUrl: string | null; icon?: string | null; motivationMessage?: string | null };

export type OnboardingOptions = {
  version: number;
  goals: Catalog[];
  focusAreas: Catalog[];
  experienceLevels: (Catalog & { rank: number })[];
  equipment: Catalog[];
  equipmentGroups: (Catalog & { equipmentIds: number[] })[];
  genders: Option[];
  activities: Option[];
  motivations: Option[];
  weeklyFrequency: { value: number; label: string }[];
};

export type OnboardingAnswers = {
  genderOptionId?: number | null;
  genderCustom?: string | null;
  goalId?: number;
  activityOptionId?: number;
  focusAreaIds?: number[];
  motivationOptionIds?: number[];
  experienceLevelId?: number;
  weeklyWorkoutDays?: number;
  reminders?: { enabled: boolean; days?: number[]; time?: string; timezone?: string; permissionGranted?: boolean | null };
  equipmentIds?: number[];
  equipmentGroupIds?: number[];
  weight?: { value: number; unit: 'KG' | 'LB' } | null;
};

// ---- Catalogue ---------------------------------------------------------------

export type ExerciseType = { id: number; name: string; slug?: string; loggingFields: string[] };

export type ExerciseCard = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  imageUrl: string | null;
  difficulty: Difficulty;
  exerciseType: ExerciseType;
  categories: Ref[];
  focusAreas: Ref[];
  equipment: Ref[];
  saveCount?: number;
  isSaved?: boolean;
};

export type ExerciseDetail = ExerciseCard & {
  description: string | null;
  videoUrl: string | null;
  instructions: string[];
  tips: string[];
  commonMistakes: string[];
  safetyNotes: string | null;
  primaryMuscles: Ref[];
  secondaryMuscles: Ref[];
  goals: Ref[];
  alternatives: { id: number; name: string; slug: string; imageUrl: string | null; difficulty: Difficulty }[];
  isSaved: boolean;
  isAvailable: boolean;
};

export type SetLog = {
  id: number;
  setNumber: number;
  reps: number | null;
  weightValue: number | null;
  weightUnit: 'KG' | 'LB' | null;
  durationSeconds: number | null;
  distanceValue: number | null;
  distanceUnit: string | null;
  rpe: number | null;
  notes: string | null;
};

export type ExerciseHistory = {
  exerciseId: number;
  logs: { sessionId: number; title: string | null; date: string; notes: string | null; sets: SetLog[] }[];
  progress: { date: string; weight: number; reps: number; duration: number; volume: number }[];
};

export type ProgramExercise = {
  id: number;
  exerciseId: number;
  sortOrder: number;
  sets: number | null;
  reps: string | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  notes: string | null;
  exercise: { id: number; name: string; slug: string; imageUrl: string | null; difficulty: Difficulty; status: string; exerciseType: ExerciseType };
};

export type ProgramWorkout = {
  id: number;
  dayNumber: number;
  title: string;
  description: string | null;
  estimatedMinutes: number | null;
  exercises: ProgramExercise[];
};

export type ProgramWeek = { id: number; weekNumber: number; title: string | null; notes: string | null; workouts: ProgramWorkout[] };

export type Enrollment = {
  id: number;
  programId: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  currentWeek: number;
  currentDay: number;
  completedWorkouts: number;
  startedAt: string;
  progressPercent?: number;
};

export type ProgramCard = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  difficulty: Difficulty;
  durationWeeks: number;
  daysPerWeek: number;
  targetAudience: string | null;
  goal: Ref | null;
  coach: (Ref & { imageUrl: string | null }) | null;
  equipment: Ref[];
  enrollmentCount: number;
  isSaved?: boolean;
};

export type ProgramDetail = ProgramCard & {
  weeks: ProgramWeek[];
  totalWorkouts: number;
  isSaved: boolean;
  isAvailable: boolean;
  enrollment: Enrollment | null;
};

export type Coach = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  headline: string | null;
  bio: string | null;
  specialities: string[] | null;
  credentials: { title: string; issuer: string | null; year: number | null }[];
  experienceYears: number | null;
  programCount?: number;
  programs?: Pick<ProgramCard, 'id' | 'name' | 'slug' | 'imageUrl' | 'difficulty' | 'durationWeeks' | 'daysPerWeek'>[];
};

// ---- Workouts ------------------------------------------------------------------

export type ServerSession = {
  id: number;
  clientId: string | null;
  title: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DISCARDED';
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  program: { id: number; name: string; slug: string } | null;
  programWorkout: { id: number; title: string; dayNumber: number } | null;
  exercises: {
    id: number;
    exerciseId: number;
    sortOrder: number;
    exercise: { id: number; name: string; slug: string; imageUrl: string | null; exerciseType: ExerciseType };
    sets: SetLog[];
  }[];
};

export type ProgressSummary = {
  period: 'week' | 'month';
  workouts: number;
  activeDays: number;
  totalSets: number;
  totalVolumeKg: number;
  totalDurationSeconds: number;
  weeklyTarget: number | null;
  allTimeWorkouts: number;
  days: { date: string; workouts: number }[];
};

export type Home = {
  greeting: { name: string; avatarUrl: string | null };
  currentProgram: (Enrollment & { program: { id: number; name: string; slug: string; imageUrl: string | null; durationWeeks: number } }) | null;
  todaysWorkout: (Omit<ProgramWorkout, 'exercises'> & { exercises: { id: number; exercise: { id: number; name: string; imageUrl: string | null } }[] }) | null;
  weeklyProgress: { weekStart: string; target: number; completed: number; activeDays: string[]; weekStreak: number };
  recommendedProgram: (Pick<ProgramCard, 'id' | 'name' | 'slug' | 'imageUrl' | 'difficulty' | 'durationWeeks' | 'daysPerWeek'> & { goal: Ref | null }) | null;
  recommendedExercises: ExerciseCard[];
  recentlyViewed: { id: number; name: string; slug: string; imageUrl: string | null; difficulty: Difficulty }[];
  savedExerciseCount: number;
  motivation: string;
  isNewMember: boolean;
};

export type Profile = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  heightCm: number | null;
  preferredWeightUnit: 'KG' | 'LB';
  preferredDistanceUnit: 'KM' | 'MI';
  timezone: string;
  gender: Option | null;
  genderCustom: string | null;
  preferredActivity: Option | null;
  experienceLevel: (Catalog & { rank: number }) | null;
  weeklyWorkoutDays: number | null;
  onboardingStatus: string;
  goal: Catalog | null;
  focusAreas: Catalog[];
  motivations: Option[];
  equipment: Catalog[];
  latestWeight: { value: number; unit: string; measuredAt: string } | null;
  reminders: { enabled: boolean; time: string | null; timezone: string; permissionAsked: boolean; permissionGranted: boolean | null; days: number[] };
};

export type Library = {
  savedExercises: (ExerciseCard & { savedAt: string; isAvailable: boolean })[];
  savedPrograms: (Pick<ProgramCard, 'id' | 'name' | 'slug' | 'imageUrl' | 'difficulty' | 'durationWeeks' | 'daysPerWeek'> & { savedAt: string; isAvailable: boolean })[];
  collections: MemberCollection[];
};

export type MemberCollection = {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  itemCount: number;
  exercises: (ExerciseCard & { isAvailable: boolean })[];
  programs: (Pick<ProgramCard, 'id' | 'name' | 'slug' | 'imageUrl' | 'difficulty' | 'durationWeeks' | 'daysPerWeek'> & { isAvailable: boolean })[];
};
