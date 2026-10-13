const SIZES = ["M", "L", "XL", "2XL", "3XL"];

const HOODIE_PRODUCTS = ["Black", "Brown", "Cream", "Green", "Grey", "Sky Blue"].map((name) => ({
  id: name.toLowerCase().replace(/\s+/g, "-"),
  name: `Flyest ${name} Hoodie`,
  price: 1700,
  image: `${name} Hoodie.png`,
  category: "hoodies",
}));

const SHIRT_DESIGNS = [
  ["Dark Gothic Logo Tee", "Tshirt.png"],
  ["Portrait Graphic Tee", "Tshirt (2).png"],
  ["Script Logo Tee", "Tshirt (3).png"],
  ["Graphic Statement Tee", "Tshirt (4).png"],
  ["Orange Graphic Tee", "Tshirt (5).png"],
  ["Classic Logo Tee", "Tshirt (6).png"],
  ["Violet Logo Tee", "Tshirt (7).png"],
  ["Midnight Script Tee", "Tshirt (8).png"],
  ["Lightning Graphic Tee", "Tshirt (9).png"],
  ["Editorial Graphic Tee", "Tshirt (10).png"],
  ["Logo Essentials Tee", "Tshirt (11).png"],
  ["Signature Script Tee", "Tshirt (12).png"],
];

const SHIRT_BACKS = {
  0: "Back 0.png",
  3: "Back 3.png",
  5: "Back 5.png",
  9: "Back 9.png",
  11: "Back 11.png",
};

const NEW_RELEASE_SHIRT_IDS = new Set(["tee-09", "tee-10"]);
const BER_MONTH_PROMO_SHIRT_IDS = new Set(["tee-03", "tee-06"]);
const SOLD_OUT_SHIRT_IDS = new Set(["tee-05"]);

const SHIRT_PRODUCTS = SHIRT_DESIGNS.map(([name, image], index) => {
  const shirtNumber = index === 0 ? 0 : index + 1;
  const id = `tee-${String(index + 1).padStart(2, "0")}`;
  return {
    id,
    name: `Flyest ${name}`,
    price: 750,
    ...(BER_MONTH_PROMO_SHIRT_IDS.has(id) ? { salePrice: 500 } : {}),
    image: `tshirt/${image}`,
    backImage: SHIRT_BACKS[shirtNumber] ? `back/${SHIRT_BACKS[shirtNumber]}` : null,
    category: "shirts",
    isNewRelease: NEW_RELEASE_SHIRT_IDS.has(id),
    isSoldOut: SOLD_OUT_SHIRT_IDS.has(id),
  };
});

const products = [...HOODIE_PRODUCTS, ...SHIRT_PRODUCTS];
if (typeof module !== "undefined") module.exports = products;

function getProductPrice(product) {
  return product.salePrice ?? product.price;
}

function formatProductPrice(product, fractionDigits = 0) {
  const format = (price) => `₱${price.toLocaleString("en-PH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
  const currentPrice = format(getProductPrice(product));
  if (!product.salePrice) return currentPrice;

  const discount = Math.round((1 - product.salePrice / product.price) * 100);
  return `<span class="sale-price">${currentPrice}</span><del class="original-price">${format(product.price)}</del><span class="discount-pill">${discount}% OFF</span>`;
}

function createShirtPreview(product, detailed = false) {
  const preview = document.createElement("div");
  preview.className = detailed ? "tee-image-preview tee-image-preview-detailed" : "tee-image-preview";
  preview.setAttribute("role", "img");
  preview.setAttribute("aria-label", `${product.name}, front view`);
  if (detailed) preview.tabIndex = 0;

  const front = document.createElement("img");
  front.className = "tee-preview-front";
  front.src = product.image;
  front.alt = "";
  front.draggable = false;

  const back = document.createElement("img");
  back.className = "tee-preview-back";
  back.src = product.backImage;
  back.alt = "";
  back.draggable = false;
  back.setAttribute("aria-hidden", "true");

  const frontLabel = document.createElement("span");
  frontLabel.className = "tee-preview-label tee-preview-front-label";
  frontLabel.textContent = "FRONT";

  const backLabel = document.createElement("span");
  backLabel.className = "tee-preview-label tee-preview-back-label";
  backLabel.textContent = "BACK";

  preview.append(front, back, frontLabel, backLabel);

  const showBack = () => {
    preview.classList.add("show-back");
    preview.setAttribute("aria-label", `${product.name}, back view`);
    back.setAttribute("aria-hidden", "false");
  };
  const showFront = () => {
    preview.classList.remove("show-back");
    preview.setAttribute("aria-label", `${product.name}, front view`);
    back.setAttribute("aria-hidden", "true");
  };

  preview.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse" || event.pointerType === "pen") showBack();
  });
  preview.addEventListener("pointerleave", showFront);
  preview.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") showBack();
  });
  preview.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") showFront();
  });
  preview.addEventListener("pointercancel", showFront);
  preview.addEventListener("focus", showBack);
  preview.addEventListener("blur", showFront);

  return preview;
}
