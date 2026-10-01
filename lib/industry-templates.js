// Industry-specific templates for multi-business support
// Each template defines the product fields, categories, and units of measure for that industry

export const INDUSTRY_TEMPLATES = {
  clothing: {
    name: 'Clothing & Fashion',
    icon: '👕',
    description: 'For clothing, apparel, textiles, and fashion accessories',
    defaultUOM: 'Piece',
    categories: [
      'Kids',
      'Men',
      'Women',
      'Jeans',
      'Tops',
      'Jackets',
      'Hosiery',
      'Woollen',
      'Suits',
      'Dresses',
      'Activewear',
      'Accessories',
      'Others',
    ],
    hsnMapping: {
      'Kids': ['6109 - Clothing (cotton)', '6110 - Clothing (synthetic)', '6111 - Clothing (wool)'],
      'Men': ['6203 - Men\'s suits', '6205 - Men\'s shirts', '6206 - Men\'s trousers'],
      'Women': ['6204 - Women\'s suits', '6205 - Women\'s shirts', '6214 - Other clothing'],
      'Jeans': ['6203 - Trousers (denim)', '6205 - Denim shirts'],
      'Tops': ['6105 - T-shirts & vests', '6205 - Shirts (cotton)', '6206 - Blouses'],
      'Jackets': ['6209 - Jackets', '6210 - Overcoats & cloaks'],
      'Hosiery': ['6107 - Hosiery knitted', '6108 - Hosiery (other)'],
      'Woollen': ['6104 - Woollen clothing', '6111 - Wool garments'],
      'Suits': ['6203 - Suits (men)', '6204 - Suits (women)'],
      'Dresses': ['6204 - Dresses', '6206 - Blouses & dresses'],
      'Activewear': ['6104 - Sportswear', '6105 - Activewear'],
      'Accessories': ['4203 - Articles of leather', '6217 - Belts & accessories'],
      'Others': ['6112 - Other clothing'],
    },
    customFields: [
      { name: 'size', label: 'Size', type: 'text', required: false, placeholder: 'S, M, L, XL' },
      { name: 'color', label: 'Colour', type: 'text', required: false, placeholder: 'e.g., Red' },
      { name: 'articleNo', label: 'Article No', type: 'text', required: false },
    ],
    invoiceScanPrompt: `Extract items from this image. Return JSON with array of clothing items including: name, articleNo, hsn, sizes, qty, price, gst, cat (category), color.`,
  },

  electronics: {
    name: 'Electronics & Gadgets',
    icon: '📱',
    description: 'For mobile phones, laptops, computers, and electronic devices',
    defaultUOM: 'Piece',
    categories: [
      'Mobile Phones',
      'Laptops',
      'Tablets',
      'Computers',
      'Accessories',
      'Gaming',
      'Audio',
      'Wearables',
      'Smart Home',
      'Others',
    ],
    hsnMapping: {
      'Mobile Phones': ['8517 - Telephone sets', '8471 - Electronic devices'],
      'Laptops': ['8471 - Automatic data processing machines', '8517 - Computer peripherals'],
      'Tablets': ['8471 - Tablet computers', '8517 - Portable devices'],
      'Computers': ['8471 - Personal computers', '8517 - Computer systems'],
      'Accessories': ['8504 - Electrical transformers', '8517 - Cables & adapters'],
      'Gaming': ['9504 - Video game consoles', '8471 - Gaming devices'],
      'Audio': ['8518 - Microphones & speakers', '8519 - Audio equipment'],
      'Wearables': ['9113 - Watch movements', '9114 - Watches'],
      'Smart Home': ['8537 - Smart home devices', '8517 - IoT devices'],
      'Others': ['8471 - Other electronics'],
    },
    customFields: [
      { name: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'Apple, Samsung, etc' },
      { name: 'model', label: 'Model', type: 'text', required: false, placeholder: 'e.g., iPhone 15 Pro' },
      { name: 'warranty', label: 'Warranty (months)', type: 'number', required: false },
      { name: 'serialNumber', label: 'Serial Number Tracking', type: 'boolean', required: false },
    ],
    invoiceScanPrompt: `Extract items from this electronics invoice. Return JSON with: name, brand, model, hsn, qty, price, gst, category. Include warranty months if mentioned.`,
  },

  jewelry: {
    name: 'Jewelry & Gold',
    icon: '💍',
    description: 'For gold, silver, jewelry, and precious metals',
    defaultUOM: 'Gram',
    categories: [
      'Rings',
      'Earrings',
      'Necklaces',
      'Bracelets',
      'Bangles',
      'Pendants',
      'Chains',
      'Anklets',
      'Nose Rings',
      'Brooches',
      'Others',
    ],
    hsnMapping: {
      'Rings': ['7113 - Precious metal rings', '7117 - Gold rings'],
      'Earrings': ['7113 - Precious metal earrings', '7116 - Gold earrings'],
      'Necklaces': ['7113 - Precious metal necklaces', '7114 - Gold necklaces'],
      'Bracelets': ['7113 - Precious metal bracelets', '7115 - Gold bracelets'],
      'Bangles': ['7113 - Metal bangles', '7117 - Gold bangles'],
      'Pendants': ['7113 - Pendants', '7118 - Gold pendants'],
      'Chains': ['7113 - Precious metal chains', '7119 - Gold chains'],
      'Anklets': ['7113 - Anklets', '7117 - Gold anklets'],
      'Nose Rings': ['7113 - Nose ornaments', '7116 - Nose rings'],
      'Brooches': ['7113 - Brooches', '7114 - Gold brooches'],
      'Others': ['7113 - Other jewelry'],
    },
    customFields: [
      { name: 'weight', label: 'Weight (gm)', type: 'number', required: false, placeholder: '5.5' },
      { name: 'purity', label: 'Purity (K)', type: 'text', required: false, placeholder: '22K, 18K, 24K' },
      { name: 'metalType', label: 'Metal Type', type: 'text', required: false, placeholder: 'Gold, Silver, Platinum' },
      { name: 'certification', label: 'Certification', type: 'text', required: false },
    ],
    invoiceScanPrompt: `Extract jewelry items from this invoice. Return JSON with: name, weight (gm), purity, metalType, hsn, qty, price, gst, category. Focus on precious metal details.`,
  },

  spices: {
    name: 'Spices & Dry Goods',
    icon: '🌶️',
    description: 'For spices, grains, flour, and dry goods',
    defaultUOM: 'Kilogram',
    categories: [
      'Powders',
      'Whole Spices',
      'Spice Blends',
      'Grains',
      'Flours',
      'Pulses',
      'Seeds',
      'Oils',
      'Condiments',
      'Others',
    ],
    hsnMapping: {
      'Powders': ['0709 - Spice powders', '0710 - Ground spices'],
      'Whole Spices': ['0709 - Whole spices', '0711 - Dried spices'],
      'Spice Blends': ['0709 - Spice mixes', '0712 - Spice blends'],
      'Grains': ['1001 - Wheat', '1005 - Rice', '1006 - Barley'],
      'Flours': ['1101 - Wheat flour', '1102 - Cereal flour'],
      'Pulses': ['0713 - Dried pulses', '0714 - Lentils'],
      'Seeds': ['1207 - Seeds', '1208 - Oil seeds'],
      'Oils': ['1509 - Vegetable oils', '1510 - Coconut oil'],
      'Condiments': ['0909 - Condiments', '0910 - Sauces'],
      'Others': ['0709 - Other spices'],
    },
    customFields: [
      { name: 'weight', label: 'Weight/Quantity', type: 'text', required: false, placeholder: 'kg, gm, liter' },
      { name: 'expiryDate', label: 'Expiry Date', type: 'date', required: false },
      { name: 'origin', label: 'Origin/Source', type: 'text', required: false, placeholder: 'e.g., India' },
      { name: 'batchNo', label: 'Batch Number', type: 'text', required: false },
    ],
    invoiceScanPrompt: `Extract spice/dry goods items from this invoice. Return JSON with: name, weight, expiryDate, origin, hsn, qty, price, gst, category.`,
  },

  homeDecor: {
    name: 'Home Decor & Furniture',
    icon: '🪑',
    description: 'For furniture, home decor, lighting, and interior items',
    defaultUOM: 'Piece',
    categories: [
      'Furniture',
      'Lighting',
      'Wall Art',
      'Rugs & Carpets',
      'Cushions & Pillows',
      'Curtains',
      'Mirrors',
      'Plants & Planters',
      'Decorative Items',
      'Bedding',
      'Others',
    ],
    hsnMapping: {
      'Furniture': ['9401 - Wooden furniture', '9402 - Metal furniture'],
      'Lighting': ['9406 - Lamps & lights', '8539 - LED lights'],
      'Wall Art': ['9703 - Art & paintings', '9705 - Wall decor'],
      'Rugs & Carpets': ['5701 - Carpets & rugs', '5702 - Floor coverings'],
      'Cushions & Pillows': ['9404 - Cushions', '5809 - Textiles accessories'],
      'Curtains': ['6303 - Curtains', '5808 - Fabric articles'],
      'Mirrors': ['7007 - Mirrors', '9406 - Mirror articles'],
      'Plants & Planters': ['9602 - Plant pots', '6801 - Planters'],
      'Decorative Items': ['9703 - Decorations', '9705 - Home decorations'],
      'Bedding': ['6301 - Bed linen', '9404 - Bedding'],
      'Others': ['9405 - Other home items'],
    },
    customFields: [
      { name: 'dimensions', label: 'Dimensions (L×W×H)', type: 'text', required: false, placeholder: '100×50×75 cm' },
      { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'Wood, Metal, Fabric' },
      { name: 'color', label: 'Colour', type: 'text', required: false },
      { name: 'warranty', label: 'Warranty (months)', type: 'number', required: false },
    ],
    invoiceScanPrompt: `Extract home decor/furniture items from this invoice. Return JSON with: name, dimensions, material, color, hsn, qty, price, gst, category.`,
  },

  tiles: {
    name: 'Tiles & Marble',
    icon: '🧱',
    description: 'For floor tiles, wall tiles, marble, granite, and stonework',
    defaultUOM: 'Piece',
    categories: [
      'Floor Tiles',
      'Wall Tiles',
      'Marble',
      'Granite',
      'Mosaic',
      'Ceramics',
      'Porcelain',
      'Natural Stone',
      'Others',
    ],
    hsnMapping: {
      'Floor Tiles': ['6908 - Floor tiles', '6909 - Ceramic tiles'],
      'Wall Tiles': ['6908 - Wall tiles', '6910 - Glazed tiles'],
      'Marble': ['2515 - Marble blocks', '2516 - Marble slabs'],
      'Granite': ['2517 - Granite blocks', '2518 - Granite slabs'],
      'Mosaic': ['6908 - Mosaic tiles', '2520 - Mosaic pieces'],
      'Ceramics': ['6907 - Ceramic tiles', '6908 - Ceramic products'],
      'Porcelain': ['6906 - Porcelain tiles', '6911 - Porcelain products'],
      'Natural Stone': ['2516 - Natural stone', '2517 - Stone slabs'],
      'Others': ['6912 - Other tiles'],
    },
    customFields: [
      { name: 'size', label: 'Size (L×W in inches)', type: 'text', required: false, placeholder: '12×24' },
      { name: 'sqFeet', label: 'Coverage (sq ft)', type: 'number', required: false },
      { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'Ceramic, Marble, Granite' },
      { name: 'finish', label: 'Finish Type', type: 'text', required: false, placeholder: 'Glossy, Matte, Textured' },
      { name: 'pattern', label: 'Pattern/Design', type: 'text', required: false },
    ],
    invoiceScanPrompt: `Extract tile/marble items from this invoice. Return JSON with: name, size, sqFeet, material, finish, pattern, hsn, qty, price, gst, category.`,
  },

  pharmacy: {
    name: 'Pharmacy & Medicines',
    icon: '💊',
    description: 'For medicines, supplements, and pharmaceutical products',
    defaultUOM: 'Strip',
    categories: [
      'Tablets',
      'Capsules',
      'Syrups',
      'Injections',
      'Ointments',
      'Supplements',
      'Medical Devices',
      'Others',
    ],
    hsnMapping: {
      'Tablets': ['3004 - Medicinal tablets', '3005 - Dosage forms'],
      'Capsules': ['3004 - Capsules', '3005 - Medicinal capsules'],
      'Syrups': ['3002 - Medicinal syrups', '3003 - Liquid medicines'],
      'Injections': ['3002 - Injections', '3006 - Injectable medicines'],
      'Ointments': ['3004 - Ointments', '3007 - Topical medicines'],
      'Supplements': ['2106 - Supplements', '3004 - Vitamin supplements'],
      'Medical Devices': ['9018 - Medical devices', '9019 - Surgical instruments'],
      'Others': ['3004 - Other medicines'],
    },
    customFields: [
      { name: 'expiryDate', label: 'Expiry Date', type: 'date', required: false },
      { name: 'batchNo', label: 'Batch Number', type: 'text', required: false },
      { name: 'manufacturer', label: 'Manufacturer', type: 'text', required: false },
      { name: 'strength', label: 'Strength/Dosage', type: 'text', required: false, placeholder: '500mg, 10ml' },
    ],
    invoiceScanPrompt: `Extract medicine/pharmacy items from this invoice. Return JSON with: name, strength, expiryDate, batchNo, manufacturer, hsn, qty, price, gst, category.`,
  },

  general: {
    name: 'General Retail',
    icon: '🛍️',
    description: 'For any general retail business not covered above',
    defaultUOM: 'Piece',
    categories: ['Category 1', 'Category 2', 'Category 3', 'Others'],
    hsnMapping: {
      'Category 1': ['0000 - Default HSN'],
      'Category 2': ['0000 - Default HSN'],
      'Category 3': ['0000 - Default HSN'],
      'Others': ['0000 - Default HSN'],
    },
    customFields: [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'color', label: 'Colour', type: 'text', required: false },
      { name: 'size', label: 'Size', type: 'text', required: false },
    ],
    invoiceScanPrompt: `Extract items from this invoice. Return JSON with: name, hsn, qty, price, gst, category.`,
  },

  custom: {
    name: 'Custom Setup',
    icon: '⚙️',
    description: 'Create your own industry with custom fields',
    defaultUOM: 'Piece',
    categories: ['Category 1', 'Category 2', 'Others'],
    customFields: [],
    invoiceScanPrompt: `Extract items from this invoice. Return JSON with: name, hsn, qty, price, gst, category.`,
  },
};

