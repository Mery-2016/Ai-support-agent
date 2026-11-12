/**
 * COMBO.UZ Product Catalog Service
 * Integrates site catalog, specifications, photos, and links to Excel retail pricing.
 */
const fs = require('fs');
const path = require('path');

const RETAIL_FILE = path.resolve(__dirname, '..', 'data', 'retail_price_list.json');

// 12 official categories from COMBO.UZ catalog
const CATALOG_ITEMS = [
  {
    id: 'day_night',
    slug: 'day-night',
    name_ru: 'Рулонные шторы «День-Ночь» (Зебра / Комбо)',
    name_uz: '«Kun va Tun» rolikli pardalari (Zebra / Kombo)',
    category: 'roller',
    badge_ru: 'Хит продаж',
    badge_uz: 'Xit savdo',
    sunProtection: '85-95%',
    description_ru: 'Плавная регулировка освещения за счет чередования прозрачных и плотных тканевых полос. Двойное полотно позволяет настраивать режим «день» или «ночь» без полного подъема шторы.',
    description_uz: 'Shaffof va qalin mato chiziqlarining navbatma-navbat joylashuvi hisobiga yorug‘likni bir tekis sozlash. Ikki qatlamli mato pardani to‘liq ko‘tarmasdan «kun» yoki «tun» holatiga o‘tkazish imkonini beradi.',
    specs_ru: [
      'Идеально для гостиных, спален, кухонь и офисов',
      'Ткани производства Турции и Южной Кореи с тефлоновой пропиткой',
      'Антистатическое покрытие — пыль не оседает на полотне',
      'Кассетная система с коробом или стандартный общий карниз'
    ],
    specs_uz: [
      'Mehmonxona, yotoqxona, oshxona va ofislar uchun ideal',
      'Turkiya va Janubiy Koreya matolari teflon qoplamali',
      'Antistatik qatlam — matoga shahar changi o‘tirmaydi',
      'Qutili kasseta tizimi yoki standart umumiy karniz'
    ],
    image: 'assets/images/catalog-day-night.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-day-night.svg',
    suitableRooms: ['гостиная', 'спальня', 'детская', 'кухня', 'офис', 'kabinet', 'mehmonxona', 'yotoqxona'],
    priceFromUZS: 100000,
    priceNote_ru: 'Общий карниз от 100 000 сум/м², популярные турецкие ткани 120 000–180 000 сум/м², кассеты 220 000–250 000 сум/м²',
    priceNote_uz: 'Umumiy karniz 100 000 so‘m/m² dan, mashhur turk matolari 120 000–180 000 so‘m/m², kassetalar 220 000–250 000 so‘m/m²'
  },
  {
    id: 'rollo',
    slug: 'rollo',
    name_ru: 'Рулонные шторы Ролло (Rollo)',
    name_uz: 'Rollo klassik rolikli pardalari',
    category: 'roller',
    badge_ru: 'Классика',
    badge_uz: 'Klassika',
    sunProtection: '60-100%',
    description_ru: 'Классическое цельное полотно, аккуратно сворачивающееся в рулон вверху проема или створки. Доступны полупрозрачные светорассеивающие ткани, Dimout и Blackout 100%.',
    description_uz: 'Deraza tepasida ixcham o‘raladigan klassik yaxlit mato. Yarim shaffof yorug‘lik tarqatuvchi, Dimout va Blackout 100% matolar mavjud.',
    specs_ru: [
      'Универсальное решение для пластиковых окон Akfa, Imzo и деревянных рам',
      'Монтаж без сверления на двухсторонний скотч 3M или на саморезы',
      'Боковые направляющие (леска) предотвращают провисание при проветривании',
      'Простой сухой уход мягкой щеткой или пылесосом'
    ],
    specs_uz: [
      'Akfa, Imzo plastik va yog‘och derazalar uchun universal',
      '3M skotchi orqali teshmasdan yoki vintlar bilan o‘rnatish',
      'Yon yo‘naltiruvchi tross shamollatishda osilib qolishdan asraydi',
      'Yumshoq cho‘tka bilan oson quruq tozalash'
    ],
    image: 'assets/images/catalog-rollo.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-rollo.svg',
    suitableRooms: ['спальня', 'зал', 'балкон', 'лоджия', 'офис', 'balkon', 'yotoqxona'],
    priceFromUZS: 100000,
    priceNote_ru: 'От 100 000 сум/м² в базовых тканях, Blackout 200 000–230 000 сум/м²',
    priceNote_uz: 'Baza matolarida 100 000 so‘m/m² dan, Blackout 200 000–230 000 so‘m/m²'
  },
  {
    id: 'double',
    slug: 'double',
    name_ru: 'Рулонные шторы Double (Двойные)',
    name_uz: 'Double (Dabl) ikki qavatli rolikli pardalar',
    category: 'roller',
    badge_ru: 'Премиум',
    badge_uz: 'Premium',
    sunProtection: '100%',
    description_ru: 'Двойная независимая система штор в одном компактном карнизе: одно полотно прозрачное тюлевое для дневного мягкого света, второе — плотный Blackout для полной темноты ночью.',
    description_uz: 'Bitta karnizda joylashgan ikkita mustaqil parda tizimi: birinchisi kunduzgi yumshoq nur uchun nozik tul mato, ikkinchisi kechasi to‘liq qorong‘ulik beruvchi Blackout.',
    specs_ru: [
      'Заменяет классический комплект тюль + портьера',
      'Два независимых цепочных механизма управления',
      'Экономит пространство на подоконнике',
      'Премиальная фурнитура и бесшумный ход'
    ],
    specs_uz: [
      'Klassik tul va qalin parda to‘plamini to‘liq almashtiradi',
      'Ikkita mustaqil boshqaruv zanjir mexanizmi',
      'Deraza tokchasida joyni tejaydi',
      'Premium turk furniturasi va shovqinsiz harakat'
    ],
    image: 'assets/images/catalog-double.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-double.svg',
    suitableRooms: ['спальня', 'гостиная', 'апартаменты', 'гостиница', 'mehmonxona', 'yotoqxona'],
    priceFromUZS: 250000,
    priceNote_ru: 'От 250 000 до 330 000 сум/м² в зависимости от комбинации полотен',
    priceNote_uz: 'Matolar kombinatsiyasiga qarab 250 000 dan 330 000 so‘m/m² gacha'
  },
  {
    id: 'dikey',
    slug: 'dikey',
    name_ru: 'Жалюзи Dikey (Вертикальные жалюзи-шторы)',
    name_uz: 'Dikey vertikal jalyuzi-pardalari',
    category: 'tulle',
    badge_ru: 'Новинка',
    badge_uz: 'Yangi model',
    sunProtection: '80%',
    description_ru: 'Инновационная гибридная система: вертикальные пластины, обернутые в струящуюся тюлевую вуаль. Позволяет проходить сквозь шторы в любом месте без необходимости их сдвигать.',
    description_uz: 'Innovatsion gibrid tizim: mayin tul matosiga o‘ralgan vertikal lamelalar. Pardani surmasdan istalgan joyidan bemalol o‘tib ketish imkonini beradi.',
    specs_ru: [
      'Идеально для балконов, террас и панорамных дверей',
      'Возможность стирки отдельных ламелей',
      'Угол поворота ламелей 180° для тонкой настройки света',
      'Высота до 4 метров для высоких потолков'
    ],
    specs_uz: [
      'Balkon, veranda va katta panoramali eshiklar uchun juda qulay',
      'Alohida lamelalarni yuvish imkoniyati',
      'Nur yo‘nalishini 180° burish orqali nozik boshqarish',
      'Baland shiftlar uchun 4 metrgacha balandlik'
    ],
    image: 'assets/images/catalog-dikey.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-dikey.svg',
    suitableRooms: ['гостиная', 'балкон', 'терраса', 'витраж', 'zal', 'balkon', 'panoramali oyna'],
    priceFromUZS: 290000,
    priceNote_ru: 'От 290 000 сум/м²',
    priceNote_uz: '290 000 so‘m/m² dan'
  },
  {
    id: 'tulle',
    slug: 'tulle',
    name_ru: 'Тюлевые жалюзи (Жалюзи-тюль)',
    name_uz: 'Tul jalyuzilari (Jalyuzi-tul)',
    category: 'tulle',
    badge_ru: 'Элегантно',
    badge_uz: 'Nafis',
    sunProtection: '70%',
    description_ru: 'Сочетание уюта классического турецкого тюля с функциональностью жалюзи. Тканевые полосы соединены прозрачной вуалью, создавая эффект струящихся волн.',
    description_uz: 'Klassik turk tulining shinamligi va zamonaviy jalyuzi funksionalligi uyg‘unligi. Mato lamelalari shaffof vual bilan birlashib, chiroyli to‘lqin hosil qiladi.',
    specs_ru: [
      'Широкая палитра пастельных и благородных оттенков',
      'Мягкое рассеивание дневного света без слепящих бликов',
      'Устойчивость к выгоранию под ташкентским солнцем',
      'Управление одним шнуром или радиопультом'
    ],
    specs_uz: [
      'Keng pastel va zamonaviy ranglar palitrasi',
      'Kunduzgi nurni yumshoq tarqatish, ko‘zni qamashtirmaydi',
      'Toshkent quyoshida rang o‘chishiga chidamli',
      'Bitta shnur yoki pult orqali qulay boshqaruv'
    ],
    image: 'assets/images/catalog-tulle.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-tulle.svg',
    suitableRooms: ['зал', 'гостиная', 'спальня', 'mehmonxona', 'yotoqxona'],
    priceFromUZS: 290000,
    priceNote_ru: 'От 290 000 сум/м²',
    priceNote_uz: '290 000 so‘m/m² dan'
  },
  {
    id: 'vertical_tulle',
    slug: 'vertical-tulle',
    name_ru: 'Вертикальные тюлевые жалюзи',
    name_uz: 'Vertikal tul jalyuzilari',
    category: 'tulle',
    badge_ru: 'Для больших проемов',
    badge_uz: 'Katta oynalar uchun',
    sunProtection: '75%',
    description_ru: 'Вертикальные ламели в тюлевой драпировке для панорамного остекления, витражных окон и просторных залов.',
    description_uz: 'Katta panoramali va vitrajli oynalar, keng zallar uchun maxsus tul vertikal jalyuzilar.',
    specs_ru: [
      'Визуально увеличивают высоту потолков',
      'Плавный раздвижной механизм влево, вправо или от центра',
      'Устойчивость к деформации при высоких температурах',
      'Срок изготовления 1–3 рабочих дня'
    ],
    specs_uz: [
      'Xona shiftini vizual tarzda balandroq ko‘rsatadi',
      'Chapga, o‘ngga yoki markazdan ikki tomonga surilish',
      'Yuqori haroratda o‘z shaklini yo‘qotmaydi',
      'Tayyorlanish muddati 1–3 ish kuni'
    ],
    image: 'assets/images/catalog-vertical-tulle.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-vertical-tulle.svg',
    suitableRooms: ['гостиная', 'офис', 'витраж', 'zal', 'ofis'],
    priceFromUZS: 290000,
    priceNote_ru: 'От 290 000 сум/м²',
    priceNote_uz: '290 000 so‘m/m² dan'
  },
  {
    id: 'plisse',
    slug: 'plisse',
    name_ru: 'Жалюзи плиссе и сотовые Honeycomb',
    name_uz: 'Plisse va Honeycomb (asalari uyasi) jalyuzilari',
    category: 'plisse',
    badge_ru: 'Технологично',
    badge_uz: 'Yuqori texnologik',
    sunProtection: '90-100%',
    description_ru: 'Шторы-гармошка со специальным плиссированным профилем. Единственная система, подходящая для нестандартных форм: арки, трапеции, мансардные и потолочные окна.',
    description_uz: 'Garmoshka shaklidagi plisse profili. Nostandart derazalar: arka, trapetsiya, mansarda va tom oynalari uchun yagona mukammal yechim.',
    specs_ru: [
      'Управление «Сверху-Вниз» и «Снизу-Вверх» (открытие в обе стороны)',
      'Система сотовых ячеек Honeycomb задерживает до 95% жары',
      'Монтаж в штапик окна без выступающих карнизов',
      'Ткани Blackout с алюминиевым термоотражающим слоем'
    ],
    specs_uz: [
      '«Tepadan-pastga» va «Pastdan-tepaga» ochilish (ikki tomonlama)',
      'Honeycomb asalari uyasi tuzilishi issiqlikni 95% gacha to‘sadi',
      'Deraza shtapikiga qulay o‘rnatish, bo‘rtib chiqmaydi',
      'Alyuminiy issiqlik qaytaruvchi qatlamli Blackout matolar'
    ],
    image: 'assets/images/catalog-plisse.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-plisse.svg',
    suitableRooms: ['мансарда', 'ванная', 'кухня', 'арка', 'спальня', 'mansarda', 'oshxona', 'arka'],
    priceFromUZS: 310000,
    priceNote_ru: 'От 310 000 сум/м²',
    priceNote_uz: '310 000 so‘m/m² dan'
  },
  {
    id: 'cassette',
    slug: 'cassette',
    name_ru: 'Кассетные рулонные шторы (Uni / короб)',
    name_uz: 'Kassetali rolikli pardalar (Quti va yo‘naltirgichlar bilan)',
    category: 'cassette',
    badge_ru: 'Герметично',
    badge_uz: 'Germetik',
    sunProtection: '100%',
    description_ru: 'Рулон спрятан в эстетичном алюминиевом коробе, а ткань движется по боковым направляющим. Образует единое целое со створкой пластикового окна Akfa/Imzo.',
    description_uz: 'Parda o‘rami alyuminiy quti ichida berkingan, mato esa yon yo‘naltiruvchilar bo‘ylab yuradi. Akfa/Imzo oynasi bilan yaxlit birikma hosil qiladi.',
    specs_ru: [
      'Полное перекрытие света по бокам без боковых просветов',
      'Окно свободно открывается на проветривание в любом положении',
      'Подоконник остается полностью свободным для цветов и вещей',
      'Защита ткани от пыли и выгорания в закрытом коробе'
    ],
    specs_uz: [
      'Yon tomonlardan umuman yorug‘lik o‘tkazmaydi',
      'Derazani shamollatishga ochganda parda deraza bilan birga ochiladi',
      'Deraza tokchasi gullar va narsalar uchun to‘liq bo‘sh qoladi',
      'Yopiq quti matoni changdan saqlaydi'
    ],
    image: 'assets/images/catalog-cassette.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-cassette.svg',
    suitableRooms: ['спальня', 'детская', 'домашний кинотеатр', 'yotoqxona', 'bolalar xonasi'],
    priceFromUZS: 220000,
    priceNote_ru: 'От 220 000 до 250 000 сум/м²',
    priceNote_uz: '220 000 dan 250 000 so‘m/m² gacha'
  },
  {
    id: 'mini',
    slug: 'mini',
    name_ru: 'Мини-жалюзи на створку',
    name_uz: 'Mini-jalyuzilar (Har bir tavaqa uchun)',
    category: 'mini',
    badge_ru: 'Компактно',
    badge_uz: 'Ixcham',
    sunProtection: '70-90%',
    description_ru: 'Облегченная компактная система без короба на каждую отдельную створку. Экономичный и практичный вариант для пластиковых окон.',
    description_uz: 'Har bir tavaqaga qutisiz o‘rnatiladigan ixcham va engil tizim. Plastik derazalar uchun tejamkor va amaliy variant.',
    specs_ru: [
      'Крепление на створку без сверления профиля',
      'Магнитные фиксаторы или леска в нижней части',
      'Доступная цена при сохранении качественной турецкой ткани',
      'Легкий вес и простота эксплуатации'
    ],
    specs_uz: [
      'Deraza profilini teshmasdan mahkamlash',
      'Pastki qismida magnit yoki tross mahkamlagichlar',
      'Sifatli turk matosi va hamyonbop narx',
      'Yengil va oson boshqaruv'
    ],
    image: 'assets/images/catalog-mini.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-mini.svg',
    suitableRooms: ['кухня', 'балкон', 'кабинет', 'oshxona', 'balkon'],
    priceFromUZS: 130000,
    priceNote_ru: 'От 130 000 до 150 000 сум/м²',
    priceNote_uz: '130 000 dan 150 000 so‘m/m² gacha'
  },
  {
    id: 'horizontal_alu',
    slug: 'horizontal-aluminum',
    name_ru: 'Горизонтальные алюминиевые жалюзи',
    name_uz: 'Gorizontal alyuminiy jalyuzilar',
    category: 'aluminum',
    badge_ru: 'Практично',
    badge_uz: 'Amaliy',
    sunProtection: '85%',
    description_ru: 'Классические жалюзи из экологичного алюминиевого сплава 16 мм и 25 мм. Не впитывают жир, влагу и запахи, идеальны для кухонь и офисов.',
    description_uz: '16 mm va 25 mm ekologik alyuminiy qotishmasidan ishlangan klassik jalyuzi. Yog‘, namlik va hidlarni o‘ziga tortmaydi, oshxona va ofislar uchun eng yaxshisi.',
    specs_ru: [
      'Влагостойкие, не ржавеют и легко моются водой',
      'Стойкая порошковая окраска, не выгорающая на солнце',
      'Надежный поворотный стержень и шнур подъема',
      'Широкая гамма цветов: белый, серебро, беж, металлик'
    ],
    specs_uz: [
      'Namlikka chidamli, zanglamaydi, suv bilan oson yuviladi',
      'Quyoshda o‘chmaydigan mustahkam kukunli bo‘yoq',
      'Ishonchli burama tayoqcha va ko‘tarish shnuri',
      'Keng ranglar gammasi: oq, kumush, bej, metallik'
    ],
    image: 'assets/images/catalog-alu.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-alu.svg',
    suitableRooms: ['кухня', 'ванная', 'офис', 'гараж', 'oshxona', 'ofis', 'hammom'],
    priceFromUZS: 130000,
    priceNote_ru: 'От 130 000 сум/м²',
    priceNote_uz: '130 000 so‘m/m² dan'
  },
  {
    id: 'photo_print',
    slug: 'photo-print',
    name_ru: 'Рулонные шторы с фотонанесением',
    name_uz: 'Fototasvir tushirilgan rolikli pardalar',
    category: 'custom',
    badge_ru: 'Индивидуально',
    badge_uz: 'Shaxsiy dizayn',
    sunProtection: '80-100%',
    description_ru: 'Шторы с индивидуальной ультрафиолетовой печатью любого рисунка, фотографии, пейзажа или корпоративного логотипа компании.',
    description_uz: 'Mijoz istagan har qanday rasm, manzara, bolalar qahramonlari yoki kompaniya logotipi tushiriladigan ultrabinafsha bosmali pardalar.',
    specs_ru: [
      'Экологичные чернила без запаха, безопасные для детских комнат',
      'Высокая четкость изображения и насыщенные цвета',
      'УФ-печать не выгорает и не смывается водой',
      'Печать как на ткани День-Ночь, так и на Blackout'
    ],
    specs_uz: [
      'Hidsiz ekologik bo‘yoqlar, bolalar xonasi uchun mutlaqo xavfsiz',
      'Yuqori aniqlikdagi tasvir va yorqin ranglar',
      'Quyoshda so‘nmaydi va suvdan zararlanmaydi',
      'Kun-Tun va Blackout matolariga bosish imkoniyati'
    ],
    image: 'assets/images/catalog-photoprint.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-photoprint.svg',
    suitableRooms: ['детская', 'офис', 'кафе', 'гостиная', 'bolalar xonasi', 'ofis'],
    priceFromUZS: 250000,
    priceNote_ru: 'От 250 000 сум/м²',
    priceNote_uz: '250 000 so‘m/m² dan'
  },
  {
    id: 'roman',
    slug: 'roman',
    name_ru: 'Римские шторы',
    name_uz: 'Rim pardalari',
    category: 'roman',
    badge_ru: 'Дизайнерские',
    badge_uz: 'Dizaynerlik',
    sunProtection: '80%',
    description_ru: 'Элегантные шторы, собирающиеся при подъеме в ровные горизонтальные складки. Сочетают мягкость текстиля с функциональностью жалюзи.',
    description_uz: 'Ko‘tarilganda chiroyli gorizontal taxlamalar hosil qiluvchi nafis parda. Yumshoq mato shinamligi va jalyuzi qulayligini birlashtiradi.',
    specs_ru: [
      'Возможность пошива из интерьерных портьерных тканей',
      'Легко снимаются с карниза для деликатной стирки',
      'Специальный кордовый или роторно-цепочный карниз',
      'Идеально для классических и неоклассических интерьеров'
    ],
    specs_uz: [
      'Interyerga mos maxsus qalin matolardan tikish imkoniyati',
      'Yuvish uchun karnizdan osongina yechib olinadi',
      'Maxsus zanjirli mustahkam karniz',
      'Klassik va zamonaviy neoklassika interyeri uchun mos'
    ],
    image: 'assets/images/catalog-roman.svg',
    imageUrl: 'https://combo-uz.vercel.app/assets/images/catalog-roman.svg',
    suitableRooms: ['кухня', 'гостиная', 'кабинет', 'столовая', 'oshxona', 'mehmonxona'],
    priceFromUZS: 310000,
    priceNote_ru: 'От 310 000 сум/м²',
    priceNote_uz: '310 000 so‘m/m² dan'
  }
];

