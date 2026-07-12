const assert = require("node:assert/strict");
const test = require("node:test");

let guide;

test.before(async () => {
  guide = await import("../src/size-guide.mjs");
});

test("female clothing follows the supplied height and weight table", () => {
  const result = guide.clothingRecommendation({ gender: "female", height: 149, weight: 55 });
  assert.equal(result.heightSize, "S");
  assert.equal(result.weightSize, "XL");
  assert.equal(result.size, "XL");
  assert.equal(result.extrapolated, false);
});

test("male clothing follows the supplied table", () => {
  const result = guide.clothingRecommendation({ gender: "male", height: 172, weight: 68 });
  assert.equal(result.heightSize, "L");
  assert.equal(result.weightSize, "L");
  assert.equal(result.size, "L");
});

test("each supplied clothing row resolves to its labeled size", () => {
  const examples = [
    ["female", 150, 40, "S"], ["female", 154, 44, "M"],
    ["female", 157, 49, "L"], ["female", 160, 55, "XL"],
    ["female", 164, 61, "XXL"], ["male", 162, 57, "S"],
    ["male", 167, 63, "M"], ["male", 172, 68, "L"],
    ["male", 175, 73, "XL"], ["male", 177, 78, "XXL"],
  ];
  for (const [gender, height, weight, expected] of examples) {
    assert.equal(guide.clothingRecommendation({ gender, height, weight }).size, expected);
  }
});

test("clothing sizes extend beyond the supplied table in both directions", () => {
  assert.equal(
    guide.clothingRecommendation({ gender: "female", height: 143, weight: 33 }).size,
    "XS",
  );
  assert.equal(
    guide.clothingRecommendation({ gender: "female", height: 167, weight: 67 }).size,
    "3XL",
  );
  assert.equal(
    guide.clothingRecommendation({ gender: "male", height: 182, weight: 86 }).size,
    "3XL",
  );
});

test("shoe conversion matches exact male and female rows", () => {
  assert.deepEqual(
    guide.shoeRecommendation({ gender: "male", footLength: 23.5 }),
    { gender: "male", genderLabel: "Nam", vn: "39", us: "6", uk: "5.5", extrapolated: false },
  );
  assert.deepEqual(
    guide.shoeRecommendation({ gender: "female", footLength: 20.8 }),
    { gender: "female", genderLabel: "Nữ", vn: "34–35", us: "4", uk: "2", extrapolated: false },
  );
});

test("every supplied shoe row keeps its VN, US and UK conversion", () => {
  const maleRows = [
    [23.5, "39", "6", "5.5"], [24.1, "39–40", "6.5", "6"],
    [24.4, "40", "7", "6.5"], [24.8, "40–41", "7.5", "7"],
    [25.4, "41", "8", "7.5"], [25.7, "41–42", "8.5", "8"],
    [26, "42", "9", "8.5"], [26.7, "42–43", "9.5", "9"],
    [27, "43", "10", "9.5"], [27.3, "43–44", "10.5", "10"],
    [27.9, "44", "11", "10.5"], [28.3, "44–45", "11.5", "11"],
    [28.6, "45", "12", "11.5"], [29.4, "46", "13", "12.5"],
    [30.2, "47", "14", "13.5"], [31, "48", "15", "14.5"],
    [31.8, "49", "16", "15.5"],
  ];
  const femaleRows = [
    [20.8, "34–35", "4", "2"], [21.2, "35", "4.5", "2.5"],
    [21.6, "35–36", "5", "3"], [22.2, "36", "5.5", "3.5"],
    [22.5, "36–37", "6", "4"], [23, "37", "6.5", "4.5"],
    [23.5, "37–38", "7", "5"], [23.8, "38", "7.5", "5.5"],
    [24.1, "38–39", "8", "6"], [24.6, "39", "8.5", "6.5"],
    [25.1, "39–40", "9", "7"], [25.4, "40", "9.5", "7.5"],
    [25.9, "40–41", "10", "8"], [26.2, "41", "10.5", "8.5"],
    [26.7, "41–42", "11", "9"], [27.1, "42", "11.5", "9.5"],
    [27.6, "42–43", "12", "10"],
  ];
  for (const [gender, rows] of [["male", maleRows], ["female", femaleRows]]) {
    for (const [footLength, vn, us, uk] of rows) {
      assert.deepEqual(guide.shoeRecommendation({ gender, footLength }), {
        gender,
        genderLabel: gender === "male" ? "Nam" : "Nữ",
        vn,
        us,
        uk,
        extrapolated: false,
      });
    }
  }
});

test("shoe conversion interpolates between supplied rows", () => {
  const result = guide.shoeRecommendation({ gender: "male", footLength: 29 });
  assert.equal(result.vn, "45–46");
  assert.equal(result.us, "12.5");
  assert.equal(result.uk, "12");
  assert.equal(result.extrapolated, false);
});

test("shoe conversion extrapolates from the closest edge step", () => {
  const male = guide.shoeRecommendation({ gender: "male", footLength: 32.6 });
  assert.equal(male.vn, "50");
  assert.equal(male.us, "17");
  assert.equal(male.uk, "16.5");
  assert.equal(male.extrapolated, true);

  const female = guide.shoeRecommendation({ gender: "female", footLength: 28.1 });
  assert.equal(female.vn, "43");
  assert.equal(female.us, "12.5");
  assert.equal(female.uk, "10.5");
  assert.equal(female.extrapolated, true);

  const extended = guide.shoeRecommendation({ gender: "female", footLength: 36 });
  assert.equal(extended.vn, "51");
  assert.equal(extended.us, "20.5");
  assert.equal(extended.uk, "18.5");
});
