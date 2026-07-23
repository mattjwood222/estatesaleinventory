const inventory = Array.isArray(window.INTERNAL_ITEMS) ? window.INTERNAL_ITEMS : [];
let sold = JSON.parse(localStorage.getItem("estate-sale-sold-v1") || "{}");

function setupFilters() {
  const select = document.querySelector("#staffCategory");
  for (const cat of [...new Set(inventory.map(x => x.category))].sort()) {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.append(option);
  }
}
function filteredItems() {
  const q = document.querySelector("#staffSearch").value.trim().toLowerCase();
  const category = document.querySelector("#staffCategory").value;
  const status = document.querySelector("#staffStatus").value;
  return inventory.filter(x => {
    const isSold = !!sold[x.id];
    return (!q || `${x.id} ${x.item} ${x.brand || ""} ${x.model || ""}`.toLowerCase().includes(q))
      && (!category || x.category === category)
      && (!status || (status === "sold") === isSold);
  });
}
function renderStaff() {
  const list = document.querySelector("#staffList");
  list.replaceChildren();
  for (const item of filteredItems()) {
    const row = document.createElement("article");
    row.className = `staff-item${sold[item.id] ? " sold" : ""}`;
    row.innerHTML = `${item.photo ? `<img loading="lazy" src="${item.photo}" alt="">` : "<span></span>"}<div><h3>${escapeHtml(item.item)}</h3><div class="staff-meta">${escapeHtml(item.id)} | ${escapeHtml(item.category)}${item.brand ? ` | ${escapeHtml(item.brand)}` : ""}</div></div><div class="staff-price">$${Number(item.price || 0).toLocaleString()}</div><button class="sold-toggle" type="button">${sold[item.id] ? "Sold" : "Mark sold"}</button>`;
    row.querySelector("button").addEventListener("click", () => {
      if (sold[item.id]) delete sold[item.id]; else sold[item.id] = {soldAt:new Date().toISOString(), price:item.price};
      localStorage.setItem("estate-sale-sold-v1", JSON.stringify(sold));
      renderStaff();
    });
    list.append(row);
  }
  const soldItems = inventory.filter(x => sold[x.id]);
  const soldTotal = soldItems.reduce((sum,x) => sum + Number(x.price || 0), 0);
  document.querySelector("#stats").innerHTML = `<div class="stat"><strong>${inventory.length}</strong><span>Total records</span></div><div class="stat"><strong>${inventory.length-soldItems.length}</strong><span>Available</span></div><div class="stat"><strong>${soldItems.length}</strong><span>Sold</span></div><div class="stat"><strong>$${soldTotal.toLocaleString()}</strong><span>Tagged value sold</span></div>`;
}
function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
["#staffSearch","#staffCategory","#staffStatus"].forEach(id => document.querySelector(id).addEventListener("input", renderStaff));
document.querySelector("#exportStatus").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),sold},null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `estate-sale-sold-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
document.querySelector("#importStatus").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    sold = data.sold || {};
    localStorage.setItem("estate-sale-sold-v1", JSON.stringify(sold));
    renderStaff();
  } catch {
    alert("That status file could not be read.");
  }
});
setupFilters();
renderStaff();