function getCatalog() {
  return CATALOG_ITEMS;
}

function getProductById(id) {
  if (!id) return null;
  const cleanId = String(id).toLowerCase().replace(/[-_]/g, '');
  return CATALOG_ITEMS.find(item => {
    const itemId = item.id.toLowerCase().replace(/[-_]/g, '');
    const itemSlug = item.slug.toLowerCase().replace(/[-_]/g, '');
    return itemId === cleanId || itemSlug === cleanId;
  }) || null;
}

function findProductByQuery(query) {
  if (!query) return null;
  const q = String(query).toLowerCase();

  if (q.includes('день') || q.includes('зебр') || q.includes('комбо') || q.includes('kun') || q.includes('zebra')) {
    return getProductById('day_night');
  }
  if (q.includes('двойн') || q.includes('дабл') || q.includes('double')) {
    return getProductById('double');
  }
  if (q.includes('плисс') || q.includes('сотов') || q.includes('honey') || q.includes('plisse')) {
    return getProductById('plisse');
  }
  if (q.includes('дикей') || q.includes('дики') || q.includes('dikey')) {
    return getProductById('dikey');
  }
  if (q.includes('кассет') || q.includes('короб') || q.includes('kasseta')) {
    return getProductById('cassette');
  }
  if (q.includes('мини') || q.includes('mini')) {
    return getProductById('mini');
  }
  if (q.includes('алюмин') || q.includes('горизонт') || q.includes('alyuminiy')) {
    return getProductById('horizontal_alu');
  }
  if (q.includes('фото') || q.includes('логотип') || q.includes('foto')) {
    return getProductById('photo_print');
  }
  if (q.includes('римск') || q.includes('rim')) {
    return getProductById('roman');
  }
  if (q.includes('вертикальн') || q.includes('vertikal')) {
    return getProductById('vertical_tulle');
  }
  if (q.includes('тюл') || q.includes('tul')) {
    return getProductById('tulle');
  }
  if (q.includes('ролло') || q.includes('рулон') || q.includes('rollo')) {
    return getProductById('rollo');
  }

  return null;
}

