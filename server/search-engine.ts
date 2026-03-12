import pg from "pg";
import { shopifyAdminGraphQL, shopifyFetch } from "./shopify";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
pool.on('error', (err: Error) => {
  console.error('[SearchEngine DB] Unexpected error on idle client:', err.message);
});

const SYNONYM_GROUPS: string[][] = [
  // ===== ELECTRONICS & DEVICES =====
  ['earbuds', 'headphones', 'earphones', 'سماعات', 'سماعة', 'سماعه', 'هيدفون', 'ايربودز', 'earphone', 'headphone', 'headset', 'هيدست', 'سمعات', 'سمعه', 'سمعة', 'هدفون', 'سماعات اذن', 'سماعات بلوتوث', 'سماعات راس', 'هندز فري', 'هاندز فري', 'handsfree'],
  ['charger', 'شاحن', 'شواحن', 'charging', 'شحن', 'شاجن', 'شارجر', 'تشارج', 'شحنه', 'شحنة', 'شاحنه', 'شحان'],
  ['cable', 'cord', 'wire', 'كيبل', 'كابل', 'سلك', 'وصلة', 'وصله', 'كابلات', 'كيبلات', 'اسلاك', 'توصيلة', 'توصيله', 'سلوك'],
  ['phone', 'mobile', 'smartphone', 'جوال', 'هاتف', 'موبايل', 'تلفون', 'تليفون', 'جهاز', 'خلوي', 'محمول', 'cellphone', 'تلفونات', 'جوالات', 'موبايلات', 'خليوي', 'فون', 'جهاز خلوي'],
  ['laptop', 'notebook', 'لابتوب', 'لاب توب', 'حاسوب', 'كمبيوتر', 'حاسب', 'computer', 'pc', 'لابتوبات', 'كمبيوترات', 'لاپتوب', 'كومبيوتر', 'حاسب محمول'],
  ['tablet', 'ipad', 'تابلت', 'تابليت', 'آيباد', 'ايباد', 'تاب', 'تابلتات', 'آي باد', 'تاب لت'],
  ['tv', 'television', 'تلفزيون', 'تلفاز', 'تي في', 'شاشة تلفزيون', 'شاشه تلفزيون', 'تلفزيونات', 'تلفاز', 'تلفزون', 'تلفزيون ذكي', 'smart tv', 'تليفزيون', 'تليفزون'],
  ['watch', 'smartwatch', 'ساعة', 'ساعه', 'ساعة ذكية', 'smart watch', 'ساعات', 'سمارت ووتش', 'ساعه ذكيه', 'ساعة يد'],
  ['speaker', 'سماعة بلوتوث', 'سبيكر', 'مكبر صوت', 'speakers', 'bluetooth speaker', 'سبيكرات', 'مكبرات', 'مكبر', 'صوتيات', 'سماعة خارجية'],
  ['monitor', 'screen', 'display', 'شاشة', 'شاشه', 'شاشات', 'مونيتور', 'شاشة كمبيوتر', 'ديسبلاي'],
  ['camera', 'كاميرا', 'كام', 'cam', 'كاميرات', 'تصوير', 'كاميره'],
  ['printer', 'طابعة', 'طابعه', 'برنتر', 'طابعات', 'طبعه', 'طباعة', 'طبّاعة'],
  ['scanner', 'ماسح', 'ماسح ضوئي', 'سكانر'],
  ['router', 'راوتر', 'موجه', 'روتر', 'routers', 'راوترات', 'مودم', 'modem', 'انترنت'],
  ['microphone', 'mic', 'مايك', 'مايكروفون', 'ميكروفون', 'مايكات', 'مايكرفون'],
  ['projector', 'بروجكتر', 'بروجكتور', 'عارض', 'بروجيكتور', 'بروجيكتر', 'داتا شو', 'داتاشو', 'بروجيكتر'],
  ['controller', 'يد تحكم', 'يدة تحكم', 'جوي ستيك', 'جويستيك', 'يدة بلاي ستيشن', 'يدة', 'يده', 'ذراع تحكم', 'جويستك'],

  // ===== ACCESSORIES =====
  ['case', 'cover', 'كفر', 'جراب', 'حافظة', 'حافظه', 'غطاء', 'كيس', 'كفرات', 'جرابات', 'غطا', 'كفرة', 'كيسة', 'غلاف'],
  ['screen protector', 'tempered glass', 'واقي شاشة', 'واقي شاشه', 'حماية شاشة', 'حماية شاشه', 'زجاج', 'glass', 'حمايه', 'واقي', 'سكرين', 'لزقة', 'لزقه', 'حماية', 'سكرين بروتكتر'],
  ['power bank', 'battery', 'بطارية', 'بطاريه', 'شاحن متنقل', 'باور بانك', 'بنك طاقة', 'powerbank', 'بور بانك', 'باوربانك', 'بطاريات', 'شاحن تنقل', 'بنك شحن'],
  ['mouse', 'ماوس', 'فأرة', 'فارة', 'فاره', 'ماوسات', 'ماوس لاسلكي'],
  ['keyboard', 'كيبورد', 'لوحة مفاتيح', 'لوحه مفاتيح', 'كيبوورد', 'كيبوردات'],
  ['adapter', 'محول', 'محولة', 'محوله', 'ادابتر', 'أدابتر', 'ادبتر', 'power adapter', 'محول كهربا', 'محول شحن'],
  ['hub', 'هب', 'موزع', 'دونقل', 'dongle', 'dock', 'محطة', 'دوك', 'محطة توصيل'],
  ['stand', 'holder', 'mount', 'حامل', 'ستاند', 'حامل جوال', 'قاعدة', 'قاعده', 'حمالة', 'حماله', 'ستاندات', 'حامل تلفون', 'حامل لابتوب'],
  ['tripod', 'ترايبود', 'حامل كاميرا', 'ثلاثي', 'تراي بود'],
  ['remote', 'ريموت', 'ريموتات', 'تحكم', 'جهاز تحكم', 'ريموت كنترول'],
  ['sticker', 'ستيكر', 'ملصق', 'لاصق', 'ستكر', 'ستيكرات'],

  // ===== STORAGE =====
  ['storage', 'memory', 'ssd', 'hard drive', 'تخزين', 'ذاكرة', 'ذاكره', 'هارد', 'فلاشة', 'فلاشه', 'flash', 'usb drive', 'memory card', 'sd card', 'هاردسك', 'هارد دسك', 'هارديسك', 'ميموري', 'فلاش ميموري', 'هارد ديسك'],
  ['usb', 'يو اس بي', 'يواسبي', 'يو إس بي'],

  // ===== CONNECTIVITY =====
  ['wireless', 'bluetooth', 'wifi', 'لاسلكي', 'بلوتوث', 'واي فاي', 'wi-fi', 'بلوتوس', 'وايرلس'],
  ['cable', 'سلك', 'كيبل', 'كابل', 'وصلة', 'وصله'],

  // ===== GAMING =====
  ['gaming', 'قيمنق', 'قيمنج', 'العاب', 'game', 'gamer', 'جيمنق', 'العاب فيديو', 'قيمينق', 'جيمنج', 'قيمينج', 'لعبة', 'لعبه', 'قيمينقات'],
  ['airpods', 'ايربودز', 'سماعات ابل', 'airpod', 'air pods', 'ايربود', 'اير بودز', 'ايربودس'],

  // ===== BAGS & CARRYING =====
  ['bag', 'backpack', 'شنطة', 'شنطه', 'حقيبة', 'حقيبه', 'باق', 'باك', 'شنته', 'شنتة', 'شنت', 'جنطة', 'جنطه', 'شنطات', 'حقائب', 'باكباك', 'باك باك', 'شنتا', 'جنط', 'جنطات', 'شنط', 'شنتات', 'جنطه', 'شنطة ظهر', 'حقيبة ظهر', 'رحال'],
  ['sleeve', 'laptop sleeve', 'حافظة لابتوب', 'جراب لابتوب', 'كيس لابتوب', 'سليف'],
  ['pouch', 'محفظة', 'محفظه', 'باوتش', 'كيس صغير'],

  // ===== HOME & KITCHEN =====
  ['heater', 'صوبة', 'صوبه', 'مدفأة', 'مدفأه', 'مدفاة', 'مدفاه', 'دفاية', 'دفايه', 'دفاي', 'سخان', 'تدفئة', 'تدفئه', 'هيتر', 'صوبات', 'دفايات', 'مدفئة', 'مدفئه', 'صوبا', 'radiator', 'رادياتور'],
  ['fan', 'مروحة', 'مروحه', 'مراوح', 'مروحات', 'مروحة سقف', 'مروحة طاولة'],
  ['air conditioner', 'ac', 'تكييف', 'مكيف', 'مكيفات', 'تبريد', 'مبرد', 'مبرده', 'مبردة', 'مبرد هواء', 'air cooler', 'اير كوندشن', 'اي سي', 'كندشن', 'كوندشنر', 'تكيف'],
  ['cleaner', 'vacuum', 'مكنسة', 'مكنسه', 'مكنسة كهربائية', 'مكانس', 'تنظيف', 'مكنسه كهربائيه', 'فاكيوم', 'هوفر'],
  ['iron', 'مكواة', 'مكواه', 'مكوى', 'مكوا', 'كوي', 'مكوة', 'كوايه', 'كوايا', 'مكوايه', 'steam iron', 'كوي بخار'],
  ['blender', 'mixer', 'خلاط', 'خلاطة', 'خلاطه', 'عصارة', 'عصاره', 'جوسر', 'juicer', 'خلاطات', 'عصارات', 'بلندر'],
  ['kettle', 'غلاية', 'غلايه', 'كاتل', 'غلاي', 'غلاية ماء', 'غلايه ماي', 'غلايات', 'ابريق', 'ابريق كهربائي'],
  ['thermos', 'ترمس', 'حافظة حرارة', 'حافظه حراره', 'ثيرموس', 'ترامس', 'ترمز'],
  ['coffee maker', 'ماكينة قهوة', 'ماكنة قهوة', 'قهوة', 'كوفي ميكر', 'ماكينة اسبرسو', 'اسبرسو', 'espresso', 'ماكنة كوفي', 'محضرة قهوة'],
  ['toaster', 'محمصة', 'محمصه', 'توستر', 'محمصة خبز', 'توست'],
  ['oven', 'فرن', 'فرنات', 'افران', 'فرن كهربائي', 'مايكرويف', 'microwave', 'ميكرويف'],
  ['air fryer', 'قلاية هوائية', 'قلايه هوائيه', 'اير فراير', 'قلاية', 'قلايه', 'قلاية هواء', 'قلاية بدون زيت', 'اير فرايرز', 'فراير'],
  ['scale', 'ميزان', 'موازين', 'ميزان رقمي', 'ميزان مطبخ'],
  ['water purifier', 'فلتر', 'فلتر ماء', 'فلاتر', 'تصفية', 'تنقية ماء', 'فلتر مياه'],

  // ===== PERSONAL CARE =====
  ['shaver', 'razor', 'ماكينة حلاقة', 'ماكنة حلاقة', 'شفرة', 'شفره', 'حلاقة', 'حلاقه', 'شيفر', 'موس حلاقة', 'ريزر', 'ماكينة حلاقه'],
  ['hair dryer', 'سشوار', 'سيشوار', 'مجفف شعر', 'مجفف', 'فين', 'استشوار', 'سشوير', 'درايير', 'dryer', 'هير دراير'],
  ['hair straightener', 'مكواة شعر', 'فرد شعر', 'ستريتنر', 'straightener', 'فير', 'مملس شعر', 'مكوة شعر', 'فرد'],
  ['trimmer', 'تريمر', 'مهذب', 'ماكينة تهذيب', 'قص شعر', 'ماكينة شعر', 'كليبر', 'clipper', 'ماكنة شعر'],
  ['electric toothbrush', 'فرشاة اسنان', 'فرشاة اسنان كهربائية', 'فرشة سنان', 'فرشاه', 'فرشه اسنان'],
  ['massager', 'مساج', 'جهاز مساج', 'تدليك', 'مدلك', 'مسّاج', 'مساجر'],

  // ===== TOOLS & HARDWARE =====
  ['drill', 'دريل', 'مثقاب', 'شنيور', 'دريلات', 'مثقب', 'خرامة', 'خرام', 'دريل كهربائي'],
  ['tool', 'tools', 'عدة', 'عده', 'ادوات', 'أدوات', 'عدد', 'عدة يدوية', 'طقم عدة'],
  ['screw', 'screwdriver', 'مفك', 'مفكات', 'براغي', 'سكرو', 'مفك براغي'],
  ['saw', 'منشار', 'مناشير', 'قص', 'منشار كهربائي'],
  ['wrench', 'مفتاح', 'مفتاح ربط', 'مفاتيح', 'رنج', 'مفتاح ربط'],
  ['tape', 'شريط', 'لاصق', 'تيب', 'شرائط', 'سلوتيب', 'شريط قياس', 'متر', 'ميتر', 'tape measure'],
  ['level', 'ميزان ماء', 'ليفل', 'ميزان حرارة'],
  ['glue', 'glue gun', 'مسدس شمع', 'غراء', 'لاصق', 'صمغ', 'مسدس غراء', 'قلو قن'],
  ['paint', 'spray', 'بوية', 'دهان', 'رش', 'سبراي', 'طلاء', 'رشاش'],
  ['generator', 'مولد', 'مولد كهرباء', 'مولدات', 'جنريتر', 'جنرتر'],
  ['compressor', 'كمبريسر', 'ضاغط', 'ضاغط هواء', 'كومبريسر', 'ضغط', 'نافخ'],
  ['welding', 'لحام', 'ماكينة لحام', 'لحّام', 'ولدنق'],
  ['grinder', 'جلاخة', 'جلاخه', 'قص حديد', 'جرايندر', 'صاروخ', 'صاروخ قص'],
  ['hammer', 'شاكوش', 'مطرقة', 'مطرقه', 'هامر'],
  ['plier', 'pliers', 'زردية', 'زرديه', 'كماشة', 'كماشه', 'بلايرز'],

  // ===== ELECTRICAL =====
  ['light', 'lamp', 'اضاءة', 'إضاءة', 'اضاءه', 'ضوء', 'لمبة', 'لمبه', 'مصباح', 'لمبات', 'انارة', 'إنارة', 'اناره', 'لمبه ليد', 'led', 'ليد', 'نور', 'انوار'],
  ['extension', 'توصيلة كهرباء', 'مشترك', 'توصيله', 'مقسم', 'اكستنشن', 'فيشة', 'فيشه', 'بلك', 'فيش', 'توصيلة', 'مشتركات', 'power strip'],
  ['solar', 'طاقة شمسية', 'طاقه شمسيه', 'سولار', 'لوح شمسي', 'الواح شمسية', 'شمسي'],
  ['inverter', 'انفرتر', 'محول كهربائي', 'يو بي اس', 'ups'],

  // ===== AUTOMOTIVE =====
  ['car', 'سيارة', 'سيارات', 'سياره', 'اكسسوارات سيارة', 'اكسسوارات سيارات', 'car accessories'],
  ['dash cam', 'كاميرا سيارة', 'كاميرا سياره', 'داش كام', 'كاميرا طبلون', 'كاميرا داش'],
  ['car charger', 'شاحن سيارة', 'شاحن سياره', 'شاحن ولاعة', 'شاحن قداحة'],
  ['car holder', 'حامل سيارة', 'حامل جوال سيارة', 'حامل تلفون سياره'],
  ['tire', 'اطار', 'اطارات', 'تاير', 'كفرات سيارة', 'دواليب', 'عجلات'],
  ['pump', 'مضخة', 'مضخه', 'منفاخ', 'نفاخ', 'بامب', 'منفاخ اطارات', 'كمبرسور هواء'],

  // ===== OUTDOOR & SPORTS =====
  ['bicycle', 'bike', 'دراجة', 'دراجه', 'بسكليت', 'بسكليتة', 'سيكل', 'دراجة هوائية'],
  ['scooter', 'سكوتر', 'اسكوتر', 'سكوتر كهربائي'],
  ['tent', 'خيمة', 'خيمه', 'تنت', 'خيام'],
  ['grill', 'شواية', 'شوايه', 'منقل', 'باربكيو', 'شوي', 'bbq'],
  ['cooler', 'ثلاجة تنقل', 'كولر', 'حافظة باردة', 'ثلاجة سيارة', 'ثلاجة صغيرة'],

  // ===== SAFETY & SECURITY =====
  ['security camera', 'كاميرا مراقبة', 'كاميرا مراقبه', 'كاميرا حماية', 'كاميرات مراقبة', 'كاميرا واي فاي', 'كاميرا امنية'],
  ['safe', 'خزنة', 'خزنه', 'خزائن', 'صندوق امان'],
  ['lock', 'قفل', 'اقفال', 'قفل ذكي', 'smart lock', 'قفل الكتروني'],
  ['alarm', 'انذار', 'إنذار', 'جرس انذار', 'منبه', 'سيرين'],

  // ===== BRANDS =====
  ['iphone', 'آيفون', 'ايفون', 'ايفونات'],
  ['samsung', 'سامسونج', 'سامسنج', 'سمسنج', 'سمسونج', 'samung', 'samsug', 'samsong', 'سامسونق'],
  ['apple', 'ابل', 'آبل', 'اپل', 'aple', 'appl', 'appel'],
  ['huawei', 'هواوي', 'هوواي', 'huawi', 'hawai', 'hauwei', 'هواواي'],
  ['anker', 'انكر', 'أنكر', 'إنكر', 'ankr', 'ankor', 'ancker'],
  ['xiaomi', 'شاومي', 'شاومى', 'xaomi', 'xiomi', 'xioami', 'زاومي'],
  ['baseus', 'باسيوس', 'بيسوس', 'baesus', 'bases', 'basus'],
  ['sony', 'سوني', 'سونى', 'soni'],
  ['lenovo', 'لينوفو', 'لنوفو', 'lenovoo', 'lenov'],
  ['dell', 'دل', 'ديل'],
  ['hp', 'اتش بي', 'هاش بي', 'اج بي'],
  ['asus', 'اسوس', 'آسوس', 'asuz'],
  ['jbl', 'جي بي ال', 'جيبيال'],
  ['philips', 'فيليبس', 'فيلبس', 'philp', 'فيلبص'],
  ['dyson', 'دايسون', 'دايسن'],
  ['bosch', 'بوش', 'bosh'],
  ['lg', 'ال جي', 'الجي'],
  ['realme', 'ريلمي', 'ريلمى', 'relme', 'realmi'],
  ['oppo', 'اوبو', 'أوبو', 'opo'],
  ['oneplus', 'ون بلس', 'ونبلس', 'one plus', '1+'],
  ['vivo', 'فيفو'],
  ['acer', 'ايسر', 'آيسر', 'accer'],
  ['nikon', 'نيكون'],
  ['canon', 'كانون', 'كانن', 'cannon'],
  ['logitech', 'لوجيتك', 'لوجيتيك', 'logitec'],
  ['beats', 'بيتس'],
  ['hyperx', 'هايبر اكس', 'هايبراكس'],
  ['razer', 'ريزر'],
  ['corsair', 'كورسير'],
  ['wd', 'western digital', 'ويسترن ديجيتال'],
  ['seagate', 'سيجيت'],
  ['sandisk', 'سانديسك', 'سان ديسك', 'san disk'],
  ['joyroom', 'جويروم', 'جوي روم', 'جوي رووم', 'joyrrom', 'joyrom', 'joiroom'],
  ['eufy', 'يوفي', 'eufi'],
  ['soundcore', 'ساوندكور', 'sound core'],
  ['ugreen', 'يوجرين', 'يو جرين'],
  ['momax', 'موماكس'],
  ['ravpower', 'راف باور', 'rav power'],
  ['powerology', 'باورولوجي', 'بورولجي'],
  ['green lion', 'جرين لايون', 'greenlion'],
  ['hoco', 'هوكو'],
  ['remax', 'ريماكس'],
  ['ldnio', 'ال دي ان'],
  ['mcdodo', 'مكدودو', 'ماكدودو'],
  ['oraimo', 'اورايمو'],
  ['porodo', 'بورودو'],
  ['acefast', 'ايس فاست'],
  ['nintendo', 'نينتندو', 'ننتندو'],
  ['playstation', 'بلايستيشن', 'بلاي ستيشن', 'ps5', 'ps4', 'بليستيشن', 'سوني بلايستيشن', 'بلاي ستيشين'],
  ['xbox', 'اكس بوكس', 'إكس بوكس'],
  ['milwaukee', 'ملواكي', 'ميلووكي', 'ملووكي'],
  ['dewalt', 'ديوالت', 'دوالت', 'ديوولت'],
  ['makita', 'ماكيتا', 'مكيتا'],
  ['stanley', 'ستانلي', 'ستنلي'],
  ['hikoki', 'هيكوكي', 'hitachi', 'هيتاشي'],
  ['total', 'توتال'],
  ['ingco', 'اينكو', 'انكو'],
  ['marshall', 'مارشال'],
  ['bose', 'بوز'],
  ['harman kardon', 'هارمان كاردون', 'هارمن كاردن', 'harman'],
  ['google', 'جوجل', 'قوقل'],
  ['microsoft', 'مايكروسوفت'],
  ['nothing', 'ناثنج', 'نثنق'],
  ['honor', 'هونر', 'اونر'],
  ['motorola', 'موتورولا'],
  ['nokia', 'نوكيا'],
  ['tcl', 'تي سي ال'],
  ['hisense', 'هايسنس'],
  ['dji', 'دي جي اي'],
  ['gopro', 'جوبرو', 'قوبرو'],
  ['tp-link', 'تي بي لنك', 'tplink'],
  ['netgear', 'نتجير'],
  ['black and decker', 'بلاك اند ديكر', 'بلاك ديكر', 'black decker', 'بلاك آند ديكر'],
  ['midea', 'ميديا'],
  ['dreame', 'دريمي', 'دريم'],
  ['roborock', 'روبوروك'],
  ['ecovacs', 'ايكوفاكس'],
  ['tefal', 'تيفال'],
  ['braun', 'براون'],
  ['panasonic', 'باناسونيك', 'بناسونيك'],
  ['kenwood', 'كينوود'],
  ['moulinex', 'مولينكس'],
  ['toshiba', 'توشيبا'],

  // ===== GENERAL TERMS =====
  ['original', 'اصلي', 'اصليه', 'أصلي', 'اورجنال', 'اورجينال', 'original'],
  ['new', 'جديد', 'جديده', 'جديدة'],
  ['offer', 'عرض', 'عروض', 'تخفيض', 'تخفيضات', 'خصم', 'خصومات', 'sale', 'تنزيلات', 'اوفر', 'عروضات', 'discount'],
  ['accessories', 'اكسسوارات', 'اكسسوار', 'ملحقات', 'اكسسوار', 'إكسسوارات', 'اكسسورات'],
  ['portable', 'متنقل', 'محمول', 'متنقله', 'بورتبل'],
  ['smart', 'ذكي', 'ذكيه', 'ذكية', 'سمارت'],
  ['mini', 'صغير', 'صغيره', 'صغيرة', 'ميني'],
  ['pro', 'برو', 'احترافي', 'بروفشنال', 'professional'],
  ['set', 'طقم', 'مجموعة', 'سيت', 'مجموعه'],
  ['spare', 'قطع غيار', 'قطع بديلة', 'سبير', 'بديل', 'بديله'],
];

