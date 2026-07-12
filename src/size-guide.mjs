const CLOTHING_GUIDES = {
  female: {
    label: "Nữ",
    heightStep: 5,
    weightStep: 7,
    rows: [
      { size: "S", height: [148, 153], weight: [38, 43] },
      { size: "M", height: [153, 155], weight: [43, 46] },
      { size: "L", height: [153, 158], weight: [46, 53] },
      { size: "XL", height: [155, 162], weight: [53, 57] },
      { size: "XXL", height: [155, 166], weight: [57, 66] },
    ],
  },
  male: {
    label: "Nam",
    heightStep: 5,
    weightStep: 6,
    rows: [
      { size: "S", height: [160, 165], weight: [55, 60] },
      { size: "M", height: [164, 169], weight: [60, 65] },
      { size: "L", height: [170, 174], weight: [66, 70] },
      { size: "XL", height: [174, 176], weight: [70, 76] },
      { size: "XXL", height: [165, 177], weight: [76, 80] },
    ],
  },
};

const SHOE_GUIDES = {
  female: {
    label: "Nữ",
    minUs: 2,
    maxUs: 24,
    ukOffset: -2,
    points: [
      [20.8, 4], [21.2, 4.5], [21.6, 5], [22.2, 5.5], [22.5, 6],
      [23, 6.5], [23.5, 7], [23.8, 7.5], [24.1, 8], [24.6, 8.5],
      [25.1, 9], [25.4, 9.5], [25.9, 10], [26.2, 10.5], [26.7, 11],
      [27.1, 11.5], [27.6, 12],
    ],
  },
  male: {
    label: "Nam",
    minUs: 3,
    maxUs: 24,
    ukOffset: -0.5,
    points: [
      [23.5, 6], [24.1, 6.5], [24.4, 7], [24.8, 7.5], [25.4, 8],
      [25.7, 8.5], [26, 9], [26.7, 9.5], [27, 10], [27.3, 10.5],
      [27.9, 11], [28.3, 11.5], [28.6, 12], [29.4, 13], [30.2, 14],
      [31, 15], [31.8, 16],
    ],
  },
};

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function numeric(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeGender(value) {
  return value === "male" ? "male" : "female";
}

export function clothingSizeLabel(index) {
  if (index <= -2) return `${Math.abs(index)}XS`;
  if (index === -1) return "XS";
  if (index === 0) return "S";
  if (index === 1) return "M";
  if (index === 2) return "L";
  if (index === 3) return "XL";
  if (index === 4) return "XXL";
  return `${index - 2}XL`;
}

function dimensionIndex(value, guide, dimension) {
  const measured = numeric(value);
  if (measured == null) return null;
  const rows = guide.rows;
  const firstMinimum = rows[0][dimension][0];
  const lastMaximum = rows.at(-1)[dimension][1];
  const step = dimension === "height" ? guide.heightStep : guide.weightStep;

  if (measured < firstMinimum) {
    return clamp(Math.floor((measured - firstMinimum) / step), -4, 10);
  }
  for (let index = 0; index < rows.length; index += 1) {
    if (measured <= rows[index][dimension][1]) return index;
  }
  return clamp(rows.length - 1 + Math.ceil((measured - lastMaximum) / step), -4, 10);
}

export function clothingRecommendation({ gender, height, weight } = {}) {
  const normalizedGender = normalizeGender(gender);
  const guide = CLOTHING_GUIDES[normalizedGender];
  const heightIndex = dimensionIndex(height, guide, "height");
  const weightIndex = dimensionIndex(weight, guide, "weight");
  const candidates = [heightIndex, weightIndex].filter(Number.isInteger);
  if (!candidates.length) {
    return {
      gender: normalizedGender,
      genderLabel: guide.label,
      size: "—",
      heightSize: null,
      weightSize: null,
      extrapolated: false,
    };
  }
  const index = Math.max(...candidates);
  return {
    gender: normalizedGender,
    genderLabel: guide.label,
    size: clothingSizeLabel(index),
    heightSize: Number.isInteger(heightIndex) ? clothingSizeLabel(heightIndex) : null,
    weightSize: Number.isInteger(weightIndex) ? clothingSizeLabel(weightIndex) : null,
    extrapolated: index < 0 || index >= guide.rows.length,
  };
}

function interpolateUsSize(length, points) {
  const first = points[0];
  const last = points.at(-1);
  let lower = first;
  let upper = points[1];
  if (length >= last[0]) {
    lower = points.at(-2);
    upper = last;
  } else if (length > first[0]) {
    for (let index = 1; index < points.length; index += 1) {
      if (length <= points[index][0]) {
        lower = points[index - 1];
        upper = points[index];
        break;
      }
    }
  }
  const progress = (length - lower[0]) / (upper[0] - lower[0]);
  return lower[1] + progress * (upper[1] - lower[1]);
}

function halfSize(value) {
  return Math.round(value * 2) / 2;
}

function sizeText(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function vietnamShoeSize(gender, usSize) {
  if (gender === "male") {
    if (Number.isInteger(usSize)) return String(usSize + 33);
    const lower = Math.floor(usSize) + 33;
    return `${lower}–${lower + 1}`;
  }
  if (Number.isInteger(usSize)) return `${usSize + 30}–${usSize + 31}`;
  return String(Math.floor(usSize) + 31);
}

export function shoeRecommendation({ gender, footLength } = {}) {
  const normalizedGender = normalizeGender(gender);
  const guide = SHOE_GUIDES[normalizedGender];
  const length = numeric(footLength);
  if (length == null) {
    return {
      gender: normalizedGender,
      genderLabel: guide.label,
      vn: "—",
      us: "—",
      uk: "—",
      extrapolated: false,
    };
  }
  const rawUs = interpolateUsSize(length, guide.points);
  const us = clamp(halfSize(rawUs), guide.minUs, guide.maxUs);
  const uk = us + guide.ukOffset;
  return {
    gender: normalizedGender,
    genderLabel: guide.label,
    vn: vietnamShoeSize(normalizedGender, us),
    us: sizeText(us),
    uk: sizeText(uk),
    extrapolated: length < guide.points[0][0] || length > guide.points.at(-1)[0],
  };
}

export const sizeGuideTables = {
  clothing: CLOTHING_GUIDES,
  shoes: SHOE_GUIDES,
};
