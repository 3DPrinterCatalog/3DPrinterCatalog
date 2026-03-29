let allProducts = [];
let productsJSON = [];
let pageNumber = 0;
let numberOfPages = 0;
let numberOfProducts = 0;

async function loadAndInit() {
    try {
        const res = await fetch('products.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        allProducts = await res.json();
    } catch (e) {
        console.error('שגיאה בטעינת מוצרים:', e);
        allProducts = [];
    }
    productsJSON = [...allProducts];
    numberOfProducts = productsJSON.length;
    numberOfPages = numberOfProducts > 0 ? Math.floor((numberOfProducts - 1) / 9) : 0;
    initDisplay();
}

function initDisplay() {
    for (let i = 0; i < 9; i++) {
        const image = document.querySelector(`#image${i}`);
        const nameEl = document.querySelector(`#name-bellow-image${i}`);
        if (!image) continue;
        if (i < numberOfProducts) {
            image.src = productsJSON[i].src[0];
            nameEl.textContent = productsJSON[i].name;
        } else {
            image.src = 'white.jpg';
            nameEl.textContent = '';
        }
    }
}

function sortProducts(category) {
    if (category === 'הכל') return [...allProducts];
    return allProducts.filter(p => p.category === category);
}

function changePicturesDisplay(products, page) {
    for (let i = 0; i < 9; i++) {
        const image = document.querySelector(`#image${i}`);
        const nameEl = document.querySelector(`#name-bellow-image${i}`);
        if (!image) continue;

        image.style.opacity = 0;
        nameEl.style.opacity = 0;

        const idx = i + page * 9;
        setTimeout(() => {
            if (idx >= products.length) {
                image.src = 'white.jpg';
                nameEl.innerHTML = '';
            } else {
                image.src = products[idx].src[0];
                nameEl.innerHTML = products[idx].name;
            }
        }, 800);

        setTimeout(() => {
            image.style.opacity = 1;
            nameEl.style.opacity = 1;
        }, 850);
    }
}

document.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', function () {
        const category = item.getAttribute('data-category');
        productsJSON = sortProducts(category);
        numberOfProducts = productsJSON.length;
        numberOfPages = numberOfProducts > 0 ? Math.floor((numberOfProducts - 1) / 9) : 0;
        pageNumber = 0;
        changePicturesDisplay(productsJSON, 0);
    });
});

document.getElementById('next').addEventListener('click', () => {
    if (pageNumber < numberOfPages) {
        pageNumber++;
        changePicturesDisplay(productsJSON, pageNumber);
    }
});

document.getElementById('prev').addEventListener('click', () => {
    if (pageNumber > 0) {
        pageNumber--;
        changePicturesDisplay(productsJSON, pageNumber);
    }
});

// One handler: empty slots must not navigate to product.html (would show stale localStorage from old visits)
document.querySelector('.cataloug').addEventListener('click', function (e) {
    const a = e.target.closest('a[href="product.html"]');
    if (!a) return;

    const container = a.closest('[class*="image-container"]');
    if (!container) return;

    const m = container.className.match(/image-container(\d)/);
    if (!m) return;

    const slot = parseInt(m[1], 10);
    const idx = slot + pageNumber * 9;
    const product = productsJSON[idx];

    if (!product) {
        e.preventDefault();
        return;
    }

    localStorage.setItem('clickedImageSrc', JSON.stringify(product.src));
    localStorage.setItem('clickedImageFullDescription', product.fullDescription);
});

document.addEventListener('DOMContentLoaded', loadAndInit);
