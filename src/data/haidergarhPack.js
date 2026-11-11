// Four Haidergarh restaurants added by the admin on 11 Nov 2026.
// Dishes and prices are ESTIMATES (typical local prices) — each owner must check and correct them in the
// restaurant panel. The restaurants start CLOSED (not taking orders) until the admin opens them.
import { photo } from './photos.js';
import { extraPhotos } from './gallery.js';
import { storyFor } from './stories.js';

export const PACK_V = 'hg-2026-11-11';
const HG = { lat: 26.6178, lng: 81.3657 };
const BASE = { fssai: '', gstin: '', radiusKm: 5, minOrder: 50, riderRate: 20, selfDelivery: true, open: false, demo: false, verified: false, menuEstimated: true, riders: [] };

export const RESTS = [
  { id: 'raju-lassi', name: 'Raju Lassi', ownerPhone: '9198427160', ownerName: 'Raju', tagline: 'Thick lassi, shakes & fresh sweets', cuisines: ['lassi', 'sweets'], cover: photo('lassi'), rating: 4.5, prepMins: 10, address: 'Haidergarh, Barabanki', lat: HG.lat + 0.0006, lng: HG.lng - 0.0008, sort: 1 },
  { id: 'swagat-restaurant', name: 'Swagat Restaurant', ownerPhone: '', ownerName: '', tagline: 'Thali, paneer, dal & tandoori roti', cuisines: ['northindian', 'thali'], cover: photo('thali'), rating: 4.4, prepMins: 25, address: 'Haidergarh, Barabanki', lat: HG.lat + 0.0015, lng: HG.lng + 0.0012, sort: 2 },
  { id: 'food-ville-cafe', name: 'Food Ville Cafe', ownerPhone: '', ownerName: '', tagline: 'Pizza, burger, momos, shakes & chowmein', cuisines: ['fastfood', 'chinese'], cover: photo('veg_pizza'), rating: 4.4, prepMins: 20, address: 'Haidergarh, Barabanki', lat: HG.lat - 0.0012, lng: HG.lng + 0.0009, sort: 3 },
  { id: 'laxmi-sweets', name: 'Laxmi Sweets', ownerPhone: '', ownerName: '', tagline: 'Mithai, samosa, chaat & hot jalebi', cuisines: ['sweets', 'chaat'], cover: photo('jalebi'), rating: 4.5, prepMins: 10, address: 'Haidergarh, Barabanki', lat: HG.lat + 0.0009, lng: HG.lng + 0.0018, sort: 4 },
].map((r) => ({ ...BASE, ...r }));

const I = (restaurantId, key, name, cat, price, kcal, qty, desc, extra = {}) => ({
  id: `${restaurantId}--${key}`, restaurantId, name, cat, price, kcal, qty, desc,
  img: photo(extra.img || key), story: storyFor(key, extra.img),
  gallery: [photo(extra.img || key), ...extraPhotos(extra.img || key)].filter(Boolean),
  veg: true, available: true, bestseller: !!extra.best, sort: extra.sort || 0, estimated: true,
});

