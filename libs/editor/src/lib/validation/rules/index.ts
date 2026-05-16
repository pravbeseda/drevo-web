import { headingNoFootnotes, headingNoFormatting, headingNoLinks } from './heading-rules';
import { ValidationRule } from '../models/validation-rule.model';

export const ALL_RULES: readonly ValidationRule[] = [headingNoLinks, headingNoFormatting, headingNoFootnotes];