function formatProductCard(item, lang = 'ru') {
  if (!item) return '';
  const isUz = lang === 'uz';

  const title = isUz ? item.name_uz : item.name_ru;
  const desc = isUz ? item.description_uz : item.description_ru;
  const specs = isUz ? item.specs_uz : item.specs_ru;
  const priceNote = isUz ? item.priceNote_uz : item.priceNote_ru;
  const specsList = specs.map(s => `• ${s}`).join('\n');

  if (isUz) {
    return `🏷 **${title}**\n\n` +
      `📝 *Tavsif:* ${desc}\n\n` +
      `✨ *Asosiy xususiyatlari:*\n${specsList}\n\n` +
      `💰 *Narxi:* ${priceNote}\n` +
      `☀️ *Quyoshdan himoya:* ${item.sunProtection}\n\n` +
      `📐 *Bepul o‘lchash va matolar katalogini olib kelish uchun telefoningizni qoldiring!*`;
  }

  return `🏷 **${title}**\n\n` +
    `📝 *Описание:* ${desc}\n\n` +
    `✨ *Преимущества и особенности:*\n${specsList}\n\n` +
    `💰 *Стоимость:* ${priceNote}\n` +
    `☀️ *Защита от солнца:* ${item.sunProtection}\n\n` +
    `📐 *Чтобы заказать бесплатный замер и посмотреть образцы тканей вживую, подскажите ваш номер телефона!*`;
}

module.exports = {
  CATALOG_ITEMS,
  getCatalog,
  getProductById,
  findProductByQuery,
  formatProductCard
};
