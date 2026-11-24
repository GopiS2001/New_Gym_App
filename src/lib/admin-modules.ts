import type { IconName } from '@/components/ui';
import type { MediaFolder } from './admin';

export type FieldType =
  | 'text'
  | 'multiline'
  | 'number'
  | 'difficulty'
  | 'select' // single id from `source`
  | 'multi' // id list from `source`
  | 'lines' // string list, one item per line
  | 'image'
  | 'video'
  | 'switch';

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** Admin endpoint for select / multi options, e.g. 'exercise-categories'. */
  source?: string;
  min?: number;
  max?: number;
};

export type AdminModule = {
  key: string;
  /** Admin API path: /admin/<path> */
  path: string;
  title: string;
  singular: string;
  icon: IconName;
  folder: MediaFolder;
  fields: Field[];
  /** Turns a detail response into form values (ids for relations). */
  toForm: (d: any) => Record<string, unknown>;
  /** Second line on the list row. */
  subtitle: (r: any) => string;
  /** Extra list-row toggle besides Published (e.g. Featured). */
  extraToggle?: { key: string; label: string };
  /** Shown on the form: what still needs the web dashboard. */
  dashboardNote?: string;
};

const ids = (list?: { id: number }[] | null) => (list ?? []).map((x) => x.id);
const cap = (s?: string) => (s ? s[0] + s.slice(1).toLowerCase() : '');

const DIFFICULTY: Field = { key: 'difficulty', label: 'Difficulty', type: 'difficulty' };

