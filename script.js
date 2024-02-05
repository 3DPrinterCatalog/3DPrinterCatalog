let products = `[
    {
        "src": ["עיבוי למפתח (1).jpg", "עיבוי למפתח.jpg"],
        "name":"עיבוי למפתח",
        "fullDescription": "עיבוי להקלה על אחיזת מפתח וסיבוב המפתח בתוך המנעול. מתאים למקרים כגון שחיקת סחוס, כאבי פרקים, ירידה בכוח אחיזה עדינה",
        "category": "עזרים"
    },
    {
        "src":["לוח מחשבת.jpg"],
        "name":"לוח מחשבת",
        "fullDescription": "משחק מחשבת לתרגול ושיפור מיומנויות מוטוריקה עדינה. לוח המשחק בגודל 10×10 סנטימטר. גודל פין המשחק: קוטר 0.5 סנטימטר גובה 2 סנטימטר",
        "category": "משחקים ואביזרי טיפול"
    },
    {
        "src": ["מחזיק קלפים.jpg"],
        "name":"מחזיק קלפים",
        "fullDescription": "מתקן לקלפים, מאפשר שימוש בקלפים בגודל סטנדרטי ו/או גדולים",
        "category": "משחקים ואביזרי טיפול"
    },
    {
        "src":["משחק- לוח דיסקיות.jpg"],
        "name":"לוח דיסקיות",
        "fullDescription": "משחק לחיזוק חגורת כתפיים ומיומנויות קוגניטיביות. ניתן להדפיס את תושבות הדיסקים ותושבת המגנט",
        "category": "משחקים ואביזרי טיפול"
    },
    {
        "src":["קופסת קלפים.jpg"],
        "name":"קופסת קלפים",
        "fullDescription": "קופסת קלפים. משמשת לקלפים בגודל סטנדרטי ו/או גדולים.",
        "category": "משחקים ואביזרי טיפול"
    },
    {
        "src": ["מתקן אחיזה לכוס.jpg", "מתקן אחיזה לכוס .jpg"],
        "name":"מתקן לכוס",
        "fullDescription": "מתקן לאחיזה גסה של כוס. מקל על אחיזת הכוס במקרה של חולשת אצבעות. מתאים לכוס חד פעמית לשתיה קרה/חמה.",
        "category": "אכילה ושתיה"
    },
    {
        "src": ["מתלה להליכון בצורת S.jpg", "מתלה להליכון בצורת S (1).jpg", "מתלה להליכון בצורת S (2).jpg"],
        "name":"S מתלה להליכון בצורת",
        "fullDescription": "מתלה לשימוש בחלקו הקדמי של ההליכון. מאפשר נשיאת שקיות או תיקים.",
        "category": "עזרים"
    },
    {
        "src":["מתלה להליכון.jpg","מתלה להליכון (1).jpg"],
        "name":"מתלה להליכון",
        "fullDescription": "מתלה צר להליכון. נתלה בעזרת אזיקון. מתאים לכל אחד מעמודי ההליכון",
        "category": "עזרים"
    },
    {
        "src": ["תופסן לקשית.jpg"],
        "name":"תופסן לקשית",
        "fullDescription": "מתקן לתפיסת קשית. מגיע במספר גדלים בהתאם לעובי דופן הכוס",
        "category": "אכילה ושתיה"
    },
    {
        "src": ["קורצני עוגיות.jpeg"],
        "name":"קורצן עוגיות",
        "fullDescription": "קורצן עוגיות לתרגול ושיפור אחיזות",
        "category": "משחקים ואביזרי טיפול"
    },
    {
        "src": ["חותמות.jpeg"],
        "name":"חותמות",
        "fullDescription": "חותמות לתרגול ושיפור אחיזות",
        "category": "משחקים ואביזרי טיפול"
    },
    {
        "src": ["מתקן לכוס לכסא גלגלים.jpeg"],
        "name":"מתקן לכוס לכסא גלגלים",
        "fullDescription": "מתקן המתחבר לכסא הגלגלים ומאפשר נשיאת כוס חד-פעמית. מגיע בשני גדלים",
        "category": "אכילה ושתיה"
    },
    {
        "src":["פותחן לקופסת שימורים 1.jpeg","פותחן לקופסת שימורים 2.jpeg","פותחן לקופסת שימורים 3.jpeg","פותחן לקופסת שימורים 4.jpeg"],
        "name":"פותחן לקופסת שימורים",
        "fullDescription": "פותחן לפתיחת קופסת שימורים בעזרת אחיזה גסה",
        "category": "אכילה ושתיה"
    },
    {
        "src": ["דיסקיות טקטיליות.jpeg"],
        "name":"דיסקיות טקטיליות",
        "fullDescription": "דיסקיות למתן גירוי טקטילי, מגיעות ברמות גירוי והבחנה שונות",
        "category": "משחקים ואביזרי טיפול"
    },
    {
        "src":["מתלה למקל נורדי.jpeg"],
        "name":"מתלה למקל נורדי",
        "fullDescription": "מתלה למקל נורדי, מתאים לתליה על שולחן, על גב הכסא ועוד",
        "category": "עזרים"
    }
  

]`;

