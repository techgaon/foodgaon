// Starter data — 100% vegetarian. Calories are rough estimates per serving shown.
import { photo } from './photos.js';
import { extraPhotos } from './gallery.js';
import { storyFor } from './stories.js';

export const CATEGORIES = [
  { id: 'sweets', name: 'Sweets', img: 'gulab_jamun' },
  { id: 'lassi', name: 'Lassi & Shakes', img: 'lassi' },
  { id: 'chinese', name: 'Chinese', img: 'chowmein' },
  { id: 'fastfood', name: 'Fast Food', img: 'burger' },
  { id: 'northindian', name: 'North Indian', img: 'pbm' },
  { id: 'chaat', name: 'Snacks & Chaat', img: 'pani_puri' },
  { id: 'thali', name: 'Thali & Rice', img: 'thali' },
  { id: 'southindian', name: 'South Indian', img: 'idli' },
  { id: 'icecream', name: 'Ice Cream & Desserts', img: 'sundae' },
].map((c) => ({ ...c, img: photo(c.img) }));

// Haidergarh, Barabanki (approx.) — each restaurant can set its exact spot from its panel
const HG = { lat: 26.6178, lng: 81.3657 };

const REAL = { fssai: '', gstin: '', radiusKm: 5, minOrder: 50, riderRate: 20, selfDelivery: true };
export const RESTAURANTS = [
  {
    id: 'parag', name: 'Parag Milk Parlour & Restaurant', ownerPhone: '9415333145', ownerName: 'Parag',
    tagline: 'Rabri, lassi, shakes, paneer & full meals', cuisines: ['northindian', 'lassi', 'sweets'],
    cover: photo('pbm'), rating: 4.7, prepMins: 20, open: true, demo: false, ...REAL,
    riders: [{ phone: '+919695256588', name: 'Deepak' }],
    address: 'Main Road, Haidergarh, Barabanki', lat: HG.lat + 0.001, lng: HG.lng + 0.001, sort: 0,
  },
  {
    id: 'raju-lassi', name: 'Raju Lassi', ownerPhone: '9198427160', ownerName: 'Raju', ...REAL,
    riders: [],
    tagline: 'Thick lassi, shakes & fresh sweets', cuisines: ['lassi', 'sweets'],
    cover: photo('lassi'), rating: 4.6, prepMins: 10, open: true, demo: false,
    address: 'Main Market, Haidergarh, Barabanki', lat: HG.lat, lng: HG.lng, sort: 1,
  },
  {
    id: 'annapurna', name: 'Annapurna Bhojnalaya', ownerPhone: '', ownerName: '',
    tagline: 'Homestyle North Indian thali & paneer', cuisines: ['northindian', 'thali'],
    cover: photo('thali'), rating: 4.4, prepMins: 25, open: true, demo: true,
    address: 'Lucknow Road, Haidergarh', lat: HG.lat + 0.004, lng: HG.lng - 0.003, sort: 2,
  },
  {
    id: 'dragon-chinese', name: 'Dragon Chinese & Fast Food', ownerPhone: '', ownerName: '',
    tagline: 'Chowmein, momos, burgers & pizza', cuisines: ['chinese', 'fastfood'],
    cover: photo('chowmein'), rating: 4.3, prepMins: 20, open: true, demo: true,
    address: 'Bus Stand, Haidergarh', lat: HG.lat - 0.003, lng: HG.lng + 0.004, sort: 3,
  },
  {
    id: 'mithaas', name: 'Mithaas Sweets & Chaat', ownerPhone: '', ownerName: '',
    tagline: 'Jalebi, samosa, chaat & mithai', cuisines: ['sweets', 'chaat'],
    cover: photo('jalebi'), rating: 4.5, prepMins: 10, open: true, demo: true,
    address: 'Tehsil Chauraha, Haidergarh', lat: HG.lat + 0.002, lng: HG.lng + 0.005, sort: 4,
  },
  {
    id: 'sagar-south', name: 'Sagar South Indian', ownerPhone: '', ownerName: '',
    tagline: 'Idli, dosa, uttapam & hot breakfast', cuisines: ['southindian'],
    cover: photo('idli'), rating: 4.4, prepMins: 15, open: true, demo: true,
    address: 'Station Road, Haidergarh', lat: HG.lat - 0.004, lng: HG.lng - 0.002, sort: 5,
  },
  {
    id: 'cafe-chill', name: 'Cafe Chill', ownerPhone: '', ownerName: '',
    tagline: 'Shakes, sundaes, pasta & pizza', cuisines: ['icecream', 'fastfood'],
    cover: photo('sundae'), rating: 4.5, prepMins: 15, open: true, demo: true,
    address: 'Near Inter College, Haidergarh', lat: HG.lat + 0.005, lng: HG.lng + 0.002, sort: 6,
  },
];

