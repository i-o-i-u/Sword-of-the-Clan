export interface Quote {
  text: string
  author: string
}

// أقوال ومأثورات عربية مشهورة عن الكتب والقراءة (تراث عام)
export const QUOTES: Quote[] = [
  { text: 'أعزّ مكان في الدُّنى سرجُ سابحٍ وخيرُ جليسٍ في الزمان كتابُ', author: 'المتنبي' },
  { text: 'القراءة غذاء العقل كما أن الطعام غذاء الجسد.', author: 'مأثورة' },
  { text: 'من أراد الدنيا فعليه بالعلم، ومن أراد الآخرة فعليه بالعلم.', author: 'الإمام الشافعي' },
  { text: 'الكتاب صديق لا يخذلك ولا يغريك بسوء.', author: 'مأثورة' },
  { text: 'إذا كان لا بد من الغرق، فليكن في بحر الكتب.', author: 'مأثورة' },
  { text: 'لا وحدة تعدل رفقة كتاب.', author: 'الجاحظ' },
  { text: 'ما امتلأ بيتٌ من الكتب إلا كان أعمر بيوت الحكمة.', author: 'مأثورة' },
  { text: 'العلم في الصغر كالنقش في الحجر.', author: 'مأثورة' },
  { text: 'خير جليس في الزمان كتاب.', author: 'المتنبي' },
  { text: 'اقرأ، فإن القراءة هي المفتاح الذي يفتح أبواب المعرفة كلها.', author: 'مأثورة' },
  { text: 'الكتب بساتين العلماء.', author: 'مأثورة' },
  { text: 'من لم يذق مرَّ التعلم ساعة، تجرَّع ذلَّ الجهل طول حياته.', author: 'الإمام الشافعي' },
]

// اقتباس اليوم: ثابت خلال اليوم نفسه، يتغيّر كل يوم بلا حاجة لأي طلب شبكة
export function quoteOfTheDay(date: Date = new Date()): Quote {
  const dayNumber = Math.floor(date.getTime() / 86400000)
  return QUOTES[dayNumber % QUOTES.length]
}

export function randomQuote(excludeText?: string): Quote {
  const pool = excludeText ? QUOTES.filter((q) => q.text !== excludeText) : QUOTES
  return pool[Math.floor(Math.random() * pool.length)]
}