export const ITEMS = [
  // Raju Lassi
  I('raju-lassi', 'lassi', 'Sweet Lassi', 'lassi', 40, 260, '1 glass', 'गाढ़ी मीठी लस्सी, ऊपर मलाई।', { best: true }),
  I('raju-lassi', 'mango_lassi', 'Mango Lassi', 'lassi', 60, 320, '1 glass', 'पके आम वाली ठंडी लस्सी।'),
  I('raju-lassi', 'kesar_lassi', 'Kesar Badam Lassi', 'lassi', 70, 350, '1 glass', 'केसर, बादाम और मलाई वाली लस्सी।', { img: 'lassi' }),
  I('raju-lassi', 'banana_shake', 'Banana Shake', 'lassi', 60, 290, '1 glass', 'ताज़ा केला और ठंडा दूध।'),
  I('raju-lassi', 'cold_coffee', 'Cold Coffee', 'lassi', 70, 280, '1 glass', 'ठंडी कॉफ़ी, आइसक्रीम के साथ।'),
  I('raju-lassi', 'falooda', 'Royal Falooda', 'lassi', 90, 450, '1 glass', 'रोज़ सिरप, सेवइयाँ और कुल्फ़ी।', { best: true }),
  I('raju-lassi', 'rabri', 'Rabri', 'sweets', 60, 300, '100 g', 'धीमी आँच पर पकी गाढ़ी रबड़ी।'),
  I('raju-lassi', 'kulfi', 'Malai Kulfi', 'sweets', 30, 180, '1 piece', 'पिस्ता-मलाई कुल्फ़ी।'),
  I('raju-lassi', 'chaas', 'Masala Chaas', 'lassi', 25, 80, '1 glass', 'भुना जीरा और पुदीना वाली छाछ।'),
  I('raju-lassi', 'chai', 'Kulhad Chai', 'lassi', 15, 90, '1 kulhad', 'अदरक-इलायची वाली कुल्हड़ चाय।'),
  // Swagat Restaurant
  I('swagat-restaurant', 'thali', 'Special Veg Thali', 'thali', 150, 850, '1 thali', 'पनीर, दाल, सब्ज़ी, चावल, 3 रोटी, सलाद, मिठाई।', { best: true }),
  I('swagat-restaurant', 'pbm', 'Paneer Butter Masala', 'northindian', 180, 480, '1 plate', 'मक्खनी टमाटर ग्रेवी में पनीर।', { best: true }),
  I('swagat-restaurant', 'shahi_paneer', 'Shahi Paneer', 'northindian', 180, 500, '1 plate', 'काजू वाली मलाईदार ग्रेवी।'),
  I('swagat-restaurant', 'kadai_paneer', 'Kadai Paneer', 'northindian', 190, 470, '1 plate', 'शिमला मिर्च और कड़ाही मसाला।'),
  I('swagat-restaurant', 'dal_makhani', 'Dal Makhani', 'northindian', 140, 380, '1 plate', 'मक्खन वाली काली दाल।'),
  I('swagat-restaurant', 'dal_tadka', 'Dal Tadka', 'northindian', 110, 300, '1 plate', 'जीरा-लहसुन तड़का वाली दाल।'),
  I('swagat-restaurant', 'mix_veg', 'Mix Veg', 'northindian', 130, 280, '1 plate', 'मौसमी सब्ज़ियाँ।'),
  I('swagat-restaurant', 'jeera_rice', 'Jeera Rice', 'thali', 90, 350, '1 plate', 'जीरे वाला बासमती चावल।'),
  I('swagat-restaurant', 'roti', 'Tandoori Roti', 'northindian', 10, 120, '1 piece', 'तंदूर की गरम रोटी।'),
  I('swagat-restaurant', 'naan', 'Butter Naan', 'northindian', 35, 260, '1 piece', 'मक्खन लगा नान।'),
  // Food Ville Cafe
  I('food-ville-cafe', 'veg_pizza', 'Veg Pizza', 'fastfood', 150, 650, 'Medium', 'शिमला मिर्च, प्याज़, टमाटर और चीज़।', { best: true }),
  I('food-ville-cafe', 'burger', 'Aloo Tikki Burger', 'fastfood', 60, 380, '1 burger', 'करारी टिक्की, सलाद और सॉस।'),
  I('food-ville-cafe', 'momos', 'Veg Steamed Momos', 'chinese', 60, 300, '8 pieces', 'सब्ज़ी वाले भाप में पके मोमोज़।', { best: true }),
  I('food-ville-cafe', 'fried_momos', 'Fried Momos', 'chinese', 80, 420, '8 pieces', 'करारे तले मोमोज़, लाल चटनी।'),
  I('food-ville-cafe', 'chowmein', 'Veg Chowmein', 'chinese', 80, 450, '1 plate', 'देसी अंदाज़ की चाउमीन।'),
  I('food-ville-cafe', 'fries', 'French Fries', 'fastfood', 70, 360, '1 plate', 'करारे आलू फ़्राइज़।'),
  I('food-ville-cafe', 'sandwich', 'Veg Grilled Sandwich', 'fastfood', 70, 340, '1 sandwich', 'सब्ज़ी और चीज़ वाला ग्रिल सैंडविच।'),
  I('food-ville-cafe', 'pasta', 'Red Sauce Pasta', 'fastfood', 120, 520, '1 plate', 'टमाटर सॉस वाला पास्ता।'),
  I('food-ville-cafe', 'cold_coffee', 'Cold Coffee', 'lassi', 80, 280, '1 glass', 'ठंडी कॉफ़ी।'),
  I('food-ville-cafe', 'choco_shake', 'Chocolate Shake', 'lassi', 90, 420, '1 glass', 'गाढ़ा चॉकलेट शेक।'),
  // Laxmi Sweets
  I('laxmi-sweets', 'jalebi', 'Hot Jalebi', 'sweets', 40, 300, '100 g', 'गरमा-गरम करारी जलेबी।', { best: true }),
  I('laxmi-sweets', 'samosa', 'Samosa', 'chaat', 15, 250, '1 piece', 'आलू-मटर वाला करारा समोसा।', { best: true }),
  I('laxmi-sweets', 'gulab_jamun', 'Gulab Jamun', 'sweets', 20, 150, '1 piece', 'खोये के नरम गुलाब जामुन।'),
  I('laxmi-sweets', 'rasgulla', 'Rasgulla', 'sweets', 20, 120, '1 piece', 'छेना के रसीले रसगुल्ले।'),
  I('laxmi-sweets', 'kaju_katli', 'Kaju Katli', 'sweets', 250, 520, '250 g', 'काजू की बर्फ़ी।'),
  I('laxmi-sweets', 'laddu', 'Motichoor Laddu', 'sweets', 120, 450, '250 g', 'देसी घी वाले मोतीचूर लड्डू।'),
  I('laxmi-sweets', 'barfi', 'Milk Barfi', 'sweets', 130, 480, '250 g', 'दूध की ताज़ी बर्फ़ी।'),
  I('laxmi-sweets', 'aloo_tikki', 'Aloo Tikki Chaat', 'chaat', 40, 300, '1 plate', 'दही, चटनी वाली टिक्की चाट।'),
  I('laxmi-sweets', 'kachori', 'Khasta Kachori', 'chaat', 20, 260, '1 piece', 'आलू की सब्ज़ी के साथ खस्ता कचौरी।'),
  I('laxmi-sweets', 'dahi_bhalla', 'Dahi Bhalla', 'chaat', 50, 320, '1 plate', 'मीठी दही और चटनी वाले भल्ले।'),
];