const I = (restaurantId, key, name, cat, price, kcal, qty, desc, extra = {}) => ({
  id: `${restaurantId}--${key}`, restaurantId, name, cat, price, kcal, qty, desc, img: photo(extra.img || key), story: storyFor(key, extra.img),
  gallery: [photo(extra.img || key), ...extraPhotos(extra.img || key)].filter(Boolean),
  veg: true, available: true, bestseller: !!extra.best, sort: extra.sort || 0,
});

export const ITEMS = [
  // Parag Milk Parlour & Restaurant: real menu comes from data/paragMenu.js (menu pack)

  // Raju Lassi
  I('raju-lassi', 'lassi', 'Sweet Lassi', 'lassi', 40, 260, '1 glass (300 ml)', 'Thick curd lassi topped with malai', { best: true }),
  I('raju-lassi', 'mango_lassi', 'Mango Lassi', 'lassi', 60, 320, '1 glass (300 ml)', 'Lassi blended with ripe mango pulp'),
  I('raju-lassi', 'kesar_lassi', 'Kesar Badam Lassi', 'lassi', 70, 350, '1 glass (300 ml)', 'Saffron, almonds and malai', { img: 'lassi' }),
  I('raju-lassi', 'banana_shake', 'Banana Shake', 'lassi', 60, 290, '1 glass (300 ml)', 'Fresh banana and chilled milk'),
  I('raju-lassi', 'cold_coffee', 'Cold Coffee', 'lassi', 70, 280, '1 glass (300 ml)', 'Creamy chilled coffee with ice cream'),
  I('raju-lassi', 'falooda', 'Royal Falooda', 'lassi', 90, 450, '1 glass', 'Rose syrup, sabja, vermicelli & kulfi', { best: true }),
  I('raju-lassi', 'rabri', 'Rabri', 'sweets', 60, 300, '100 g', 'Slow-cooked thickened milk with dry fruits'),
  I('raju-lassi', 'kulfi', 'Malai Kulfi', 'sweets', 30, 180, '1 piece', 'Traditional pista malai kulfi'),
  I('raju-lassi', 'gulab_jamun', 'Gulab Jamun', 'sweets', 30, 300, '2 pieces', 'Soft khoya jamun in sugar syrup'),
  I('raju-lassi', 'rasmalai', 'Rasmalai', 'sweets', 50, 280, '2 pieces', 'Chenna discs in saffron milk'),
  I('raju-lassi', 'chai', 'Kulhad Masala Chai', 'lassi', 15, 90, '1 kulhad', 'Ginger-cardamom tea'),

  // Annapurna Bhojnalaya
  I('annapurna', 'thali', 'Special Veg Thali', 'thali', 120, 850, '1 thali', 'Paneer, dal, seasonal sabzi, rice, 3 roti, salad, sweet', { best: true }),
  I('annapurna', 'pbm', 'Paneer Butter Masala', 'northindian', 150, 480, 'Half plate', 'Paneer in rich tomato-butter gravy', { best: true }),
  I('annapurna', 'dal_makhani', 'Dal Makhani', 'northindian', 110, 380, 'Half plate', 'Black dal slow-cooked with butter & cream'),
  I('annapurna', 'shahi_paneer', 'Shahi Paneer', 'northindian', 150, 500, 'Half plate', 'Paneer in creamy cashew gravy'),
  I('annapurna', 'kadai_paneer', 'Kadai Paneer', 'northindian', 150, 450, 'Half plate', 'Paneer, capsicum & onion with kadai masala'),
  I('annapurna', 'paneer_tikka', 'Paneer Tikka', 'northindian', 160, 400, '8 pieces', 'Tandoor-grilled marinated paneer'),
  I('annapurna', 'naan', 'Butter Naan', 'northindian', 30, 290, '1 piece', 'Soft tandoori naan with butter'),
  I('annapurna', 'roti', 'Tandoori Roti', 'northindian', 10, 120, '1 piece', 'Whole-wheat tandoori roti'),
  I('annapurna', 'jeera_rice', 'Jeera Rice', 'thali', 80, 330, '1 plate', 'Basmati rice tempered with cumin'),
  I('annapurna', 'veg_biryani', 'Veg Biryani', 'thali', 110, 520, '1 plate', 'Fragrant rice with vegetables & raita'),
  I('annapurna', 'chole_bhature', 'Chole Bhature', 'northindian', 80, 650, '2 bhature', 'Spicy chole with fluffy bhature'),
  I('annapurna', 'paratha', 'Aloo Paratha', 'northindian', 60, 560, '2 pieces + curd', 'Stuffed potato paratha with butter'),
  I('annapurna', 'masala_dosa', 'Masala Dosa', 'southindian', 70, 380, '1 dosa', 'Crispy dosa, sambar & chutney'),

  // Dragon Chinese & Fast Food
  I('dragon-chinese', 'chowmein', 'Veg Chowmein', 'chinese', 70, 450, 'Full plate', 'Street-style noodles with vegetables', { best: true }),
  I('dragon-chinese', 'hakka', 'Hakka Noodles', 'chinese', 90, 480, 'Full plate', 'Wok-tossed hakka noodles'),
  I('dragon-chinese', 'manchurian', 'Veg Manchurian (Gravy)', 'chinese', 90, 420, '8 pieces', 'Veg balls in spicy soy-garlic gravy'),
  I('dragon-chinese', 'chilli_paneer', 'Chilli Paneer', 'chinese', 130, 480, 'Full plate', 'Paneer with capsicum in chilli sauce', { best: true }),
  I('dragon-chinese', 'spring_roll', 'Veg Spring Roll', 'chinese', 70, 320, '4 pieces', 'Crispy rolls with veg filling'),
  I('dragon-chinese', 'momos', 'Veg Steamed Momos', 'chinese', 50, 300, '8 pieces', 'Steamed momos with red chutney', { best: true }),
  I('dragon-chinese', 'fried_rice', 'Veg Fried Rice', 'chinese', 80, 450, 'Full plate', 'Wok-fried rice with vegetables'),
  I('dragon-chinese', 'chilli_potato', 'Honey Chilli Potato', 'chinese', 90, 500, 'Full plate', 'Crispy potato in honey-chilli glaze'),
  I('dragon-chinese', 'burger', 'Aloo Tikki Burger', 'fastfood', 50, 400, '1 burger', 'Crispy aloo tikki, veggies & mayo'),
  I('dragon-chinese', 'pizza', 'Margherita Pizza', 'fastfood', 149, 800, '8 inch', 'Cheese & tomato pizza'),
  I('dragon-chinese', 'fries', 'French Fries', 'fastfood', 60, 380, 'Medium', 'Salted crispy fries'),
  I('dragon-chinese', 'sandwich', 'Cheese Grilled Sandwich', 'fastfood', 60, 350, '1 sandwich', 'Grilled with cheese & veggies'),
  I('dragon-chinese', 'vada_pav', 'Vada Pav', 'fastfood', 25, 290, '1 piece', 'Spicy batata vada in pav with chutney'),
  I('dragon-chinese', 'pav_bhaji', 'Pav Bhaji', 'fastfood', 70, 550, '2 pav', 'Buttery bhaji with toasted pav'),

  // Mithaas Sweets & Chaat
  I('mithaas', 'jalebi', 'Hot Jalebi', 'sweets', 30, 400, '100 g', 'Fresh crispy jalebi', { best: true }),
  I('mithaas', 'kaju_katli', 'Kaju Katli', 'sweets', 110, 450, '100 g', 'Cashew barfi with silver vark'),
  I('mithaas', 'laddu', 'Motichoor Laddu', 'sweets', 60, 480, '4 pieces', 'Pure ghee motichoor laddu'),
  I('mithaas', 'rasgulla', 'Rasgulla', 'sweets', 30, 250, '2 pieces', 'Spongy chenna balls in syrup'),
  I('mithaas', 'barfi', 'Milk Barfi', 'sweets', 70, 400, '100 g', 'Khoya barfi'),
  I('mithaas', 'peda', 'Kesar Peda', 'sweets', 60, 360, '4 pieces', 'Saffron khoya peda'),
  I('mithaas', 'gulab_jamun', 'Gulab Jamun', 'sweets', 30, 300, '2 pieces', 'Warm gulab jamun'),
  I('mithaas', 'samosa', 'Samosa', 'chaat', 20, 520, '2 pieces', 'Aloo samosa with sweet chutney', { best: true }),
  I('mithaas', 'kachori', 'Khasta Kachori', 'chaat', 30, 380, '2 pieces', 'Dal kachori with aloo sabzi'),
  I('mithaas', 'pani_puri', 'Pani Puri', 'chaat', 30, 220, '6 pieces', 'Tangy pani, aloo & chana'),
  I('mithaas', 'aloo_tikki', 'Aloo Tikki Chaat', 'chaat', 40, 350, '2 tikki', 'Tikki with curd, chutneys & sev'),
  I('mithaas', 'dahi_bhalla', 'Dahi Bhalla', 'chaat', 50, 320, '3 pieces', 'Soft bhalla in sweet curd'),

  // --- more dishes ---
  I('raju-lassi', 'chaas', 'Masala Chaas', 'lassi', 20, 70, '1 glass (300 ml)', 'Spiced buttermilk with roasted jeera'),
  I('raju-lassi', 'thandai', 'Kesar Thandai', 'lassi', 60, 300, '1 glass', 'Chilled milk with dry fruits, saunf & saffron'),
  I('raju-lassi', 'badam_milk', 'Badam Milk', 'lassi', 50, 260, '1 glass', 'Warm or chilled almond milk'),

  I('mithaas', 'gajar_halwa', 'Gajar ka Halwa', 'sweets', 60, 330, '100 g', 'Slow-cooked carrot halwa with khoya & nuts', { best: true }),
  I('mithaas', 'kheer', 'Seviyan Kheer', 'sweets', 50, 280, '1 bowl', 'Vermicelli cooked in sweet milk with raisins'),
  I('mithaas', 'malpua', 'Malpua with Rabri', 'sweets', 50, 420, '2 pieces', 'Soft fried malpua soaked in syrup'),
  I('mithaas', 'imarti', 'Imarti', 'sweets', 40, 380, '100 g', 'Urad dal imarti in sugar syrup'),
  I('mithaas', 'balushahi', 'Balushahi', 'sweets', 40, 380, '2 pieces', 'Flaky glazed balushahi'),
  I('mithaas', 'moong_halwa', 'Moong Dal Halwa', 'sweets', 80, 450, '100 g', 'Rich ghee moong dal halwa'),
  I('mithaas', 'papdi_chaat', 'Papdi Chaat', 'chaat', 40, 300, '1 plate', 'Crispy papdi, curd, chutneys & sev', { best: true }),
  I('mithaas', 'bhel', 'Bhel Puri', 'chaat', 40, 280, '1 plate', 'Puffed rice, onion, tomato & tangy chutney'),
  I('mithaas', 'dhokla', 'Khaman Dhokla', 'chaat', 40, 220, '4 pieces', 'Soft steamed besan dhokla with tadka'),
  I('mithaas', 'bread_pakora', 'Bread Pakora', 'chaat', 30, 420, '2 pieces', 'Aloo-stuffed bread pakora with chutney'),
  I('mithaas', 'paneer_pakora', 'Paneer Pakora', 'chaat', 70, 380, '6 pieces', 'Crispy besan-coated paneer'),

  I('dragon-chinese', 'fried_momos', 'Veg Fried Momos', 'chinese', 70, 420, '8 pieces', 'Golden fried momos with spicy chutney'),
  I('dragon-chinese', 'manchow', 'Veg Manchow Soup', 'chinese', 70, 150, '1 bowl', 'Hot & spicy soup with crispy noodles'),
  I('dragon-chinese', 'chilli_mushroom', 'Chilli Mushroom', 'chinese', 120, 320, 'Full plate', 'Mushroom tossed in chilli-garlic sauce'),
  I('dragon-chinese', 'schezwan', 'Schezwan Noodles', 'chinese', 100, 520, 'Full plate', 'Fiery schezwan sauce noodles'),

  I('annapurna', 'rajma', 'Rajma Chawal', 'thali', 90, 550, '1 plate', 'Homestyle rajma with steamed rice', { best: true }),
  I('annapurna', 'kadhi', 'Kadhi Chawal', 'thali', 80, 480, '1 plate', 'Pakodi kadhi with steamed rice'),
  I('annapurna', 'malai_kofta', 'Malai Kofta', 'northindian', 160, 520, 'Half plate', 'Paneer-potato koftas in creamy gravy'),
  I('annapurna', 'palak_paneer', 'Palak Paneer', 'northindian', 150, 380, 'Half plate', 'Paneer cubes in smooth spinach gravy'),
  I('annapurna', 'matar_paneer', 'Matar Paneer', 'northindian', 140, 420, 'Half plate', 'Green peas & paneer in tomato gravy'),
  I('annapurna', 'dal_tadka', 'Dal Tadka', 'northindian', 90, 280, 'Half plate', 'Yellow dal with ghee-jeera tadka'),
  I('annapurna', 'mix_veg', 'Mix Veg', 'northindian', 110, 250, 'Half plate', 'Seasonal vegetables in light masala'),
  I('annapurna', 'lachha', 'Lachha Paratha', 'northindian', 35, 300, '1 piece', 'Layered crispy tandoori paratha'),
  I('annapurna', 'puri_sabzi', 'Puri Sabzi', 'thali', 60, 550, '4 puri + sabzi', 'Fluffy puris with aloo sabzi'),
  I('annapurna', 'pulao', 'Veg Pulao', 'thali', 90, 420, '1 plate', 'Mildly spiced rice with vegetables'),
  I('annapurna', 'kulcha', 'Amritsari Kulcha', 'northindian', 90, 620, '2 kulcha + chole', 'Stuffed tandoori kulcha with chole'),

  I('sagar-south', 'idli', 'Idli Sambar', 'southindian', 50, 300, '3 idli', 'Soft idli with sambar & coconut chutney', { best: true }),
  I('sagar-south', 'plain_dosa', 'Plain Dosa', 'southindian', 50, 250, '1 dosa', 'Crispy dosa with sambar & chutney'),
  I('sagar-south', 'masala_dosa', 'Masala Dosa', 'southindian', 70, 380, '1 dosa', 'Dosa stuffed with spiced potato', { best: true }),
  I('sagar-south', 'uttapam', 'Onion Tomato Uttapam', 'southindian', 70, 330, '1 uttapam', 'Thick dosa topped with onion & tomato'),
  I('sagar-south', 'medu_vada', 'Medu Vada', 'southindian', 50, 320, '2 pieces', 'Crispy urad dal vada with sambar'),
  I('sagar-south', 'upma', 'Rava Upma', 'southindian', 40, 250, '1 plate', 'Semolina upma with veggies'),
  I('sagar-south', 'poha', 'Indori Poha', 'southindian', 30, 270, '1 plate', 'Poha with peanuts, sev & lemon'),
  I('sagar-south', 'curd_rice', 'Curd Rice', 'southindian', 60, 330, '1 bowl', 'Cooling curd rice with tempering'),

  I('cafe-chill', 'choco_shake', 'Chocolate Shake', 'lassi', 90, 450, '1 glass (350 ml)', 'Thick chocolate shake with cream', { best: true }),
  I('cafe-chill', 'straw_shake', 'Strawberry Shake', 'lassi', 80, 380, '1 glass (350 ml)', 'Strawberry shake topped with cream'),
  I('cafe-chill', 'lime_soda', 'Fresh Lime Soda', 'lassi', 40, 90, '1 glass', 'Sweet or salted, with fresh lime'),
  I('cafe-chill', 'icecream', 'Ice Cream (2 scoops)', 'icecream', 60, 270, '2 scoops', 'Vanilla, chocolate or butterscotch'),
  I('cafe-chill', 'sundae', 'Strawberry Sundae', 'icecream', 120, 520, '1 sundae', 'Ice cream, strawberries, wafer & sauce', { best: true }),
  I('cafe-chill', 'pasta', 'Red Sauce Pasta', 'fastfood', 130, 520, '1 plate', 'Penne in tangy tomato sauce with herbs'),
  I('cafe-chill', 'garlic_bread', 'Cheese Garlic Bread', 'fastfood', 90, 380, '4 pieces', 'Toasted garlic bread with cheese'),
  I('cafe-chill', 'maggi', 'Vegetable Maggi', 'fastfood', 50, 350, '1 plate', 'Masala maggi loaded with veggies'),
  I('cafe-chill', 'veg_pizza', 'Farm Veg Pizza', 'fastfood', 179, 850, '8 inch', 'Capsicum, onion, olives, corn & cheese'),
];

