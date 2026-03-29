// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
const GITHUB_API      = 'https://api.github.com';
const KEY_TOKEN       = 'admin_gh_token';
const KEY_OWNER       = 'admin_gh_owner';
const KEY_REPO        = 'admin_gh_repo';

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
let currentProducts       = [];   // full product array
let currentProductsSha    = '';   // SHA of products.json in GitHub (needed to update it)
let editingIndex          = -1;   // -1 = adding new, ≥0 = editing existing
let pendingExistingImages = [];   // filenames already in the repo, kept from current product
let pendingNewImages      = [];   // { file, previewUrl, filename } – new uploads
let knownCategories       = [];   // list of categories derived from products
let deleteTargetIndex     = -1;   // index of product awaiting delete confirmation
let toastTimer            = null;

// ─────────────────────────────────────────────────────────────────────────────
// Credential helpers (localStorage)
// ─────────────────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem(KEY_TOKEN) || '';
const getOwner = () => localStorage.getItem(KEY_OWNER) || '';
const getRepo  = () => localStorage.getItem(KEY_REPO)  || '';

function saveCredentials(token, owner, repo) {
    localStorage.setItem(KEY_TOKEN, token);
    localStorage.setItem(KEY_OWNER, owner);
    localStorage.setItem(KEY_REPO,  repo);
}

function clearCredentials() {
    [KEY_TOKEN, KEY_OWNER, KEY_REPO].forEach(k => localStorage.removeItem(k));
}

// ─────────────────────────────────────────────────────────────────────────────
// GitHub REST API helpers
// Fine-grained PATs (github_pat_*) must use "Bearer"; classic PATs (ghp_) use "token".
// See: https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api
// ─────────────────────────────────────────────────────────────────────────────
function authorizationHeader() {
    const t = getToken();
    if (!t) return '';
    return t.startsWith('github_pat_') ? `Bearer ${t}` : `token ${t}`;
}