let productsJSON = JSON.parse(products);
let pageNumber = 0;
let categories = ["הכל", "משחקים ואביזרי טיפול", "אכילה ושתיה", "עזרים"];
let chosenCategory = "הכל";
let numberOfPages;
let numberOfProducts = productsJSON.length;
//the div images element:
const imageContainers = document.querySelectorAll('.cataloug .image-container');
//ON PAGE LOAD:
document.addEventListener('DOMContentLoaded', onPageLoad);

function onPageLoad() {
    numberOfPages = Math.floor((numberOfProducts-1) / 9);
    chosenCategory = "all"
  
    for(let i = 0 ; i < 9 ; i++){
         let image = document.querySelector(`#image${i}`);
         let nameOfProduct = document.querySelector(`#name-bellow-image${i}`)
         nameOfProduct.textContent =(productsJSON[i].name);
         image.src = productsJSON[i].src[0];
         
    }
  
}

//FUNCTION TO SORT THE ARRAY OF PRODUCTS BY CATEGORY
function sortProducts(productsJSON, chosenCategory) {

    if(chosenCategory === 'הכל'){
     let sortedProducts = JSON.parse(products);
     return sortedProducts;
    }else{
    // First, filter the products by the chosen category
    const chosenCategoryProducts = productsJSON.filter(product => product.category === chosenCategory);
        
    console.log(chosenCategoryProducts);
   
    return chosenCategoryProducts;
    }
}

function changePicturesDisplay(productsJSON, pageNumber) {

    numberOfProducts = productsJSON.length;
    
    for (let i = 0; i < 9 ; i++) {
        let image = document.querySelector(`#image${i}`);
        //let description = document.querySelector(`#p-description${i}`);
        let nameOfProduct = document.querySelector(`#name-bellow-image${i}`);

        if (image) {
            // Apply a fade out effect by reducing opacity to 0
            image.style.opacity = 0;
            nameOfProduct.style.opacity = 0;

            // Change the image source
            setTimeout(() => {
                if (i + (pageNumber) * 9 >= numberOfProducts) {
                    image.src = 'white.jpg';
                    nameOfProduct.innerHTML = '';
                    
                } else {
                    image.src = productsJSON[i + (pageNumber) * 9].src[0];
                    nameOfProduct.innerHTML = productsJSON[i + (pageNumber) * 9].name;
                   
                }
            }, 800); // Adjust this timeout as needed

            // Apply a fade in effect by increasing opacity to 1 after a delay
            setTimeout(() => {
                image.style.opacity = 1;
                nameOfProduct.style.opacity = 1;
                
            }, 850); // Should be greater than the previous timeout
        }

        
    }
}
//ON CLICK FUNCTION ON EACH CATEGORY THAT WAS CLICKED:
const categoryItems = document.querySelectorAll('.category-item');
categoryItems.forEach(item => {
    item.addEventListener('click', function() {
        const category = item.getAttribute('data-category');
        console.log(`You clicked on category: ${category}`);
        let newProductsJson = JSON.parse(products);
        productsJSON = sortProducts(newProductsJson,category);
        pageNumber = 0;
        changePicturesDisplay(productsJSON , 0);
    });
});



//NEXT AND PREVIOUS BUTTON ONCLICK 
const nextButton = document.getElementById('next');
nextButton.addEventListener('click' , ()=>{

if(pageNumber < numberOfPages){
    pageNumber++;
    changePicturesDisplay(productsJSON,pageNumber);
}else{

}

});


const prevButton = document.getElementById('prev');
prevButton.addEventListener('click' , ()=>{

if(pageNumber > 0){
    pageNumber--;
    changePicturesDisplay(productsJSON,pageNumber);
}

});








//////PRODUCT PAGE//////
const images2 = document.querySelectorAll('.cataloug img');

images2.forEach(image => {
    image.addEventListener('click', function() {
        console.log('clicked Image ID:', image.id);
        console.log('clicked image source:', image.src);

        const productIndex = parseInt(image.id.split('image')[1]);
        const fullDescription = productsJSON[productIndex + (9 * pageNumber)].fullDescription;

        // Store the entire array of image sources for the clicked product
        localStorage.setItem('clickedImageSrc', JSON.stringify(productsJSON[productIndex + (9 * pageNumber)].src));
        localStorage.setItem('clickedImageFullDescription', fullDescription);
    });
});

const nameOfProducts = document.querySelectorAll('.nameOfProduct');

nameOfProducts.forEach(productName =>{

    productName.addEventListener('click', function() {

        const clickedProductName = this.textContent;

        const parsedProducts = JSON.parse(products);
        let productSrc;
        let fullDescription;
        for (const product of parsedProducts) {
            if (product.name === clickedProductName) {
                productSrc = JSON.stringify(product.src);
                fullDescription = product.fullDescription;
            }
        }

        console.log('clicked image source:', productSrc);

        localStorage.setItem('clickedImageSrc', productSrc);
        localStorage.setItem('clickedImageFullDescription', fullDescription);
        

       
    });

});