// Get template for an industry type
export const getIndustryTemplate = (industryType) => {
  return INDUSTRY_TEMPLATES[industryType] || INDUSTRY_TEMPLATES.general;
};

// Get all available industries
export const getAvailableIndustries = () => {
  return Object.entries(INDUSTRY_TEMPLATES).map(([key, value]) => ({
    id: key,
    ...value,
  }));
};

// Units of measure by industry
export const UOM_BY_INDUSTRY = {
  clothing: ['Piece', 'Dozen', 'Bundle'],
  electronics: ['Piece', 'Set', 'Pack', 'Box'],
  jewelry: ['Gram', 'Piece', 'Oz'],
  spices: ['Kilogram', 'Gram', 'Litre', 'Millilitre', 'Piece'],
  homeDecor: ['Piece', 'Set', 'Pair', 'Pack', 'Sq Ft', 'Sq Meter'],
  tiles: ['Piece', 'Box', 'Sq Ft', 'Sq Meter'],
  pharmacy: ['Strip', 'Tablet', 'Bottle', 'Piece', 'Box'],
  general: ['Piece', 'Dozen', 'Pack', 'Box', 'Kilogram', 'Litre'],
};

export const getAllUOM = () => {
  const allUOM = new Set();
  Object.values(UOM_BY_INDUSTRY).forEach((items) => {
    items.forEach((item) => allUOM.add(item));
  });
  return Array.from(allUOM);
};
