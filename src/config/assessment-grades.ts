/**
 * Assessment grade presentation metadata.
 *
 * A single source of truth for how each grade is labelled and what handling
 * rule applies. Displayed in the overview legend, the methodology reference and
 * (later) every intelligence record renderer.
 */

import type { Assessment } from '@/types/intelligence';

export type GradeTone = 'success' | 'info' | 'warning' | 'neutral';

export interface AssessmentGrade {
  readonly id: Assessment;
  readonly label: string;
  readonly tone: GradeTone;
  readonly definition: string;
  readonly handlingRule: string;
}

export const ASSESSMENT_GRADES: readonly AssessmentGrade[] = [
  {
    id: 'verified',
    label: 'Verified',
    tone: 'success',
    definition:
      'Corroborated by at least two independent sources, or confirmed by direct analyst review.',
    handlingRule:
      'May be presented as established fact, with the corroborating sources cited.',
  },
  {
    id: 'inferred',
    label: 'Inferred',
    tone: 'info',
    definition:
      'Analytic judgement derived from partial evidence, correlation or model-assisted reasoning.',
    handlingRule:
      'Must be labelled as an assessment. Never presented as confirmed fact.',
  },
  {
    id: 'synthetic',
    label: 'Synthetic',
    tone: 'warning',
    definition:
      'Demonstration, test or training data generated for this platform. Not observed in the wild.',
    handlingRule:
      'Must be clearly marked. Must never be exported or mistaken for operational intelligence.',
  },
  {
    id: 'unverified',
    label: 'Unverified',
    tone: 'neutral',
    definition:
      'Single-source, unattributed or otherwise uncorroborated reporting from an upstream feed.',
    handlingRule:
      'Held for validation. Displayed for triage only, with source and collection time attached.',
  },
];

export function getAssessmentGrade(id: Assessment): AssessmentGrade {
  const grade = ASSESSMENT_GRADES.find((entry) => entry.id === id);

  if (!grade) {
    // Defensive fallback: an unknown grade is treated as unverified rather
    // than being silently promoted.
    return ASSESSMENT_GRADES[ASSESSMENT_GRADES.length - 1] as AssessmentGrade;
  }

  return grade;
}