async function githubGet(path) {
    const res = await fetch(`${GITHUB_API}${path}`, {
        headers: {
            Authorization: authorizationHeader(),
            Accept: 'application/vnd.github.v3+json',
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `שגיאת GitHub API: ${res.status}`);
    }
    return res.json();
}

async function githubPut(path, body) {
    const res = await fetch(`${GITHUB_API}${path}`, {
        method: 'PUT',
        headers: {
            Authorization: authorizationHeader(),
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `שגיאת GitHub API: ${res.status}`);
    }
    return res.json();
}

async function githubDelete(path, body) {
    const res = await fetch(`${GITHUB_API}${path}`, {
        method: 'DELETE',
        headers: {
            Authorization: authorizationHeader(),
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `שגיאת GitHub API: ${res.status}`);
    }
    return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Base64 helpers (support Hebrew / non-ASCII)
// ─────────────────────────────────────────────────────────────────────────────
function encodeToBase64(str) {
    // btoa handles ASCII only; encodeURIComponent + unescape maps UTF-8 to Latin-1
    return btoa(unescape(encodeURIComponent(str)));
}

function decodeFromBase64(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Strip the "data:image/...;base64," prefix
            resolve(reader.result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Products: load & save
// ─────────────────────────────────────────────────────────────────────────────
async function loadProducts() {
    const owner = getOwner();
    const repo  = getRepo();
    const data  = await githubGet(`/repos/${owner}/${repo}/contents/products.json`);
    currentProductsSha = data.sha;
    currentProducts    = JSON.parse(decodeFromBase64(data.content));
    rebuildCategories();
}

async function saveProducts() {
    const owner   = getOwner();
    const repo    = getRepo();
    const content = encodeToBase64(JSON.stringify(currentProducts, null, 4));
    await githubPut(`/repos/${owner}/${repo}/contents/products.json`, {
        message: 'עדכון קטלוג מוצרים',
        content,
        sha: currentProductsSha,
    });
    // Reload to refresh SHA for future saves
    await loadProducts();
}

// ─────────────────────────────────────────────────────────────────────────────
// Images: upload to repo root
// ─────────────────────────────────────────────────────────────────────────────
async function uploadImage(filename, file) {
    const owner   = getOwner();
    const repo    = getRepo();
    const content = await fileToBase64(file);
    const apiPath = `/repos/${owner}/${repo}/contents/${encodeURIComponent(filename)}`;

    // If file already exists in repo we need its SHA to overwrite it
    let sha;
    try {
        const existing = await githubGet(apiPath);
        sha = existing.sha;
    } catch (_) { /* new file – no SHA needed */ }

    const body = { message: `הוספת תמונה: ${filename}`, content };
    if (sha) body.sha = sha;

    await githubPut(apiPath, body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────
function rebuildCategories() {
    const set = new Set();
    currentProducts.forEach(p => { if (p.category) set.add(p.category); });
    knownCategories = Array.from(set);
}

function populateCategorySelect(selectedValue) {
    const sel = document.getElementById('fCategory');
    sel.innerHTML = '';
    if (knownCategories.length === 0) {
        sel.innerHTML = '<option value="">אין קטגוריות – הוסף קטגוריה חדשה</option>';
    }
    knownCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        sel.appendChild(opt);
    });
    if (selectedValue) sel.value = selectedValue;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI: Loading & Toast
// ─────────────────────────────────────────────────────────────────────────────
function setLoading(on) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !on);
}

function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast toast-${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 4000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Screens
// ─────────────────────────────────────────────────────────────────────────────
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('hidden');
}

function showMainScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    document.getElementById('repoLabel').textContent = `${getOwner()} / ${getRepo()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.getElementById('tokenInput').value.trim();
    const owner = document.getElementById('ownerInput').value.trim();
    const repo  = document.getElementById('repoInput').value.trim();
    const errEl = document.getElementById('loginError');
    errEl.classList.add('hidden');

    if (!token || !owner || !repo) {
        errEl.textContent = 'נא למלא את כל השדות.';
        errEl.classList.remove('hidden');
        return;
    }

    saveCredentials(token, owner, repo);
    setLoading(true);
    try {
        await loadProducts();
        showMainScreen();
        renderProductGrid();
    } catch (err) {
        clearCredentials();
        errEl.textContent = `שגיאה בהתחברות: ${err.message}. בדוק שהטוקן, שם המשתמש ושם המאגר נכונים ושיש הרשאת "repo" לטוקן.`;
        errEl.classList.remove('hidden');
    } finally {
        setLoading(false);
    }
});

function logout() {
    if (!confirm('האם להתנתק?')) return;
    clearCredentials();
    currentProducts = [];
    currentProductsSha = '';
    showLoginScreen();
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Grid
// ─────────────────────────────────────────────────────────────────────────────
function renderProductGrid() {
    const grid  = document.getElementById('productGrid');
    const count = document.getElementById('productCount');
    count.textContent = `סה"כ ${currentProducts.length} מוצרים`;

    if (currentProducts.length === 0) {
        grid.innerHTML = '<p class="empty-state">אין מוצרים עדיין. לחץ "הוסף מוצר חדש" כדי להתחיל.</p>';
        return;
    }

    // Placeholder SVG shown when image fails to load
    const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23f1f5f9'/%3E%3Ctext x='40' y='46' text-anchor='middle' fill='%2394a3b8' font-size='10' font-family='Arial'%3Eאין תמונה%3C/text%3E%3C/svg%3E`;

    grid.innerHTML = currentProducts.map((p, i) => {
        const thumb    = p.src && p.src[0] ? escHtml(p.src[0]) : '';
        const desc     = p.fullDescription || '';
        const imgCount = p.src ? p.src.length : 0;
        return `
        <div class="product-card">
            <div class="product-thumb">
                <img src="${thumb}" alt="${escHtml(p.name)}"
                     onerror="this.src='${placeholderSvg}'" />
            </div>
            <div class="product-info">
                <strong>${escHtml(p.name)}</strong>
                <span class="category-badge">${escHtml(p.category || '')}</span>
                <p class="product-desc-preview">${escHtml(desc.substring(0, 90))}${desc.length > 90 ? '…' : ''}</p>
                <div class="card-imgs-count">${imgCount} תמונ${imgCount === 1 ? 'ה' : 'ות'}</div>
            </div>
            <div class="product-actions">
                <button class="btn-edit" onclick="openEditModal(${i})">✏️ ערוך</button>
                <button class="btn-del"  onclick="openDeleteConfirm(${i})">🗑️ מחק</button>
            </div>
        </div>
    `;
    }).join('');
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal – open / close
// ─────────────────────────────────────────────────────────────────────────────
function openAddModal() {
    editingIndex = -1;
    pendingExistingImages = [];
    pendingNewImages = [];

    document.getElementById('modalTitle').textContent = 'הוסף מוצר חדש';
    document.getElementById('submitBtn').textContent   = 'הוסף מוצר';
    document.getElementById('fName').value  = '';
    document.getElementById('fDesc').value  = '';
    document.getElementById('newCatRow').classList.add('hidden');
    document.getElementById('fNewCat').value = '';
    document.getElementById('imgInput').value = '';

    populateCategorySelect();
    renderExistingImages();
    renderNewImages();
    document.getElementById('productModal').classList.remove('hidden');
    document.getElementById('fName').focus();
}

function openEditModal(index) {
    editingIndex = index;
    const p = currentProducts[index];
    pendingExistingImages = [...p.src];
    pendingNewImages = [];

    document.getElementById('modalTitle').textContent = 'ערוך מוצר';
    document.getElementById('submitBtn').textContent   = 'שמור שינויים';
    document.getElementById('fName').value  = p.name;
    document.getElementById('fDesc').value  = p.fullDescription;
    document.getElementById('newCatRow').classList.add('hidden');
    document.getElementById('fNewCat').value = '';
    document.getElementById('imgInput').value = '';

    populateCategorySelect(p.category);
    renderExistingImages();
    renderNewImages();
    document.getElementById('productModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('productModal').classList.add('hidden');
    // Release object URLs to free memory
    pendingNewImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    pendingNewImages = [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal – images
// ─────────────────────────────────────────────────────────────────────────────
function renderExistingImages() {
    const container = document.getElementById('existingImgList');
    if (pendingExistingImages.length === 0) {
        container.innerHTML = '<p class="no-imgs-note">אין תמונות קיימות למוצר זה</p>';
        return;
    }
    container.innerHTML = pendingExistingImages.map((src, i) => `
        <div class="img-chip">
            <img src="${escHtml(src)}" alt="${escHtml(src)}"
                 onerror="this.style.background='#e2e8f0'" />
            <span class="img-chip-name" title="${escHtml(src)}">${escHtml(src)}</span>
            <button type="button" class="img-chip-remove"
                    onclick="removeExistingImage(${i})" title="הסר תמונה">×</button>
        </div>
    `).join('');
}

function renderNewImages() {
    const title     = document.getElementById('newImgTitle');
    const container = document.getElementById('newImgList');
    if (pendingNewImages.length === 0) {
        title.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    title.classList.remove('hidden');
    container.innerHTML = pendingNewImages.map((img, i) => `
        <div class="img-chip">
            <img src="${img.previewUrl}" alt="${escHtml(img.filename)}" />
            <span class="img-chip-name" title="${escHtml(img.filename)}">${escHtml(img.filename)}</span>
            <button type="button" class="img-chip-remove"
                    onclick="removeNewImage(${i})" title="הסר">×</button>
        </div>
    `).join('');
}

function handleImgSelect(event) {
    Array.from(event.target.files).forEach(file => {
        pendingNewImages.push({
            file,
            previewUrl: URL.createObjectURL(file),
            filename:   file.name,
        });
    });
    renderNewImages();
    event.target.value = ''; // Allow re-selecting the same file
}

function removeExistingImage(i) {
    pendingExistingImages.splice(i, 1);
    renderExistingImages();
}

function removeNewImage(i) {
    URL.revokeObjectURL(pendingNewImages[i].previewUrl);
    pendingNewImages.splice(i, 1);
    renderNewImages();
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal – new category
// ─────────────────────────────────────────────────────────────────────────────
function toggleNewCat() {
    const row = document.getElementById('newCatRow');
    const isHidden = row.classList.toggle('hidden');
    if (!isHidden) document.getElementById('fNewCat').focus();
}

function confirmNewCat() {
    const val = document.getElementById('fNewCat').value.trim();
    if (!val) return;
    if (!knownCategories.includes(val)) {
        knownCategories.push(val);
        populateCategorySelect(val);
    } else {
        document.getElementById('fCategory').value = val;
    }
    document.getElementById('fNewCat').value = '';
    document.getElementById('newCatRow').classList.add('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal – form submit (save product)
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('fName').value.trim();
    const desc     = document.getElementById('fDesc').value.trim();
    const category = document.getElementById('fCategory').value;

    if (!name || !desc || !category) {
        showToast('נא למלא את כל השדות המסומנים ב-*', 'error');
        return;
    }
    if (pendingExistingImages.length === 0 && pendingNewImages.length === 0) {
        showToast('נא לצרף לפחות תמונה אחת למוצר', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    setLoading(true);
    try {
        // 1. Upload all new images first
        for (const img of pendingNewImages) {
            await uploadImage(img.filename, img.file);
        }

        // 2. Build final image list
        const allImages = [
            ...pendingExistingImages,
            ...pendingNewImages.map(img => img.filename),
        ];

        // 3. Update products array
        const product = { src: allImages, name, fullDescription: desc, category };
        if (editingIndex === -1) {
            currentProducts.push(product);
        } else {
            currentProducts[editingIndex] = product;
        }

        // 4. Save products.json to GitHub
        await saveProducts();

        closeModal();
        renderProductGrid();
        showToast(editingIndex === -1 ? '✅ המוצר נוסף בהצלחה!' : '✅ המוצר עודכן בהצלחה!');
    } catch (err) {
        showToast(`שגיאה בשמירה: ${err.message}`, 'error');
        // Revert local change if save failed
        await loadProducts().catch(() => {});
    } finally {
        submitBtn.disabled = false;
        setLoading(false);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────
function openDeleteConfirm(index) {
    deleteTargetIndex = index;
    document.getElementById('deleteProductName').textContent = currentProducts[index].name;
    document.getElementById('deleteImagesCheckbox').checked = true;
    document.getElementById('confirmDialog').classList.remove('hidden');
}

function closeConfirm() {
    deleteTargetIndex = -1;
    document.getElementById('confirmDialog').classList.add('hidden');
}

/**
 * Returns filenames that are ONLY used by the product being deleted
 * (not referenced by any other product) — these are safe to remove from the repo.
 */
function getOrphanedImages(deletedProduct) {
    const remainingProducts = currentProducts.filter((_, i) => i !== deleteTargetIndex);
    const usedElsewhere = new Set(
        remainingProducts.flatMap(p => p.src || []).map(f => f.toLowerCase())
    );
    return (deletedProduct.src || []).filter(
        f => !usedElsewhere.has(f.toLowerCase())
    );
}

async function deleteImageFiles(filenames) {
    const owner = getOwner();
    const repo  = getRepo();
    const deleted = [];
    const failed  = [];

    for (const filename of filenames) {
        const apiPath = `/repos/${owner}/${repo}/contents/${encodeURIComponent(filename)}`;
        try {
            const fileData = await githubGet(apiPath);
            await githubDelete(apiPath, {
                message: `מחיקת תמונה: ${filename}`,
                sha: fileData.sha,
            });
            deleted.push(filename);
        } catch (err) {
            failed.push(filename);
            console.warn(`לא ניתן למחוק "${filename}":`, err.message);
        }
    }
    return { deleted, failed };
}

async function confirmDelete() {
    if (deleteTargetIndex === -1) return;
    const idx            = deleteTargetIndex;
    const product        = currentProducts[idx];
    const alsoDelImages  = document.getElementById('deleteImagesCheckbox').checked;
    const orphaned       = alsoDelImages ? getOrphanedImages(product) : [];

    closeConfirm();
    setLoading(true);
    try {
        // 1. Remove from products array and save JSON first
        currentProducts.splice(idx, 1);
        await saveProducts();

        // 2. Delete orphaned image files (only files not used by other products)
        let imageNote = '';
        if (orphaned.length > 0) {
            const { deleted, failed } = await deleteImageFiles(orphaned);
            if (failed.length > 0) {
                imageNote = ` (${failed.length} תמונ${failed.length === 1 ? 'ה' : 'ות'} לא נמחק${failed.length === 1 ? 'ה' : 'ו'} מהמאגר)`;
            } else if (deleted.length > 0) {
                imageNote = ` + ${deleted.length} תמונ${deleted.length === 1 ? 'ה' : 'ות'} נמחק${deleted.length === 1 ? 'ה' : 'ו'}`;
            }
        }

        renderProductGrid();
        showToast(`🗑️ המוצר נמחק בהצלחה${imageNote}`);
    } catch (err) {
        showToast(`שגיאה במחיקה: ${err.message}`, 'error');
        await loadProducts().catch(() => {});
        renderProductGrid();
    } finally {
        setLoading(false);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Init – decide which screen to show on page load
// ─────────────────────────────────────────────────────────────────────────────
async function init() {
    const token = getToken();
    const owner = getOwner();
    const repo  = getRepo();

    if (token && owner && repo) {
        setLoading(true);
        try {
            await loadProducts();
            showMainScreen();
            renderProductGrid();
        } catch (_) {
            // Stored credentials no longer valid – go back to login
            clearCredentials();
            showLoginScreen();
        } finally {
            setLoading(false);
        }
    } else {
        showLoginScreen();
    }
}

init();
