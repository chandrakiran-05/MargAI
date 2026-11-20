export interface LanguageSupportInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  supportLevel: 'verified_active' | 'catalogue_ready' | 'planned_roadmap';
  ttsSupported: boolean;
  voiceGender?: 'female' | 'male';
}

export const SUPPORTED_LANGUAGES: LanguageSupportInfo[] = [
  {
    code: 'en',
    name: 'English (India)',
    nativeName: 'English (India)',
    script: 'Latin',
    supportLevel: 'verified_active',
    ttsSupported: true,
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    supportLevel: 'verified_active',
    ttsSupported: true,
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    supportLevel: 'verified_active',
    ttsSupported: true,
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    supportLevel: 'verified_active',
    ttsSupported: true,
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    supportLevel: 'verified_active',
    ttsSupported: true,
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    supportLevel: 'verified_active',
    ttsSupported: true,
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    supportLevel: 'verified_active',
    ttsSupported: true,
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    supportLevel: 'catalogue_ready',
    ttsSupported: true,
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    supportLevel: 'catalogue_ready',
    ttsSupported: true,
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    supportLevel: 'catalogue_ready',
    ttsSupported: true,
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    script: 'Odia',
    supportLevel: 'catalogue_ready',
    ttsSupported: true,
  },
];