export const BANNERS = [
  { id: 'b1', title: 'Your town, your taste', sub: 'Best restaurants of Haidergarh on FoodGaon', img: photo('ban_thali'), sort: 1 },
  { id: 'b2', title: 'FREE delivery', sub: 'No delivery charge on any order', img: photo('chowmein'), sort: 2 },
  { id: 'b3', title: 'Mithai by the box', sub: 'Fresh sweets for every occasion', img: photo('ban_sweets'), sort: 3 },
];

// coupons appear only when the admin or a restaurant creates one (no demo coupons)
export const OFFERS = [];
export const DEMO_OFFER_IDS = ['welcome', 'sweet50', 'parag10', 'lassi10'];

export const DEFAULT_CONFIG = {
  appName: 'FoodGaon',
  firmName: 'TechGaon AI Services',
  firmAddress: '00, Pandey Home, PO & PS Subeha, Rampur, Haidergarh, Barabanki, Uttar Pradesh – 225125',
  gstin: '09DBSPP3533H1Z5',
  supportEmail: 'contact@techgaon.in',
  appLink: 'https://techgaon.in/foodgaon',
  otpMode: 'mock',
  gstPct: 5,
  commissionPct: 4.9,
  commissionGstPct: 18,
  commissionGstExtra: false,
  codDueLimit: 0,
  codRefuseLimit: 2,
  qualityAlertAt: 3,
  customerDeliveryFee: 0,
  restaurantDeliveryCharge: 0,
  minOrder: 50,
  radiusKm: 5,
  codEnabled: true,
  upiEnabled: true,
  upiId: '',
  upiName: 'FoodGaon',
  supportPhone: '9129203268',
  serviceArea: 'Haidergarh, Barabanki',
  showCalories: true,
};

