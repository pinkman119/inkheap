import { httpClient } from './http';

export type WorkExperience = {
  id: number | null;
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
};

export type EducationRecord = {
  id: number | null;
  school: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
};

export type Skill = {
  id: number | null;
  name: string;
  proficiency: string | null;
  description: string | null;
};

export type Profile = {
  id: number | null;
  fullName: string;
  headline: string | null;
  email: string;
  location: string | null;
  website: string | null;
  bio: string | null;
  workExperiences: WorkExperience[];
  educationRecords: EducationRecord[];
  skills: Skill[];
};

export type WorkExperiencePayload = {
  company: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
};

export type EducationRecordPayload = {
  school: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
};

export type SkillPayload = {
  name: string;
  proficiency?: string | null;
  description?: string | null;
};

export type ProfilePayload = {
  fullName: string;
  headline?: string | null;
  email: string;
  location?: string | null;
  website?: string | null;
  bio?: string | null;
  workExperiences?: WorkExperiencePayload[];
  educationRecords?: EducationRecordPayload[];
  skills?: SkillPayload[];
};

export const fetchProfile = async (email?: string) => {
  const { data } = await httpClient.get<Profile>('/profile', {
    params: email ? { email } : undefined
  });
  return data;
};

export const upsertProfile = async (payload: ProfilePayload) => {
  const { data } = await httpClient.post<Profile>('/profile', payload);
  return data;
};

export const deleteProfile = async (email: string) => {
  await httpClient.delete(`/profile/${encodeURIComponent(email)}`);
};
