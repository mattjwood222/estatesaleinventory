const items = Array.isArray(window.PUBLIC_ITEMS) ? window.PUBLIC_ITEMS : [];
const grid = document.querySelector("#itemGrid");
const search = document.querySelector("#searchInput");
const chips = document.querySelector("#categoryChips");
const count = document.querySelector("#resultCount");
const loadMore = document.querySelector("#loadMore");
const dialog = document.querySelector("#photoDialog");
const dialogImage = document.querySelector("#dialogImage");
const dialogCaption = document.querySelector("#dialogCaption");
let category = "All";
let visible = 48;

const categories = ["All", ...new Set(items.map(x => x.category).filter(Boolean).sort())];
for (const name of categories) {
  const button = document.createElement("button");
  button.className = `chip${name === "All" ? " active" : ""}`;
  button.type = "button";
  button.textContent = name;
  button.addEventListener("click", () => {
    category = name;
    visible = 48;
    document.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x === button));
    render();
  });
  chips.append(button);
}

function matches(item) {
  const q = search.value.trim().toLowerCase();
  const inCategory = category === "All" || item.category === category;
  const haystack = `${item.item} ${item.brand || ""} ${item.model || ""} ${item.category}`.toLowerCase();
  return inCategory && (!q || haystack.includes(q));
}

function render() {
  const filtered = items.filter(matches);
  grid.replaceChildren();
  for (const item of filtered.slice(0, visible)) {
    const card = document.createElement("article");
    card.className = "item-card";
    const media = item.photo
      ? `<img class="item-photo" loading="lazy" src="${item.photo}" alt="${escapeHtml(item.item)}">`
      : `<div class="photo-placeholder">Photo not yet available</div>`;
    const brand = [item.brand, item.model].filter(Boolean).join(" · ");
    card.innerHTML = `${media}<div class="item-content"><span class="item-category">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.item)}</h3>${brand ? `<p class="item-brand">${escapeHtml(brand)}</p>` : ""}</div>`;
    const image = card.querySelector("img");
    if (image) image.addEventListener("click", () => openPhoto(item));
    grid.append(card);
  }
  count.textContent = `${filtered.length.toLocaleString()} photographed items`;
  loadMore.hidden = visible >= filtered.length;
}

function openPhoto(item) {
  dialogImage.src = item.photo;
  dialogImage.alt = item.item;
  dialogCaption.textContent = item.item;
  dialog.showModal();
}
function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
search.addEventListener("input", () => { visible = 48; render(); });
loadMore.addEventListener("click", () => { visible += 48; render(); });
dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
render();