export const ADMIN_MODULES: AdminModule[] = [
  {
    key: 'exercises',
    path: 'exercises',
    title: 'Exercises',
    singular: 'exercise',
    icon: 'barbell',
    folder: 'exercises',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Barbell Bench Press' },
      { key: 'imageUrl', label: 'Image', type: 'image' },
      { key: 'videoUrl', label: 'Video', type: 'video', hint: 'Shown on the exercise page and as a looping demo during workouts.' },
      { key: 'shortDescription', label: 'Short description', type: 'text' },
      { key: 'description', label: 'Description', type: 'multiline' },
      { key: 'exerciseTypeId', label: 'Exercise type', type: 'select', source: 'exercise-types', required: true },
      DIFFICULTY,
      { key: 'categoryIds', label: 'Categories', type: 'multi', source: 'exercise-categories' },
      { key: 'focusAreaIds', label: 'Focus areas', type: 'multi', source: 'focus-areas' },
      { key: 'primaryMuscleIds', label: 'Primary muscles', type: 'multi', source: 'muscles' },
      { key: 'secondaryMuscleIds', label: 'Secondary muscles', type: 'multi', source: 'muscles' },
      { key: 'equipmentIds', label: 'Equipment', type: 'multi', source: 'equipment' },
      { key: 'goalIds', label: 'Goals', type: 'multi', source: 'goals' },
      { key: 'instructions', label: 'Instructions', type: 'lines', hint: 'One step per line.' },
      { key: 'tips', label: 'Tips', type: 'lines', hint: 'One tip per line.' },
      { key: 'commonMistakes', label: 'Common mistakes', type: 'lines', hint: 'One per line.' },
      { key: 'safetyNotes', label: 'Safety notes', type: 'multiline' },
    ],
    toForm: (d) => ({
      name: d.name,
      imageUrl: d.imageUrl,
      videoUrl: d.videoUrl,
      shortDescription: d.shortDescription,
      description: d.description,
      exerciseTypeId: d.exerciseType?.id,
      difficulty: d.difficulty,
      categoryIds: ids(d.categories),
      focusAreaIds: ids(d.focusAreas),
      primaryMuscleIds: ids(d.primaryMuscles),
      secondaryMuscleIds: ids(d.secondaryMuscles),
      equipmentIds: ids(d.equipment),
      goalIds: ids(d.goals),
      instructions: d.instructions ?? [],
      tips: d.tips ?? [],
      commonMistakes: d.commonMistakes ?? [],
      safetyNotes: d.safetyNotes,
    }),
    subtitle: (r) => [r.exerciseType?.name, cap(r.difficulty), r.categories?.map((c: any) => c.name).join(', ')].filter(Boolean).join(' · '),
  },
  {
    key: 'programs',
    path: 'programs',
    title: 'Programs',
    singular: 'program',
    icon: 'calendar',
    folder: 'programs',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'imageUrl', label: 'Cover image', type: 'image' },
      { key: 'shortDescription', label: 'Short description', type: 'text' },
      { key: 'description', label: 'Description', type: 'multiline' },
      { key: 'goalId', label: 'Goal', type: 'select', source: 'goals' },
      { key: 'coachId', label: 'Coach', type: 'select', source: 'coaches' },
      DIFFICULTY,
      { key: 'durationWeeks', label: 'Duration (weeks)', type: 'number', min: 1, max: 104 },
      { key: 'daysPerWeek', label: 'Days per week', type: 'number', min: 1, max: 7 },
      { key: 'targetAudience', label: 'Who it is for', type: 'text' },
      { key: 'equipmentIds', label: 'Equipment', type: 'multi', source: 'equipment' },
    ],
    toForm: (d) => ({
      name: d.name,
      imageUrl: d.imageUrl,
      shortDescription: d.shortDescription,
      description: d.description,
      goalId: d.goalId ?? d.goal?.id ?? null,
      coachId: d.coachId ?? d.coach?.id ?? null,
      difficulty: d.difficulty,
      durationWeeks: d.durationWeeks,
      daysPerWeek: d.daysPerWeek,
      targetAudience: d.targetAudience,
      equipmentIds: ids(d.equipment),
    }),
    subtitle: (r) => [`${r.durationWeeks} wk · ${r.daysPerWeek}×/wk`, cap(r.difficulty), r.goal?.name, `${r.enrollmentCount ?? 0} following`].filter(Boolean).join(' · '),
    dashboardNote: 'Weeks, workouts and their exercises are built in the web dashboard.',
  },
  {
    key: 'workout-templates',
    path: 'workout-templates',
    title: 'Workout templates',
    singular: 'template',
    icon: 'list',
    folder: 'programs',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'imageUrl', label: 'Image', type: 'image' },
      { key: 'description', label: 'Description', type: 'multiline' },
      { key: 'goalId', label: 'Goal', type: 'select', source: 'goals' },
      DIFFICULTY,
      { key: 'daysPerWeek', label: 'Days per week', type: 'number', min: 1, max: 7 },
      { key: 'split', label: 'Split', type: 'text', placeholder: 'e.g. Upper / Lower' },
      { key: 'progressionNotes', label: 'Progression notes', type: 'multiline' },
      { key: 'equipmentIds', label: 'Equipment', type: 'multi', source: 'equipment' },
    ],
    toForm: (d) => ({
      name: d.name,
      imageUrl: d.imageUrl,
      description: d.description,
      goalId: d.goalId ?? d.goal?.id ?? null,
      difficulty: d.difficulty,
      daysPerWeek: d.daysPerWeek,
      split: d.split,
      progressionNotes: d.progressionNotes,
      equipmentIds: d.equipmentIds ?? ids(d.equipment),
    }),
    subtitle: (r) => [`${r.daysPerWeek}×/wk`, r.split, cap(r.difficulty), r.goal?.name].filter(Boolean).join(' · '),
    dashboardNote: 'The template’s exercise list is edited in the web dashboard.',
  },
  {
    key: 'coaches',
    path: 'coaches',
    title: 'Coaches',
    singular: 'coach',
    icon: 'people',
    folder: 'coaches',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'imageUrl', label: 'Photo', type: 'image' },
      { key: 'headline', label: 'Headline', type: 'text', placeholder: 'e.g. Strength coach · 10 years' },
      { key: 'bio', label: 'Bio', type: 'multiline' },
      { key: 'specialities', label: 'Specialities', type: 'lines', hint: 'One per line.' },
      { key: 'experienceYears', label: 'Years of experience', type: 'number', min: 0, max: 80 },
    ],
    toForm: (d) => ({
      name: d.name,
      imageUrl: d.imageUrl,
      headline: d.headline,
      bio: d.bio,
      specialities: d.specialities ?? [],
      experienceYears: d.experienceYears,
    }),
    subtitle: (r) => [r.headline, r.programCount != null ? `${r.programCount} programs` : null].filter(Boolean).join(' · '),
  },
  {
    key: 'collections',
    path: 'collections',
    title: 'Featured collections',
    singular: 'collection',
    icon: 'star',
    folder: 'collections',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'imageUrl', label: 'Cover image', type: 'image' },
      { key: 'description', label: 'Description', type: 'multiline' },
      { key: 'isFeatured', label: 'Feature on Explore', type: 'switch' },
      { key: 'sortOrder', label: 'Sort order', type: 'number', min: 0, max: 9999, hint: 'Lower numbers show first.' },
      { key: 'exerciseIds', label: 'Exercises', type: 'multi', source: 'exercises' },
      { key: 'programIds', label: 'Programs', type: 'multi', source: 'programs' },
    ],
    toForm: (d) => ({
      name: d.name,
      imageUrl: d.imageUrl,
      description: d.description,
      isFeatured: !!d.isFeatured,
      sortOrder: d.sortOrder ?? 0,
      exerciseIds: d.exerciseIds ?? ids(d.exercises),
      programIds: d.programIds ?? ids(d.programs),
    }),
    subtitle: (r) => [`${r.exercises?.length ?? 0} exercises`, `${r.programs?.length ?? 0} programs`].join(' · '),
    extraToggle: { key: 'isFeatured', label: 'Featured' },
  },
];

export const findModule = (key?: string) => ADMIN_MODULES.find((m) => m.key === key);
