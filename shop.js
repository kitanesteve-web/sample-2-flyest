const collectionCategory = new URLSearchParams(location.search).get("category") === "shirts"
  ? "shirts"
  : "hoodies";
const collectionProducts = products.filter((product) => product.category === collectionCategory);
const isShirtCollection = collectionCategory === "shirts";

document.title = `FLYEST — ${isShirtCollection ? "T-shirts" : "Hoodies"}`;
document.getElementById("shopTitle").textContent = isShirtCollection ? "The T-shirt collection" : "The hoodie collection";
document.getElementById("shopIntro").textContent = isShirtCollection
  ? "Graphic staples and everyday essentials. Find your new favorite tee."
  : "Heavyweight comfort. A statement in every color. Made to move with you.";
document.getElementById("shopCount").textContent = `${collectionProducts.length} STYLES`;
document.getElementById(isShirtCollection ? "shirtTab" : "hoodieTab").setAttribute("aria-current", "page");

const shopGrid = document.getElementById("shopGrid");
collectionProducts.forEach((product) => {
  const card = document.createElement("a");
  card.className = "card shop-card";
  card.href = `${isShirtCollection ? "shirt" : "hoodie"}.html?id=${encodeURIComponent(product.id)}`;
  card.innerHTML = `
    <div class="card-img">
      ${product.isSoldOut ? '<span class="product-badge product-badge-soldout">SOLD OUT</span>' : ""}
      ${product.isNewRelease ? '<span class="product-badge">NEW RELEASE</span>' : ""}
      ${product.salePrice ? '<span class="product-badge product-badge-sale">BER-MONTH SALE</span>' : ""}
    </div>
    <div class="card-meta">
      <div class="card-name">${product.name}</div>
      <div class="card-price price-row">${formatProductPrice(product)}</div>
    </div>
    <div class="card-cta">${product.isSoldOut ? "SOLD OUT" : "VIEW PRODUCT ↗"}</div>`;
  const image = card.querySelector(".card-img");
  if (product.backImage) image.appendChild(createShirtPreview(product));
  else {
    const img = document.createElement("img");
    img.src = product.image;
    img.alt = product.name;
    img.loading = "lazy";
    image.appendChild(img);
  }
  shopGrid.appendChild(card);
});