function buildSynonymMap(groups: string[][]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const group of groups) {
    for (const term of group) {
      const lower = term.toLowerCase();
      if (!map[lower]) map[lower] = [];
      for (const other of group) {
        const otherLower = other.toLowerCase();
        if (otherLower !== lower && !map[lower].includes(otherLower)) {
          map[lower].push(otherLower);
        }
      }
    }
  }
  return map;
}

let SYNONYM_MAP = buildSynonymMap(SYNONYM_GROUPS);

let autoSynonymsBuilt = false;
async function buildAutoSynonyms(): Promise<void> {
  if (autoSynonymsBuilt) return;
  try {
    const res = await pool.query(`
      SELECT DISTINCT vendor FROM search_index WHERE vendor IS NOT NULL AND vendor != ''
    `);
    const vendors = res.rows.map((r: any) => r.vendor);

    const titleRes = await pool.query(`
      SELECT title, title_ar, vendor, product_type, tags FROM search_index
      WHERE title IS NOT NULL LIMIT 5000
    `);

    const wordPairs = new Map<string, Set<string>>();

    for (const row of titleRes.rows) {
      const enTitle = (row.title || '').toLowerCase();
      const arTitle = (row.title_ar || '').toLowerCase();
      if (!arTitle || arTitle === enTitle) continue;

      const enWords = enTitle.split(/[\s\-–—()[\]{},;:'"!?./]+/).filter((w: string) => w.length >= 3);
      const arWords = arTitle.split(/[\s\-–—()[\]{},;:'"!?./]+/).filter((w: string) => w.length >= 2 && /[\u0600-\u06FF]/.test(w));

      for (const ew of enWords) {
        for (const aw of arWords) {
          if (!wordPairs.has(ew)) wordPairs.set(ew, new Set());
          wordPairs.get(ew)!.add(aw);
        }
      }
    }

    const autoGroups: string[][] = [];

    for (const v of vendors) {
      const vLower = v.toLowerCase();
      if (!SYNONYM_MAP[vLower]) {
        autoGroups.push([vLower]);
      }
    }

    const commonPairs = new Map<string, Map<string, number>>();
    for (const [en, arSet] of wordPairs) {
      for (const ar of arSet) {
        if (!commonPairs.has(en)) commonPairs.set(en, new Map());
        const count = commonPairs.get(en)!.get(ar) || 0;
        commonPairs.get(en)!.set(ar, count + 1);
      }
    }

    for (const [en, arMap] of commonPairs) {
      if (SYNONYM_MAP[en]) continue;
      const topAr = [...arMap.entries()]
        .filter(([_, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word);
      if (topAr.length > 0 && en.length >= 3) {
        autoGroups.push([en, ...topAr]);
      }
    }

    if (autoGroups.length > 0) {
      const combined = [...SYNONYM_GROUPS, ...autoGroups];
      SYNONYM_MAP = buildSynonymMap(combined);
      console.log(`[SearchEngine] Auto-built ${autoGroups.length} synonym groups from product data`);
    }
    autoSynonymsBuilt = true;
  } catch (err) {
    console.error("[SearchEngine] Auto-synonym build failed:", err);
  }
}

const SHOPIFY_SYNC_QUERY = `
  query SyncProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "status:active") {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id title handle vendor productType tags description status
          priceRangeV2 { minVariantPrice { amount currencyCode } }
          images(first: 1) { edges { node { url } } }
          variants(first: 1) { edges { node { availableForSale compareAtPrice } } }
        }
      }
    }
  }
`;

export async function ensureSearchTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_index (
        id SERIAL PRIMARY KEY,
        shopify_id TEXT UNIQUE NOT NULL,
        handle TEXT NOT NULL,
        title TEXT,
        title_ar TEXT,
        description TEXT,
        description_ar TEXT,
        vendor TEXT,
        product_type TEXT,
        tags TEXT[] DEFAULT '{}',
        available_for_sale BOOLEAN DEFAULT true,
        price NUMERIC(10,2),
        compare_at_price NUMERIC(10,2),
        currency TEXT DEFAULT 'JOD',
        image_url TEXT,
        tsv_en TSVECTOR,
        tsv_ar TSVECTOR,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS search_index_tsv_en ON search_index USING gin(tsv_en);
      CREATE INDEX IF NOT EXISTS search_index_tsv_ar ON search_index USING gin(tsv_ar);
      CREATE INDEX IF NOT EXISTS search_index_handle ON search_index(handle);
      CREATE INDEX IF NOT EXISTS search_index_vendor ON search_index(vendor);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS popular_searches (
        term TEXT PRIMARY KEY,
        search_count INTEGER DEFAULT 1,
        language TEXT DEFAULT 'ar',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_analytics (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        results_count INTEGER DEFAULT 0,
        language TEXT DEFAULT 'ar',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[SearchEngine] Tables ensured.");
  } catch (err: any) {
    console.error("[SearchEngine] ensureSearchTables error:", err.message);
  } finally {
    client.release();
  }
}

export async function syncProductIndex(): Promise<number> {
  console.log("[SearchEngine] Starting product sync from Shopify...");
  const startTime = Date.now();

  let allProducts: any[] = [];
  let hasNext = true;
  let cursor: string | null = null;
  let mainRetries = 0;

  while (hasNext) {
    try {
      const vars: any = { first: 250 };
      if (cursor) vars.after = cursor;
      const data = await shopifyAdminGraphQL(SHOPIFY_SYNC_QUERY, vars);
      const edges = data.products.edges;
      allProducts.push(...edges.map((e: any) => e.node));
      hasNext = data.products.pageInfo.hasNextPage;
      cursor = data.products.pageInfo.endCursor;
      mainRetries = 0;
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
      if (mainRetries < 5 && (msg.includes('Throttled') || msg.includes('throttl') || msg.includes('THROTTLED'))) {
        mainRetries++;
        console.log(`[SearchEngine] Product fetch throttled, retry ${mainRetries}/5 in 5s... (${allProducts.length} products so far)`);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        throw err;
      }
    }
  }

  const arMap = new Map<string, { title: string; description: string }>();

  const AR_QUERY = `
    query ArProducts($first: Int!, $after: String, $language: LanguageCode) @inContext(language: $language) {
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            title
            description
          }
        }
      }
    }
  `;

  try {
    let arHasNext = true;
    let arCursor: string | null = null;
    let arRetries = 0;
    while (arHasNext) {
      try {
        const arVars: any = { first: 250, language: 'AR' };
        if (arCursor) arVars.after = arCursor;
        const arData = await shopifyFetch(AR_QUERY, arVars);
        const arEdges = arData.products?.edges || [];
        for (const edge of arEdges) {
          const node = edge.node;
          if (node.id && node.title) {
            arMap.set(node.id, { title: node.title, description: node.description || '' });
          }
        }
        arHasNext = arData.products?.pageInfo?.hasNextPage || false;
        arCursor = arData.products?.pageInfo?.endCursor || null;
        arRetries = 0;
      } catch (pageErr: any) {
        const msg = typeof pageErr === 'string' ? pageErr : pageErr?.message || JSON.stringify(pageErr);
        if (arRetries < 5 && (msg.includes('Throttled') || msg.includes('throttl') || msg.includes('THROTTLED'))) {
          arRetries++;
          console.log(`[SearchEngine] Arabic fetch throttled, retry ${arRetries}/5 in 5s... (${arMap.size} translations so far)`);
          await new Promise(r => setTimeout(r, 5000));
        } else {
          throw pageErr;
        }
      }
    }
    console.log(`[SearchEngine] Fetched ${arMap.size} Arabic translations`);
  } catch (err) {
    console.error("[SearchEngine] Failed to fetch Arabic translations:", err);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM search_index');

    let skippedDraft = 0;
    for (const p of allProducts) {
      if (p.status && p.status !== 'ACTIVE') { skippedDraft++; continue; }
      const price = p.priceRangeV2?.minVariantPrice?.amount ? parseFloat(p.priceRangeV2.minVariantPrice.amount) : null;
      const compareAtRaw = p.variants?.edges?.[0]?.node?.compareAtPrice;
      const compareAt = compareAtRaw ? parseFloat(compareAtRaw) : null;
      const currency = p.priceRangeV2?.minVariantPrice?.currencyCode || 'JOD';
      const imageUrl = p.images?.edges?.[0]?.node?.url || null;
      const tags = p.tags || [];
      const availableForSale = p.variants?.edges?.some((e: any) => e.node.availableForSale) ?? true;
      const arData = arMap.get(p.id);

      const enText = [p.title, p.vendor, p.productType, p.description, ...tags].filter(Boolean).join(' ');
      const arText = [arData?.title, arData?.description, p.vendor].filter(Boolean).join(' ');

      await client.query(
        `INSERT INTO search_index 
         (shopify_id, handle, title, title_ar, description, description_ar, vendor, product_type, tags,
          available_for_sale, price, compare_at_price, currency, image_url, tsv_en, tsv_ar)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
           setweight(to_tsvector('english', COALESCE($3,'')), 'A') ||
           setweight(to_tsvector('english', COALESCE($7,'')), 'B') ||
           setweight(to_tsvector('english', COALESCE($8,'')), 'B') ||
           setweight(to_tsvector('english', COALESCE($5,'')), 'C') ||
           setweight(to_tsvector('english', COALESCE(array_to_string($9::text[], ' '),'')), 'C'),
           setweight(to_tsvector('simple', COALESCE($4,'')), 'A') ||
           setweight(to_tsvector('simple', COALESCE($6,'')), 'C')
         )
         ON CONFLICT (shopify_id) DO UPDATE SET
           title=EXCLUDED.title, title_ar=EXCLUDED.title_ar, description=EXCLUDED.description,
           description_ar=EXCLUDED.description_ar, vendor=EXCLUDED.vendor, product_type=EXCLUDED.product_type,
           tags=EXCLUDED.tags, available_for_sale=EXCLUDED.available_for_sale, price=EXCLUDED.price,
           compare_at_price=EXCLUDED.compare_at_price, currency=EXCLUDED.currency, image_url=EXCLUDED.image_url,
           tsv_en=EXCLUDED.tsv_en, tsv_ar=EXCLUDED.tsv_ar, updated_at=NOW()`,
        [
          p.id, p.handle, p.title, arData?.title || null,
          p.description || null, arData?.description || null,
          p.vendor || null, p.productType || null, tags,
          availableForSale, price, compareAt, currency, imageUrl
        ]
      );
    }

    await client.query('COMMIT');
    const elapsed = Date.now() - startTime;
    console.log(`[SearchEngine] Synced ${allProducts.length - skippedDraft} active products in ${elapsed}ms (skipped ${skippedDraft} draft/archived)`);
    autoSynonymsBuilt = false;
    await buildAutoSynonyms();
    return allProducts.length;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("[SearchEngine] Sync failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function quickStockRefresh(): Promise<number> {
  console.log("[SearchEngine] Quick stock refresh starting...");
  const startTime = Date.now();
  let updated = 0;
  let hasNext = true;
  let cursor: string | null = null;

  const STOCK_QUERY = `
    query StockCheck($after: String) {
      products(first: 250, after: $after, query: "status:active") {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            status
            totalInventory
          }
        }
      }
    }
  `;

  const stockMap = new Map<string, boolean>();

  while (hasNext) {
    const vars: any = {};
    if (cursor) vars.after = cursor;
    const data = await shopifyAdminGraphQL(STOCK_QUERY, vars);
    const edges = data.products?.edges || [];
    for (const e of edges) {
      const available = (e.node.totalInventory > 0) && e.node.status === 'ACTIVE';
      stockMap.set(e.node.id, available);
    }
    hasNext = data.products?.pageInfo?.hasNextPage || false;
    cursor = data.products?.pageInfo?.endCursor || null;
  }

  const client = await pool.connect();
  try {
    for (const [shopifyId, available] of stockMap) {
      const res = await client.query(
        'UPDATE search_index SET available_for_sale = $1, updated_at = NOW() WHERE shopify_id = $2 AND available_for_sale != $1',
        [available, shopifyId]
      );
      updated += res.rowCount || 0;
    }
  } finally {
    client.release();
  }

  const elapsed = Date.now() - startTime;
  console.log(`[SearchEngine] Stock refresh done in ${elapsed}ms — checked ${stockMap.size} products, updated ${updated}`);
  return updated;
}

function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')  // remove tashkeel/diacritics
    .replace(/[أإآٱ]/g, 'ا')                // normalize alef variants
    .replace(/ة/g, 'ه')                      // taa marbuta → haa
    .replace(/ى/g, 'ي')                      // alef maqsura → yaa
    .replace(/ؤ/g, 'و')                      // waw hamza → waw
    .replace(/ئ/g, 'ي')                      // yaa hamza → yaa
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

let cachedVendors: string[] = [];
let vendorCacheTime = 0;

async function getVendorList(): Promise<string[]> {
  if (Date.now() - vendorCacheTime < 10 * 60 * 1000 && cachedVendors.length > 0) {
    return cachedVendors;
  }
  try {
    const res = await pool.query('SELECT DISTINCT vendor FROM search_index WHERE vendor IS NOT NULL AND vendor != \'\'');
    cachedVendors = res.rows.map((r: any) => r.vendor);
    vendorCacheTime = Date.now();
  } catch {}
  return cachedVendors;
}

function findFuzzyVendorMatches(query: string, vendors: string[]): string[] {
  const q = query.toLowerCase().trim();
  const matches: string[] = [];
  for (const vendor of vendors) {
    const v = vendor.toLowerCase();
    const dist = levenshtein(q, v);
    const maxLen = Math.max(q.length, v.length);
    const threshold = maxLen <= 4 ? 1 : maxLen <= 7 ? 2 : 3;
    if (dist <= threshold && dist > 0) {
      matches.push(vendor);
    }
    if (q.length >= 3 && (v.includes(q) || q.includes(v))) {
      matches.push(vendor);
    }
  }
  return [...new Set(matches)];
}

function arabicSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const na = normalizeArabic(a);
  const nb = normalizeArabic(b);
  if (na === nb) return 0.95;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.length === 0) return 0;
  if (longer.includes(shorter) && shorter.length >= 3) return 0.8;
  let matches = 0;
  const len = Math.min(na.length, nb.length);
  for (let i = 0; i < len; i++) {
    if (na[i] === nb[i]) matches++;
  }
  return matches / Math.max(na.length, nb.length);
}

function expandQueryWithSynonyms(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = new Set<string>();
  expanded.add(query.toLowerCase());

  const normalizedQuery = normalizeArabic(query.toLowerCase());
  if (normalizedQuery !== query.toLowerCase()) {
    expanded.add(normalizedQuery);
  }

  for (const word of words) {
    const normalizedWord = normalizeArabic(word);

    if (SYNONYM_MAP[word]) {
      for (const syn of SYNONYM_MAP[word]) expanded.add(syn);
    }
    if (normalizedWord !== word && SYNONYM_MAP[normalizedWord]) {
      for (const syn of SYNONYM_MAP[normalizedWord]) expanded.add(syn);
    }

    for (const [term, syns] of Object.entries(SYNONYM_MAP)) {
      const normalizedTerm = normalizeArabic(term);
      if (term.length > 3 && (word.includes(term) || normalizedWord.includes(normalizedTerm))) {
        for (const syn of syns) expanded.add(syn);
      }
      if (syns.includes(word) || syns.map(s => normalizeArabic(s)).includes(normalizedWord)) {
        expanded.add(term);
        for (const syn of syns) expanded.add(syn);
      }
      if (word.length >= 3 && arabicSimilarity(word, term) >= 0.7) {
        expanded.add(term);
        for (const syn of syns) expanded.add(syn);
      }
      for (const syn of syns) {
        if (word.length >= 3 && syn.length >= 3 && arabicSimilarity(word, syn) >= 0.7) {
          expanded.add(term);
          for (const s of syns) expanded.add(s);
          break;
        }
      }
    }
  }

  return Array.from(expanded);
}

function buildTsQuery(terms: string[]): string {
  return terms
    .filter(t => t.length >= 2)
    .map(t => t.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').trim())
    .filter(Boolean)
    .map(t => t.split(/\s+/).map(w => `${w}:*`).join(' & '))
    .join(' | ');
}

interface SearchOptions {
  query: string;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  inStock?: boolean;
  limit?: number;
  offset?: number;
}

interface SearchResult {
  products: any[];
  totalCount: number;
  suggestions: string[];
  brands: { name: string; count: number }[];
  priceRange: { min: number; max: number };
}

export async function advancedSearch(options: SearchOptions): Promise<SearchResult> {
  const {
    query, language = 'en', minPrice, maxPrice, brand, inStock,
    limit = 30, offset = 0,
  } = options;

  const q = query.trim();
  if (!q) return { products: [], totalCount: 0, suggestions: [], brands: [], priceRange: { min: 0, max: 0 } };

  await buildAutoSynonyms();

  const normalizedQ = normalizeArabic(q);
  const synonymTerms = expandQueryWithSynonyms(q);

  const vendors = await getVendorList();
  const fuzzyVendors = findFuzzyVendorMatches(q, vendors);
  for (const fv of fuzzyVendors) {
    synonymTerms.push(fv.toLowerCase());
  }
  for (const word of q.toLowerCase().split(/\s+/)) {
    const wordFuzzy = findFuzzyVendorMatches(word, vendors);
    for (const fv of wordFuzzy) {
      if (!synonymTerms.includes(fv.toLowerCase())) synonymTerms.push(fv.toLowerCase());
    }
  }

  const tsQuery = buildTsQuery(synonymTerms);
  const isArabic = language === 'ar' || /[\u0600-\u06FF]/.test(q);

  const allSynonymLikes = [...new Set(synonymTerms
    .filter(t => t.length >= 2)
    .map(t => t.toLowerCase()))];

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (tsQuery) {
    const normalizedLike = `%${normalizedQ}%`;
    const synLikeConditions = allSynonymLikes.map((syn, i) => {
      const idx = paramIdx + 4 + i;
      return `LOWER(COALESCE(vendor,'')) = $${idx} OR COALESCE(vendor,'') ILIKE $${idx} || '%' OR title ILIKE '%' || $${idx} || '%' OR COALESCE(title_ar,'') ILIKE '%' || $${idx} || '%'`;
    }).join('\n      OR ');

    conditions.push(`(
      tsv_ar @@ to_tsquery('simple', $${paramIdx})
      OR tsv_en @@ to_tsquery('english', $${paramIdx})
      OR similarity(title, $${paramIdx + 1}) > 0.1
      OR similarity(COALESCE(title_ar,''), $${paramIdx + 1}) > 0.1
      OR similarity(COALESCE(vendor,''), $${paramIdx + 1}) > 0.08
      OR title ILIKE $${paramIdx + 2}
      OR COALESCE(title_ar,'') ILIKE $${paramIdx + 2}
      OR COALESCE(vendor,'') ILIKE $${paramIdx + 2}
      OR COALESCE(product_type,'') ILIKE $${paramIdx + 2}
      OR EXISTS (SELECT 1 FROM unnest(tags) AS t WHERE t ILIKE $${paramIdx + 2})
      OR TRANSLATE(COALESCE(title_ar,''), 'أإآٱةىؤئ', 'اااههيوي') ILIKE $${paramIdx + 3}
      OR TRANSLATE(COALESCE(title,''), 'أإآٱةىؤئ', 'اااههيوي') ILIKE $${paramIdx + 3}
      OR TRANSLATE(COALESCE(vendor,''), 'أإآٱةىؤئ', 'اااههيوي') ILIKE $${paramIdx + 3}
      ${synLikeConditions ? `OR ${synLikeConditions}` : ''}
    )`);
    params.push(tsQuery, q, `%${q}%`, normalizedLike, ...allSynonymLikes);
    paramIdx += 4 + allSynonymLikes.length;
  }

  if (minPrice !== undefined) {
    conditions.push(`price >= $${paramIdx}`);
    params.push(minPrice);
    paramIdx++;
  }
  if (maxPrice !== undefined) {
    conditions.push(`price <= $${paramIdx}`);
    params.push(maxPrice);
    paramIdx++;
  }
  if (brand) {
    conditions.push(`vendor ILIKE $${paramIdx}`);
    params.push(brand);
    paramIdx++;
  }
  if (inStock) {
    conditions.push(`available_for_sale = true`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const baseConditions: string[] = [];
  const baseParams: any[] = [];
  let baseParamIdx = 1;
  if (tsQuery) {
    const normalizedLikeBase = `%${normalizedQ}%`;
    const baseSynLikeConditions = allSynonymLikes.map((syn, i) => {
      const idx = baseParamIdx + 4 + i;
      return `LOWER(COALESCE(vendor,'')) = $${idx} OR COALESCE(vendor,'') ILIKE $${idx} || '%' OR title ILIKE '%' || $${idx} || '%' OR COALESCE(title_ar,'') ILIKE '%' || $${idx} || '%'`;
    }).join('\n      OR ');

    baseConditions.push(`(
      tsv_ar @@ to_tsquery('simple', $${baseParamIdx})
      OR tsv_en @@ to_tsquery('english', $${baseParamIdx})
      OR similarity(title, $${baseParamIdx + 1}) > 0.1
      OR similarity(COALESCE(title_ar,''), $${baseParamIdx + 1}) > 0.1
      OR similarity(COALESCE(vendor,''), $${baseParamIdx + 1}) > 0.08
      OR title ILIKE $${baseParamIdx + 2}
      OR COALESCE(title_ar,'') ILIKE $${baseParamIdx + 2}
      OR COALESCE(vendor,'') ILIKE $${baseParamIdx + 2}
      OR COALESCE(product_type,'') ILIKE $${baseParamIdx + 2}
      OR EXISTS (SELECT 1 FROM unnest(tags) AS t WHERE t ILIKE $${baseParamIdx + 2})
      OR TRANSLATE(COALESCE(title_ar,''), 'أإآٱةىؤئ', 'اااههيوي') ILIKE $${baseParamIdx + 3}
      OR TRANSLATE(COALESCE(title,''), 'أإآٱةىؤئ', 'اااههيوي') ILIKE $${baseParamIdx + 3}
      OR TRANSLATE(COALESCE(vendor,''), 'أإآٱةىؤئ', 'اااههيوي') ILIKE $${baseParamIdx + 3}
      ${baseSynLikeConditions ? `OR ${baseSynLikeConditions}` : ''}
    )`);
    baseParams.push(tsQuery, q, `%${q}%`, normalizedLikeBase, ...allSynonymLikes);
    baseParamIdx += 4 + allSynonymLikes.length;
  }
  if (minPrice !== undefined) { baseConditions.push(`price >= $${baseParamIdx}`); baseParams.push(minPrice); baseParamIdx++; }
  if (maxPrice !== undefined) { baseConditions.push(`price <= $${baseParamIdx}`); baseParams.push(maxPrice); baseParamIdx++; }
  if (inStock) { baseConditions.push(`available_for_sale = true`); }
  const whereClauseNoBrand = baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : '';

  const rankExpr = `(
    COALESCE(ts_rank_cd(tsv_en, to_tsquery('english', $1)), 0) * 3.0 +
    COALESCE(ts_rank_cd(tsv_ar, to_tsquery('simple', $1)), 0) * 3.0 +
    GREATEST(similarity(title, $2), similarity(COALESCE(title_ar,''), $2)) * 2.5 +
    similarity(COALESCE(vendor,''), $2) * 8.0 +
    CASE WHEN LOWER(COALESCE(vendor,'')) = LOWER($2) THEN 20.0
         WHEN COALESCE(vendor,'') ILIKE $3 THEN 12.0
         WHEN title ILIKE $2 THEN 10.0
         WHEN COALESCE(title_ar,'') ILIKE $2 THEN 10.0
         WHEN title ILIKE $3 AND LENGTH($2) >= 4 AND LOWER(title) NOT LIKE '%' || LOWER($2) || 's%' THEN 2.0
         WHEN COALESCE(title_ar,'') ILIKE $3 THEN 2.0
         ELSE 0 END +
    CASE WHEN available_for_sale THEN 1.0 ELSE -3.0 END +
    CASE WHEN compare_at_price IS NOT NULL AND compare_at_price > price THEN 0.5 ELSE 0 END
  )`;

  const searchQuery = `
    SELECT *, ${rankExpr} as relevance_score
    FROM search_index
    ${whereClause}
    ORDER BY
      CASE WHEN available_for_sale THEN 0 ELSE 1 END,
      ROUND(${rankExpr}::numeric, 0) DESC,
      RANDOM()
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(limit, offset);

  const countQuery = `SELECT COUNT(*) as total FROM search_index ${whereClause}`;

  const brandQuery = `
    SELECT vendor as name, COUNT(*) as count
    FROM search_index ${whereClauseNoBrand}
    GROUP BY vendor
    HAVING vendor IS NOT NULL AND vendor != ''
    ORDER BY count DESC
    LIMIT 50
  `;

  const priceQuery = `
    SELECT COALESCE(MIN(price), 0) as min_price, COALESCE(MAX(price), 0) as max_price
    FROM search_index ${whereClause}
  `;

  try {
    const [results, countResult, brandResult, priceResult] = await Promise.all([
      pool.query(searchQuery, params),
      pool.query(countQuery, params.slice(0, paramIdx - 1)),
      pool.query(brandQuery, baseParams),
      pool.query(priceQuery, params.slice(0, paramIdx - 1)),
    ]);

    const products = results.rows.map((r: any) => ({
      id: r.shopify_id,
      handle: r.handle,
      title: isArabic && r.title_ar ? r.title_ar : r.title,
      titleEn: r.title,
      titleAr: r.title_ar,
      vendor: r.vendor,
      productType: r.product_type,
      tags: r.tags || [],
      description: isArabic && r.description_ar ? r.description_ar : r.description,
      availableForSale: r.available_for_sale,
      relevanceScore: parseFloat(r.relevance_score) || 0,
      priceRange: {
        minVariantPrice: { amount: r.price?.toString() || '0', currencyCode: r.currency || 'JOD' },
      },
      compareAtPriceRange: {
        minVariantPrice: {
          amount: r.compare_at_price?.toString() || r.price?.toString() || '0',
          currencyCode: r.currency || 'JOD',
        },
      },
      images: { edges: r.image_url ? [{ node: { url: r.image_url } }] : [] },
    }));

    return {
      products,
      totalCount: parseInt(countResult.rows[0]?.total || '0'),
      suggestions: synonymTerms.slice(0, 5),
      brands: brandResult.rows.map((r: any) => ({ name: r.name, count: parseInt(r.count) })),
      priceRange: {
        min: parseFloat(priceResult.rows[0]?.min_price || '0'),
        max: parseFloat(priceResult.rows[0]?.max_price || '0'),
      },
    };
  } catch (err: any) {
    console.error("[SearchEngine] Search error:", err.message);
    return { products: [], totalCount: 0, suggestions: [], brands: [], priceRange: { min: 0, max: 0 } };
  }
}

export async function getAutocompleteSuggestions(query: string, language: string = 'en'): Promise<{
  products: { title: string; handle: string; imageUrl: string | null; price: string; vendor: string | null }[];
  categories: { title: string; handle: string }[];
  popular: string[];
}> {
  const q = query.trim();
  if (!q || q.length < 1) return { products: [], categories: [], popular: [] };

  const isArabic = language === 'ar' || /[\u0600-\u06FF]/.test(q);
  const titleCol = isArabic ? "COALESCE(title_ar, title)" : "title";

  try {
    const [productResults, categoryResults, popularResults] = await Promise.all([
      pool.query(
        `SELECT handle, title, title_ar, vendor, price, currency, image_url,
           similarity(${titleCol}, $1) as sim
         FROM search_index
         WHERE (${titleCol} ILIKE $2
           OR similarity(${titleCol}, $1) > 0.08
           OR COALESCE(vendor,'') ILIKE $2
           OR COALESCE(title_ar,'') ILIKE $2)
         ORDER BY
           CASE WHEN lower(${titleCol}) = lower($1) THEN 0
                WHEN ${titleCol} ILIKE $1 THEN 1
                WHEN ${titleCol} ILIKE $3 THEN 2
                WHEN ${titleCol} ILIKE $2 THEN 3
                ELSE 4 END,
           sim DESC
         LIMIT 8`,
        [q, `%${q}%`, `${q}%`]
      ),

      pool.query(
        `SELECT ${isArabic ? 'title_ar' : 'title_en'} as title, collection_handle as handle
         FROM categories
         WHERE visible = true
           AND collection_handle IS NOT NULL
           AND (${isArabic ? 'title_ar' : 'title_en'} ILIKE $1
             OR ${isArabic ? 'title_en' : 'title_ar'} ILIKE $1)
         ORDER BY sort_order
         LIMIT 4`,
        [`%${q}%`]
      ),

      pool.query(
        `SELECT term FROM popular_searches
         WHERE term ILIKE $1
         ORDER BY search_count DESC
         LIMIT 5`,
        [`%${q}%`]
      ),
    ]);

    return {
      products: productResults.rows.map((r: any) => ({
        title: isArabic && r.title_ar ? r.title_ar : r.title,
        handle: r.handle,
        imageUrl: r.image_url,
        price: r.price?.toString() || '0',
        vendor: r.vendor,
      })),
      categories: categoryResults.rows.map((r: any) => ({
        title: r.title || '',
        handle: r.handle || '',
      })),
      popular: popularResults.rows.map((r: any) => r.term),
    };
  } catch (err: any) {
    console.error("[SearchEngine] Autocomplete error:", err.message);
    return { products: [], categories: [], popular: [] };
  }
}

export async function trackSearch(query: string, resultsCount: number, language: string = 'en') {
  try {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return;

    await Promise.all([
      pool.query(
        `INSERT INTO search_analytics (query, results_count, language) VALUES ($1, $2, $3)`,
        [q, resultsCount, language]
      ),
      pool.query(
        `INSERT INTO popular_searches (term, search_count, language, updated_at)
         VALUES ($1, 1, $2, NOW())
         ON CONFLICT (term) DO UPDATE SET
           search_count = popular_searches.search_count + 1,
           updated_at = NOW()`,
        [q, language]
      ),
    ]);
  } catch (err) {
    console.warn("[SearchEngine] Analytics tracking error:", err);
  }
}

export async function getSearchAnalytics() {
  try {
    const [topSearches, zeroResults, recentSearches] = await Promise.all([
      pool.query(
        `SELECT term, search_count FROM popular_searches
         ORDER BY search_count DESC LIMIT 20`
      ),
      pool.query(
        `SELECT query, COUNT(*) as count FROM search_analytics
         WHERE results_count = 0
         AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY query ORDER BY count DESC LIMIT 20`
      ),
      pool.query(
        `SELECT query, results_count, created_at FROM search_analytics
         ORDER BY created_at DESC LIMIT 50`
      ),
    ]);

    return {
      topSearches: topSearches.rows,
      zeroResultSearches: zeroResults.rows,
      recentSearches: recentSearches.rows,
    };
  } catch (err) {
    console.error("[SearchEngine] Analytics fetch error:", err);
    return { topSearches: [], zeroResultSearches: [], recentSearches: [] };
  }
}

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startPeriodicSync(intervalMs: number = 30 * 60 * 1000) {
  ensureSearchTables()
    .then(() => syncProductIndex())
    .catch(err => console.error("[SearchEngine] Initial sync failed:", err));

  syncInterval = setInterval(() => {
    syncProductIndex().catch(err => console.error("[SearchEngine] Periodic sync failed:", err));
  }, intervalMs);

  console.log(`[SearchEngine] Periodic sync started (every ${intervalMs / 60000} minutes)`);
}

export function stopPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export async function batchStockStatus(handles: string[]): Promise<Record<string, boolean>> {
  if (handles.length === 0) return {};
  const unique = [...new Set(handles)].slice(0, 100);
  const placeholders = unique.map((_, i) => `$${i + 1}`).join(',');
  const result = await pool.query(
    `SELECT handle, available_for_sale FROM search_index WHERE handle IN (${placeholders})`,
    unique
  );
  const statusMap: Record<string, boolean> = {};
  for (const row of result.rows) {
    statusMap[row.handle] = row.available_for_sale;
  }
  return statusMap;
}
