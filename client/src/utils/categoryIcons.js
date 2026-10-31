import {
  Apple,
  Banknote,
  Beer,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  CircleDollarSign,
  Clapperboard,
  Coffee,
  Coins,
  CreditCard,
  Droplets,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Hotel,
  House,
  Landmark,
  Luggage,
  MapPin,
  Motorbike,
  Music,
  PawPrint,
  Pencil,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Stethoscope,
  Tag,
  Ticket,
  TrainFront,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';

// The icons a category can use, in groups (the picker in the category form).
// `name` is what the API stores in Category.icon, so a name must never change; the server has the same list
// in server/src/utils/categoryIcons.js, and categoryIcons.test.js checks that the two stay equal.
// A group's title is the translation key icons.groups.<id>.
export const ICON_GROUPS = [
  {
    id: 'food',
    icons: [
      { name: 'utensils', Icon: Utensils },
      { name: 'coffee', Icon: Coffee },
      { name: 'pizza', Icon: Pizza },
      { name: 'beer', Icon: Beer },
      { name: 'apple', Icon: Apple },
      { name: 'shopping-basket', Icon: ShoppingBasket },
    ],
  },
  {
    id: 'transport',
    icons: [
      { name: 'bus', Icon: Bus },
      { name: 'car', Icon: Car },
      { name: 'bike', Icon: Bike },
      { name: 'fuel', Icon: Fuel },
      { name: 'train-front', Icon: TrainFront },
      { name: 'motorbike', Icon: Motorbike },
    ],
  },
  {
    id: 'bills',
    icons: [
      { name: 'receipt', Icon: Receipt },
      { name: 'zap', Icon: Zap },
      { name: 'droplets', Icon: Droplets },
      { name: 'wifi', Icon: Wifi },
      { name: 'smartphone', Icon: Smartphone },
      { name: 'landmark', Icon: Landmark },
    ],
  },
  {
    id: 'shopping',
    icons: [
      { name: 'shopping-bag', Icon: ShoppingBag },
      { name: 'shirt', Icon: Shirt },
      { name: 'gift', Icon: Gift },
      { name: 'credit-card', Icon: CreditCard },
    ],
  },
  {
    id: 'entertainment',
    icons: [
      { name: 'clapperboard', Icon: Clapperboard },
      { name: 'gamepad-2', Icon: Gamepad2 },
      { name: 'music', Icon: Music },
      { name: 'ticket', Icon: Ticket },
    ],
  },
  {
    id: 'health',
    icons: [
      { name: 'heart-pulse', Icon: HeartPulse },
      { name: 'pill', Icon: Pill },
      { name: 'dumbbell', Icon: Dumbbell },
      { name: 'stethoscope', Icon: Stethoscope },
    ],
  },
  {
    id: 'education',
    icons: [
      { name: 'graduation-cap', Icon: GraduationCap },
      { name: 'book-open', Icon: BookOpen },
      { name: 'pencil', Icon: Pencil },
    ],
  },
  {
    id: 'home',
    icons: [
      { name: 'house', Icon: House },
      { name: 'sofa', Icon: Sofa },
      { name: 'wrench', Icon: Wrench },
      { name: 'paw-print', Icon: PawPrint },
    ],
  },
  {
    id: 'travel',
    icons: [
      { name: 'plane', Icon: Plane },
      { name: 'luggage', Icon: Luggage },
      { name: 'map-pin', Icon: MapPin },
      { name: 'hotel', Icon: Hotel },
    ],
  },
  {
    id: 'income',
    icons: [
      { name: 'banknote', Icon: Banknote },
      { name: 'wallet', Icon: Wallet },
      { name: 'briefcase', Icon: Briefcase },
      { name: 'trending-up', Icon: TrendingUp },
      { name: 'piggy-bank', Icon: PiggyBank },
      { name: 'hand-coins', Icon: HandCoins },
      { name: 'coins', Icon: Coins },
    ],
  },
  {
    id: 'other',
    icons: [
      { name: 'tag', Icon: Tag },
      { name: 'circle-dollar-sign', Icon: CircleDollarSign },
    ],
  },
];

const ICONS_BY_NAME = new Map(ICON_GROUPS.flatMap((group) => group.icons.map(({ name, Icon }) => [name, Icon])));

export const ICON_NAMES = [...ICONS_BY_NAME.keys()];

// Shown when a category has no icon and its name gives no hint.
export const GENERIC_ICON_NAME = 'tag';

// Older categories store an emoji from the previous picker. They are shown as the matching line icon, so all icons
// look the same; the stored value is not touched. Any other emoji is shown as it is.
const EMOJI_TO_ICON = {
  '🍜': 'utensils', '🍔': 'utensils', '🍕': 'pizza', '☕': 'coffee', '🍺': 'beer', '🛒': 'shopping-basket', '🍎': 'apple', '🍰': 'utensils',
  '🚌': 'bus', '🚗': 'car', '⛽': 'fuel', '🏍️': 'motorbike', '✈️': 'plane', '🚆': 'train-front',
  '🏠': 'house', '🧾': 'receipt', '💡': 'zap', '📱': 'smartphone', '💧': 'droplets', '📶': 'wifi',
  '🛍️': 'shopping-bag', '👕': 'shirt', '🎁': 'gift', '📚': 'book-open',
  '🎬': 'clapperboard', '🎮': 'gamepad-2', '🎵': 'music', '🏋️': 'dumbbell', '⚽': 'dumbbell', '🎤': 'music',
  '💊': 'pill', '🏥': 'stethoscope', '🎓': 'graduation-cap', '🐶': 'paw-print', '💇': 'shirt',
  '💰': 'banknote', '💵': 'banknote', '💼': 'briefcase', '📈': 'trending-up', '💳': 'credit-card',
};

// Words in a category name -> an icon, for categories without one (the first match wins, so specific words come first).
// English and Vietnamese with and without accents, because those are the names people type here.
const NAME_HINTS = [
  ['coffee', ['coffee', 'cafe', 'caphe', 'tra sua', 'milk tea']],
  ['beer', ['beer', 'bia', 'bar', 'pub', 'drink', 'nhau']],
  ['pizza', ['pizza', 'fast food', 'snack', 'an vat']],
  ['shopping-basket', ['grocer', 'supermarket', 'market', 'di cho', 'sieu thi', 'thuc pham']],
  ['utensils', ['food', 'meal', 'eat', 'restaurant', 'dining', 'lunch', 'dinner', 'breakfast', 'an uong', 'do an', 'com', 'quan an']],
  ['fuel', ['fuel', 'gas', 'petrol', 'xang']],
  ['train-front', ['train', 'metro', 'subway', 'tau']],
  ['bike', ['bike', 'bicycle', 'xe dap']],
  ['motorbike', ['motorbike', 'motorcycle', 'scooter', 'xe may', 'grab', 'taxi']],
  ['car', ['car', 'parking', 'gui xe', 'o to']],
  ['bus', ['transport', 'bus', 'commute', 'travel card', 'di lai', 'xe buyt', 'di chuyen']],
  ['zap', ['electric', 'power', 'dien']],
  ['droplets', ['water', 'nuoc']],
  ['wifi', ['internet', 'wifi', 'broadband', 'mang']],
  ['smartphone', ['phone', 'mobile', 'dien thoai']],
  ['landmark', ['tax', 'bank', 'loan', 'insurance', 'thue', 'ngan hang', 'bao hiem', 'vay']],
  ['receipt', ['bill', 'utilit', 'subscription', 'invoice', 'hoa don', 'dang ky']],
  ['shirt', ['cloth', 'fashion', 'apparel', 'quan ao', 'thoi trang']],
  ['gift', ['gift', 'present', 'bonus', 'qua', 'thuong', 'other income']],
  ['credit-card', ['credit', 'card', 'the tin dung']],
  ['shopping-bag', ['shop', 'mua sam', 'mua do']],
  ['clapperboard', ['entertain', 'movie', 'cinema', 'film', 'giai tri', 'phim']],
  ['gamepad-2', ['game', 'tro choi']],
  ['music', ['music', 'concert', 'nhac']],
  ['ticket', ['ticket', 'event', 've ']],
  ['dumbbell', ['gym', 'sport', 'fitness', 'the thao', 'the duc']],
  ['pill', ['medicine', 'pharmacy', 'thuoc']],
  ['stethoscope', ['doctor', 'hospital', 'clinic', 'bac si', 'benh vien', 'kham']],
  ['heart-pulse', ['health', 'medical', 'suc khoe', 'y te']],
  ['graduation-cap', ['education', 'school', 'tuition', 'university', 'course', 'giao duc', 'hoc phi', 'truong', 'khoa hoc']],
  ['book-open', ['book', 'study', 'sach', 'hoc']],
  ['paw-print', ['pet', 'dog', 'cat', 'thu cung', 'cho meo']],
  ['sofa', ['furniture', 'noi that']],
  ['wrench', ['repair', 'maintenance', 'sua chua']],
  ['house', ['home', 'house', 'rent', 'housing', 'nha', 'tien nha', 'thue nha']],
  ['plane', ['flight', 'plane', 'may bay', 've may bay']],
  ['hotel', ['hotel', 'khach san']],
  ['luggage', ['travel', 'trip', 'vacation', 'holiday', 'du lich']],
  ['banknote', ['salary', 'wage', 'payroll', 'paycheck', 'luong']],
  ['briefcase', ['freelance', 'business', 'work', 'job', 'cong viec', 'kinh doanh']],
  ['trending-up', ['invest', 'stock', 'dividend', 'dau tu', 'co phieu']],
  ['piggy-bank', ['saving', 'tiet kiem']],
  ['hand-coins', ['interest', 'refund', 'lai', 'hoan tien']],
  ['wallet', ['income', 'allowance', 'thu nhap', 'tro cap']],
];

// "Sức khoẻ" -> "suc khoe"
function plainText(text) {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

// A hint matches the start of a word, so "car" finds "Car wash" but not "Scarf", and "bill" finds "Bills".
function matches(name, hint) {
  return ` ${name}`.includes(` ${hint}`);
}

// The icon name that fits a category name, or the generic one.
export function guessIconName(name = '') {
  const plain = plainText(name);
  const found = NAME_HINTS.find(([, hints]) => hints.some((hint) => matches(plain, hint)));
  return found ? found[0] : GENERIC_ICON_NAME;
}

// True for a value like "🍜" that is stored in Category.icon instead of an icon name.
export function isEmojiIcon(icon) {
  return Boolean(icon) && !/^[a-z0-9-]+$/.test(icon);
}

// What to draw for a category: { Icon } for a line icon, or { emoji } for an emoji without a matching line icon.
//   1. A name from the set. 2. An emoji of the old picker: its line icon. 3. Another emoji: itself.
//   4. No icon: a guess from the category name. A name the client does not know (a newer version) is treated the same.
export function resolveCategoryIcon({ icon, name } = {}) {
  if (ICONS_BY_NAME.has(icon)) return { Icon: ICONS_BY_NAME.get(icon) };
  if (isEmojiIcon(icon)) {
    const mapped = EMOJI_TO_ICON[icon];
    return mapped ? { Icon: ICONS_BY_NAME.get(mapped) } : { emoji: icon };
  }
  return { Icon: ICONS_BY_NAME.get(guessIconName(name)) };
}

// The value the picker shows as selected: the icon name, also for an old emoji. Null for "Auto".
export function selectedIconName(icon) {
  if (ICONS_BY_NAME.has(icon)) return icon;
  return EMOJI_TO_ICON[icon] ?? null;
}
