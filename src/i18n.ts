import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Dashboard": "Dashboard",
      "Admin Dashboard": "Admin Dashboard",
      "Report Issue": "Report Issue",
      "Profile": "Profile",
      "Logout": "Logout",
      "Community Hero": "Community Hero",
      "My Profile": "My Profile",
      "Display Name": "Display Name",
      "Save Changes": "Save Changes",
      "Cancel": "Cancel",
      "Edit Profile": "Edit Profile",
      "Points Wallet": "Points Wallet",
      "Points earned by helping keep the community safe.": "Points earned by helping keep the community safe.",
      "Language": "Language",
      "English": "English",
      "Hindi": "Hindi (हिंदी)",
      "Gujarati": "Gujarati (ગુજરાતી)",
      "Issue Description": "Issue Description",
      "Type of Issue": "Type of Issue",
      "Location": "Location",
      "Submit Report": "Submit Report",
      "Listening...": "Listening...",
      "dashboard.title": "Ticket Lifecycle Board",
      "dashboard.pending": "Pending",
      "dashboard.startWork": "Start Work",
      "dashboard.working": "Working",
      "dashboard.completeWork": "Complete",
      "dashboard.completed": "Completed",
      "dashboard.exportCSV": "Export to CSV",
      "dashboard.refreshBoard": "Refresh Board",
      "dashboard.viewLocation": "View Location on Map",
      "dashboard.noIssues": "No issues in this column.",
      "dashboard.tabs.pending": "Pending",
      "dashboard.tabs.working": "Working",
      "dashboard.tabs.completed": "Completed",
      "dashboard.pagination.prev": "Previous",
      "dashboard.pagination.next": "Next",
      "dashboard.pagination.page": "Page {{current}} of {{total}}"
    }
  },
  hi: {
    translation: {
      "Dashboard": "डैशबोर्ड",
      "Admin Dashboard": "व्यवस्थापक डैशबोर्ड",
      "Report Issue": "समस्या दर्ज करें",
      "Profile": "प्रोफ़ाइल",
      "Logout": "लॉग आउट",
      "Community Hero": "सामुदायिक नायक",
      "My Profile": "मेरी प्रोफ़ाइल",
      "Display Name": "प्रदर्शन नाम",
      "Save Changes": "परिवर्तन सहेजें",
      "Cancel": "रद्द करें",
      "Edit Profile": "प्रोफ़ाइल संपादित करें",
      "Points Wallet": "पॉइंट्स वॉलेट",
      "Points earned by helping keep the community safe.": "समुदाय को सुरक्षित रखने में मदद करके अर्जित अंक।",
      "Language": "भाषा",
      "English": "अंग्रेज़ी (English)",
      "Hindi": "हिंदी",
      "Gujarati": "गुजराती (Gujarati)",
      "Issue Description": "समस्या का विवरण",
      "Type of Issue": "समस्या का प्रकार",
      "Location": "स्थान",
      "Submit Report": "रिपोर्ट जमा करें",
      "Listening...": "सुन रहा हूँ...",
      "dashboard.title": "टिकट जीवनचक्र बोर्ड",
      "dashboard.pending": "लंबित",
      "dashboard.startWork": "काम शुरू करें",
      "dashboard.working": "काम चालू है",
      "dashboard.completeWork": "पूरा करें",
      "dashboard.completed": "पूर्ण",
      "dashboard.exportCSV": "CSV में निर्यात करें",
      "dashboard.refreshBoard": "बोर्ड रीफ्रेश करें",
      "dashboard.viewLocation": "मानचित्र पर स्थान देखें",
      "dashboard.noIssues": "इस कॉलम में कोई समस्या नहीं है।",
      "dashboard.tabs.pending": "लंबित",
      "dashboard.tabs.working": "काम चालू है",
      "dashboard.tabs.completed": "पूर्ण",
      "dashboard.pagination.prev": "पिछला",
      "dashboard.pagination.next": "अगला",
      "dashboard.pagination.page": "पृष्ठ {{current}} / {{total}}"
    }
  },
  gu: {
    translation: {
      "Dashboard": "ડેશબોર્ડ",
      "Admin Dashboard": "એડમિન ડેશબોર્ડ",
      "Report Issue": "સમસ્યા નોંધો",
      "Profile": "પ્રોફાઇલ",
      "Logout": "લૉગઆઉટ",
      "Community Hero": "સામુદાયિક નાયક",
      "My Profile": "મારી પ્રોફાઇલ",
      "Display Name": "પ્રદર્શન નામ",
      "Save Changes": "ફેરફારો સાચવો",
      "Cancel": "રદ કરો",
      "Edit Profile": "પ્રોફાઇલ સંપાદિત કરો",
      "Points Wallet": "પોઈન્ટ્સ વોલેટ",
      "Points earned by helping keep the community safe.": "સમુદાયને સુરક્ષિત રાખવામાં મદદ કરીને મેળવેલા પોઈન્ટ.",
      "Language": "ભાષા",
      "English": "અંગ્રેજી (English)",
      "Hindi": "હિન્દી (Hindi)",
      "Gujarati": "ગુજરાતી",
      "Issue Description": "સમસ્યાનું વર્ણન",
      "Type of Issue": "સમસ્યાનો પ્રકાર",
      "Location": "સ્થાન",
      "Submit Report": "રિપોર્ટ સબમિટ કરો",
      "Listening...": "સાંભળી રહ્યું છે...",
      "dashboard.title": "ટિકિટ જીવનચક્ર બોર્ડ",
      "dashboard.pending": "બાકી",
      "dashboard.startWork": "કામ શરૂ કરો",
      "dashboard.working": "કાર્ય ચાલુ છે",
      "dashboard.completeWork": "પૂર્ણ કરો",
      "dashboard.completed": "પૂર્ણ",
      "dashboard.exportCSV": "CSV માં નિકાસ કરો",
      "dashboard.refreshBoard": "બોર્ડ રિફ્રેશ કરો",
      "dashboard.viewLocation": "નકશા પર સ્થાન જુઓ",
      "dashboard.noIssues": "આ કૉલમમાં કોઈ સમસ્યા નથી.",
      "dashboard.tabs.pending": "બાકી",
      "dashboard.tabs.working": "કાર્ય ચાલુ છે",
      "dashboard.tabs.completed": "પૂર્ણ",
      "dashboard.pagination.prev": "પાછલું",
      "dashboard.pagination.next": "આગળ",
      "dashboard.pagination.page": "પૃષ્ઠ {{current}} / {{total}}"
    }
  }
};

const savedLanguage = localStorage.getItem('appLanguage') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