export const STAFF = [
  { phone: '+919129203268', name: 'TechGaon Admin', admin: true, restaurant: '', rider: false, riderOf: '' },
  { phone: '+919415333145', name: 'Parag', admin: false, restaurant: 'parag', rider: false, riderOf: '' },
  { phone: '+919198427160', name: 'Raju', admin: false, restaurant: 'raju-lassi', rider: false, riderOf: '' },
  { phone: '+919695256588', name: 'Deepak', admin: false, restaurant: '', rider: true, riderOf: 'parag' },
];

// old starter dishes of Parag, removed when the real menu pack is installed
export const PARAG_OLD_IDS = ["parag--rabri", "parag--jalebi", "parag--badam_milk", "parag--lassi", "parag--mango_lassi", "parag--choco_shake", "parag--straw_shake", "parag--cold_coffee", "parag--thandai", "parag--kulfi", "parag--rasmalai", "parag--gulab_jamun", "parag--rasgulla", "parag--barfi", "parag--peda", "parag--pbm", "parag--shahi_paneer", "parag--kadai_paneer", "parag--paneer_tikka", "parag--malai_kofta", "parag--dal_makhani", "parag--naan", "parag--roti", "parag--lachha", "parag--jeera_rice", "parag--veg_biryani", "parag--thali", "parag--chole_bhature", "parag--masala_dosa", "parag--chowmein", "parag--paneer_pakora", "parag--pav_bhaji", "parag--sandwich"];

// staff numbers that no longer work for FoodGaon (removed by the admin's one-time cleanup)
export const OLD_STAFF = ['+919120799904', '+911234567890', '+911234567891'];
// everything (orders, reviews, rider pays, settlements) created before this moment was test data
export const TEST_DATA_BEFORE = typeof __BUILD_MS__ !== 'undefined' ? __BUILD_MS__ : 0; // the moment this version was built
