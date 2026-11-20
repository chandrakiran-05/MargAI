export type MessageKey =
  | 'hazard.pothole.ahead'
  | 'hazard.pothole.ahead_caution'
  | 'hazard.pothole.detected'
  | 'hazard.pedestrian.path_conflict'
  | 'hazard.pedestrian.ahead_caution'
  | 'hazard.animal.path_conflict'
  | 'hazard.animal.ahead_caution'
  | 'hazard.incident.ahead_unverified'
  | 'hazard.incident.ahead_confirmed'
  | 'road.curve.ahead'
  | 'visibility.low'
  | 'system.perception_reduced'
  | 'system.connection_lost'
  | 'hazard.cleared';

export interface LocalizedMessage {
  text: string;
  shortVoicePhrase: string;
}

export const WARNING_CATALOG: Record<string, Record<MessageKey, LocalizedMessage>> = {
  en: {
    'hazard.pothole.ahead': {
      text: 'Deep pothole ahead. Slow down immediately.',
      shortVoicePhrase: 'Pothole ahead, slow down.',
    },
    'hazard.pothole.ahead_caution': {
      text: 'Pothole reported in 80 meters.',
      shortVoicePhrase: 'Caution, pothole ahead.',
    },
    'hazard.pothole.detected': {
      text: 'Road defect observed ahead.',
      shortVoicePhrase: 'Road defect ahead.',
    },
    'hazard.pedestrian.path_conflict': {
      text: 'Pedestrian crossing in your lane! Brake now.',
      shortVoicePhrase: 'Pedestrian in path!',
    },
    'hazard.pedestrian.ahead_caution': {
      text: 'Pedestrian on road verge ahead.',
      shortVoicePhrase: 'Pedestrian on road.',
    },
    'hazard.animal.path_conflict': {
      text: 'Stray cattle crossing roadway! Brake immediately.',
      shortVoicePhrase: 'Cattle on road! Brake.',
    },
    'hazard.animal.ahead_caution': {
      text: 'Animal on road shoulder ahead.',
      shortVoicePhrase: 'Animal on road shoulder.',
    },
    'hazard.incident.ahead_unverified': {
      text: 'Traffic blockage reported ahead.',
      shortVoicePhrase: 'Traffic incident ahead.',
    },
    'hazard.incident.ahead_confirmed': {
      text: 'Confirmed road incident ahead. Use caution.',
      shortVoicePhrase: 'Road incident ahead.',
    },
    'road.curve.ahead': {
      text: 'Sharp curve ahead. Reduce speed.',
      shortVoicePhrase: 'Sharp curve ahead.',
    },
    'visibility.low': {
      text: 'Dense fog corridor. Turn on fog lamps.',
      shortVoicePhrase: 'Low visibility, fog ahead.',
    },
    'system.perception_reduced': {
      text: 'Phone thermal protection active. Camera rate reduced.',
      shortVoicePhrase: 'Thermal protection active.',
    },
    'system.connection_lost': {
      text: 'Network lost. Running on cached corridor map.',
      shortVoicePhrase: 'Offline mode active.',
    },
    'hazard.cleared': {
      text: 'Hazard passed.',
      shortVoicePhrase: '',
    },
  },
  hi: {
    'hazard.pothole.ahead': {
      text: 'आगे गहरा गड्ढा है। तुरंत गति धीमी करें।',
      shortVoicePhrase: 'आगे गड्ढा है, धीमे चलें।',
    },
    'hazard.pothole.ahead_caution': {
      text: '80 मीटर आगे गड्ढे की सूचना है।',
      shortVoicePhrase: 'सावधान, आगे गड्ढा है।',
    },
    'hazard.pothole.detected': {
      text: 'सड़क पर खराबी देखी गई।',
      shortVoicePhrase: 'आगे सड़क खराब है।',
    },
    'hazard.pedestrian.path_conflict': {
      text: 'सड़क पार कर रहे पैदल यात्री! तुरंत ब्रेक लगाएं।',
      shortVoicePhrase: 'सड़क पर पैदल यात्री! ब्रेक लगाएं।',
    },
    'hazard.pedestrian.ahead_caution': {
      text: 'सड़क किनारे पैदल यात्री हैं।',
      shortVoicePhrase: 'आगे पैदल यात्री हैं।',
    },
    'hazard.animal.path_conflict': {
      text: 'सड़क पर आवारा मवेशी/गाय है! तुरंत ब्रेक लगाएं।',
      shortVoicePhrase: 'सड़क पर मवेशी हैं! धीमे करें।',
    },
    'hazard.animal.ahead_caution': {
      text: 'सड़क किनारे जानवर हैं।',
      shortVoicePhrase: 'आगे सड़क किनारे जानवर हैं।',
    },
    'hazard.incident.ahead_unverified': {
      text: 'आगे दुर्घटना/जाम की सूचना है।',
      shortVoicePhrase: 'आगे जाम की सूचना है।',
    },
    'hazard.incident.ahead_confirmed': {
      text: 'आगे दुर्घटना की पुष्टि हुई है। सतर्क रहें।',
      shortVoicePhrase: 'आगे दुर्घटना है।',
    },
    'road.curve.ahead': {
      text: 'आगे तीव्र मोड़ है। गति कम करें।',
      shortVoicePhrase: 'आगे तीव्र मोड़ है।',
    },
    'visibility.low': {
      text: 'आगे घना कोहरा है। फॉग लैंप जलाएं।',
      shortVoicePhrase: 'घना कोहरा, सतर्क रहें।',
    },
    'system.perception_reduced': {
      text: 'फोन गर्म हो गया है। कैमरा दर घटाई गई।',
      shortVoicePhrase: 'तापमान संरक्षण सक्रिय।',
    },
    'system.connection_lost': {
      text: 'नेटवर्क संपर्क टूटा। ऑफलाइन मोड में सुरक्षित हैं।',
      shortVoicePhrase: 'ऑफलाइन मोड।',
    },
    'hazard.cleared': {
      text: 'खतरा पार हो गया।',
      shortVoicePhrase: '',
    },
  },
  kn: {
    'hazard.pothole.ahead': {
      text: 'ಮುಂದೆ ಆಳವಾದ ಗುಂಡಿ ಇದೆ! ತಕ್ಷಣ ವೇಗ ಕಡಿಮೆ ಮಾಡಿ.',
      shortVoicePhrase: 'ಮುಂದೆ ಗುಂಡಿ ಇದೆ, ನಿಧಾನಿಸಿ.',
    },
    'hazard.pothole.ahead_caution': {
      text: '80 ಮೀಟರ್ ಮುಂದೆ ರಸ್ತೆ ಗುಂಡಿ ವರದಿಯಾಗಿದೆ.',
      shortVoicePhrase: 'ಎಚ್ಚರ, ಮುಂದೆ ಗುಂಡಿ ಇದೆ.',
    },
    'hazard.pothole.detected': {
      text: 'ರಸ್ತೆಯ ದೋಷ ಕಂಡುಬಂದಿದೆ.',
      shortVoicePhrase: 'ರಸ್ತೆ ದೋಷವಿದೆ.',
    },
    'hazard.pedestrian.path_conflict': {
      text: 'ಮುಂದೆ ಪಾದಚಾರಿಗಳು ರಸ್ತೆ ದಾಟುತ್ತಿದ್ದಾರೆ! ಬ್ರೇಕ್ ಹಾಕಿ.',
      shortVoicePhrase: 'ಮುಂದೆ ಪಾದಚಾರಿಗಳು, ಬ್ರೇಕ್ ಹಾಕಿ!',
    },
    'hazard.pedestrian.ahead_caution': {
      text: 'ರಸ್ತೆ ಬದಿಯಲ್ಲಿ ಪಾದಚಾರಿಗಳು.',
      shortVoicePhrase: 'ರಸ್ತೆ ಬದಿ ಪಾದಚಾರಿಗಳು.',
    },
    'hazard.animal.path_conflict': {
      text: 'ರಸ್ತೆಯಲ್ಲಿ ಜಾನುವಾರುಗಳಿವೆ/ಹಸು ದಾಟುತ್ತಿದೆ! ತಕ್ಷಣ ಬ್ರೇಕ್ ಹಾಕಿ.',
      shortVoicePhrase: 'ರಸ್ತೆಯಲ್ಲಿ ದನಗಳಿವೆ! ಬ್ರೇಕ್ ಹಾಕಿ.',
    },
    'hazard.animal.ahead_caution': {
      text: 'ರಸ್ತೆ ಅಂಚಿನಲ್ಲಿ ಪ್ರಾಣಿಗಳು.',
      shortVoicePhrase: 'ರಸ್ತೆ ಅಂಚಿನಲ್ಲಿ ಪ್ರಾಣಿಗಳು.',
    },
    'hazard.incident.ahead_unverified': {
      text: 'ಮುಂದೆ ಸಂಚಾರ ಅಡಚಣೆ ವರದಿಯಾಗಿದೆ.',
      shortVoicePhrase: 'ಮುಂದೆ ಅಪಘಾತ ವರದಿ.',
    },
    'hazard.incident.ahead_confirmed': {
      text: 'ಮುಂದೆ ರಸ್ತೆ ಬ್ಲಾಕ್ ಆಗಿದೆ. ಜಾಗರೂಕರಾಗಿರಿ.',
      shortVoicePhrase: 'ಮುಂದೆ ರಸ್ತೆ ಬ್ಲಾಕ್ ಆಗಿದೆ.',
    },
    'road.curve.ahead': {
      text: 'ಮುಂದೆ ಕಡಿದಾದ ತಿರುವು ಇದೆ. ವೇಗ ಕಡಿಮೆ ಮಾಡಿ.',
      shortVoicePhrase: 'ಕಡಿದಾದ ತಿರುವು ಇದೆ.',
    },
    'visibility.low': {
      text: 'ದಟ್ಟ ಮಂಜು ಕವಿದಿದೆ. ಫಾಗ್ ಲ್ಯಾಂಪ್ ಆನ್ ಮಾಡಿ.',
      shortVoicePhrase: 'ದಟ್ಟ ಮಂಜು, ಎಚ್ಚರ.',
    },
    'system.perception_reduced': {
      text: 'ಫೋನ್ ಅಧಿಕ ಉಷ್ಣತೆ: ಕ್ಯಾಮೆರಾ ಸ್ಕ್ಯಾನಿಂಗ್ ಮಿತಿಗೊಳಿಸಲಾಗಿದೆ.',
      shortVoicePhrase: 'ಉಷ್ಣತೆ ರಕ್ಷಣೆ ಸಕ್ರಿಯ.',
    },
    'system.connection_lost': {
      text: 'ನೆಟ್‌ವರ್ಕ್ ಕಡಿತಗೊಂಡಿದೆ. ಆಫ್‌ಲೈನ್ ಮೋಡ್ ಸಕ್ರಿಯ.',
      shortVoicePhrase: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್.',
    },
    'hazard.cleared': {
      text: 'ಅಡಚಣೆ ದಾಟಿದೆ.',
      shortVoicePhrase: '',
    },
  },
  ta: {
    'hazard.pothole.ahead': {
      text: 'முன்னால் பெரிய பள்ளம் உள்ளது! உடனடியாக வேகத்தை குறைக்கவும்.',
      shortVoicePhrase: 'முன்னால் பள்ளம், மெதுவாக செல்லவும்.',
    },
    'hazard.pothole.ahead_caution': {
      text: '80 மீட்டரில் பள்ளம் உள்ளது.',
      shortVoicePhrase: 'எச்சரிக்கை, பள்ளம் உள்ளது.',
    },
    'hazard.pothole.detected': {
      text: 'சாலை சேதம் கண்டறியப்பட்டது.',
      shortVoicePhrase: 'சாலை சேதம்.',
    },
    'hazard.pedestrian.path_conflict': {
      text: 'முன்னால் பாதசாரி சாலையை கடக்கிறார்! பிரேக் செய்யவும்.',
      shortVoicePhrase: 'பாதசாரி சாலையைக் கடக்கிறார்!',
    },
    'hazard.pedestrian.ahead_caution': {
      text: 'சாலையோர பாதசாரிகள்.',
      shortVoicePhrase: 'சாலையோர பாதசாரிகள்.',
    },
    'hazard.animal.path_conflict': {
      text: 'சாலையில் மாடு உள்ளது! உடனடியாக பிரேக் செய்யவும்.',
      shortVoicePhrase: 'சாலையில் மாடு உள்ளது!',
    },
    'hazard.animal.ahead_caution': {
      text: 'சாலையோர விலங்குகள்.',
      shortVoicePhrase: 'சாலையோர விலங்குகள்.',
    },
    'hazard.incident.ahead_unverified': {
      text: 'முன்னால் போக்குவரத்து நெரிசல்.',
      shortVoicePhrase: 'முன்னால் விபத்து அறிக்கை.',
    },
    'hazard.incident.ahead_confirmed': {
      text: 'முன்னால் சாலை தடைப்பட்டுள்ளது.',
      shortVoicePhrase: 'சாலை தடைப்பட்டுள்ளது.',
    },
    'road.curve.ahead': {
      text: 'முன்னால் கொண்டை ஊசி வளைவு. வேகத்தை குறைக்கவும்.',
      shortVoicePhrase: 'கடுமையான வளைவு உள்ளது.',
    },
    'visibility.low': {
      text: 'அடர்ந்த மூடுபனி. எச்சரிக்கையுடன் ஓட்டவும்.',
      shortVoicePhrase: 'அடர்ந்த மூடுபனி.',
    },
    'system.perception_reduced': {
      text: 'வெப்பநிலை பாதுகாப்பு இயக்கப்பட்டது.',
      shortVoicePhrase: 'வெப்ப பாதுகாப்பு.',
    },
    'system.connection_lost': {
      text: 'இணைய இணைப்பு துண்டிக்கப்பட்டது.',
      shortVoicePhrase: 'ஆஃப்லைன் முறை.',
    },
    'hazard.cleared': {
      text: 'ஆபத்து கடந்தது.',
      shortVoicePhrase: '',
    },
  },
  te: {
    'hazard.pothole.ahead': {
      text: 'ముందు పెద్ద గుంత ఉంది! వెంటనే వేగం తగ్గించండి.',
      shortVoicePhrase: 'ముందు గుంత ఉంది, నెమ్మదిగా వెళ్ళండి.',
    },
    'hazard.pothole.ahead_caution': {
      text: '80 మీటర్ల దూరంలో గుంత ఉంది.',
      shortVoicePhrase: 'జాగ్రత్త, గుంత ఉంది.',
    },
    'hazard.pothole.detected': {
      text: 'రోడ్డు దెబ్బతిన్నది.',
      shortVoicePhrase: 'రోడ్డు దెబ్బతిన్నది.',
    },
    'hazard.pedestrian.path_conflict': {
      text: 'ముందు పాదచారులు దాటుతున్నారు! బ్రేక్ వేయండి.',
      shortVoicePhrase: 'పాదచారులు దాటుతున్నారు, బ్రేక్!',
    },
    'hazard.pedestrian.ahead_caution': {
      text: 'రోడ్డు పక్కన పాదచారులు ఉన్నారు.',
      shortVoicePhrase: 'రోడ్డు పక్కన పాదచారులు.',
    },
    'hazard.animal.path_conflict': {
      text: 'రోడ్డుపై పశువులు ఉన్నాయి! వెంటనే బ్రేక్ వేయండి.',
      shortVoicePhrase: 'రోడ్డుపై పశువులు ఉన్నాయి!',
    },
    'hazard.animal.ahead_caution': {
      text: 'రోడ్డు పక్కన జంతువులు ఉన్నాయి.',
      shortVoicePhrase: 'రోడ్డు పక్కన జంతువులు.',
    },
    'hazard.incident.ahead_unverified': {
      text: 'ముందు ట్రాఫిక్ అంతరాయం ఉంది.',
      shortVoicePhrase: 'ముందు ట్రాఫిక్ ప్రమాదం.',
    },
    'hazard.incident.ahead_confirmed': {
      text: 'ముందు రోడ్డు మూసివేయబడింది.',
      shortVoicePhrase: 'రోడ్డు మూసివేయబడింది.',
    },
    'road.curve.ahead': {
      text: 'ముందు ప్రమాదకరమైన మలుపు ఉంది. వేగం తగ్గించండి.',
      shortVoicePhrase: 'తీవ్రమైన మలుపు.',
    },
    'visibility.low': {
      text: 'దట్టమైన పొగమంచు. జాగ్రత్తగా నడపండి.',
      shortVoicePhrase: 'దట్టమైన పొగమంచు.',
    },
    'system.perception_reduced': {
      text: 'థర్మల్ రక్షణ యాక్టివ్ అయింది.',
      shortVoicePhrase: 'థర్మల్ రక్షణ.',
    },
    'system.connection_lost': {
      text: 'నెట్‌వర్క్ కోల్పోయింది. ఆఫ్‌లైన్ మోడ్.',
      shortVoicePhrase: 'ఆఫ్‌లైన్ మోడ్.',
    },
    'hazard.cleared': {
      text: 'ప్రమాదం దాటింది.',
      shortVoicePhrase: '',
    },
  },
};

export function getLocalizedMessage(langCode: string, key: MessageKey): LocalizedMessage {
  const langDict = WARNING_CATALOG[langCode] || WARNING_CATALOG['en'];
  return langDict[key] || WARNING_CATALOG['en'][key] || { text: key, shortVoicePhrase: key };
}
