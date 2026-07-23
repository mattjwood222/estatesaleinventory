const enc = new TextEncoder();
const dec = new TextDecoder();
let inventory = [];
let sold = JSON.parse(localStorage.getItem("estate-sale-sold-v1") || "{}");

const bytes = base64 => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
async function derive(passphrase, salt) {
  const material = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2", salt, iterations:120000, hash:"SHA-256"}, material, 512));
  return {aes:bits.slice(0,32), mac:bits.slice(32)};
}
async function unlock(passphrase) {
  const payload = await fetch("data/internal.enc").then(r => {
    if (!r.ok) throw new Error("Internal inventory is unavailable.");
    return r.json();
  });
  const salt = bytes(payload.salt), iv = bytes(payload.iv), cipher = bytes(payload.data), expected = bytes(payload.mac);
  const keys = await derive(passphrase, salt);
  const macKey = await crypto.subtle.importKey("raw", keys.mac, {name:"HMAC", hash:"SHA-256"}, false, ["verify"]);
  const signed = new Uint8Array(salt.length + iv.length + cipher.length);
  signed.set(salt); signed.set(iv, salt.length); signed.set(cipher, salt.length + iv.length);
  if (!await crypto.subtle.verify("HMAC", macKey, expected, signed)) throw new Error("Incorrect passphrase.");
  const aesKey = await crypto.subtle.importKey("raw", keys.aes, "AES-CBC", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({name:"AES-CBC", iv}, aesKey, cipher);
  return JSON.parse(dec.decode(plain));
}

document.querySelector("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const error = document.querySelector("#loginError");
  error.textContent = "Opening…";
  try {
    inventory = await unlock(document.querySelector("#passphrase").value);
    document.querySelector("#loginPanel").hidden = true;
    document.querySelector("#staffApp").hidden = false;
    setupFilters();
    renderStaff();
  } catch (e) { error.textContent = e.message || "Unable to open inventory."; }
});
document.querySelector("#lockButton").addEventListener("click", () => location.reload());

function setupFilters() {
  const select = document.querySelector("#staffCategory");
  for (const cat of [...new Set(inventory.map(x => x.category))].sort()) {
    const option = document.createElement("option"); option.value = cat; option.textContent = cat; select.append(option);
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
    row.innerHTML = `${item.photo ? `<img loading="lazy" src="${item.photo}" alt="">` : "<span></span>"}<div><h3>${escapeHtml(item.item)}</h3><div class="staff-meta">${escapeHtml(item.id)} · ${escapeHtml(item.category)}${item.brand ? ` · ${escapeHtml(item.brand)}` : ""}</div></div><div class="staff-price">$${Number(item.price || 0).toLocaleString()}</div><button class="sold-toggle" type="button">${sold[item.id] ? "Sold" : "Mark sold"}</button>`;
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
function escapeHtml(value) { return String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
["#staffSearch","#staffCategory","#staffStatus"].forEach(id => document.querySelector(id).addEventListener("input", renderStaff));
document.querySelector("#exportStatus").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),sold},null,2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `estate-sale-sold-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
});
document.querySelector("#importStatus").addEventListener("change", async event => {
  const file = event.target.files[0]; if (!file) return;
  try { const data = JSON.parse(await file.text()); sold = data.sold || {}; localStorage.setItem("estate-sale-sold-v1", JSON.stringify(sold)); renderStaff(); }
  catch { alert("That status file could not be read."); }
});
