// --- นำ URL และ Anon Key จาก Supabase มาใส่ตรงนี้ ---
const SUPABASE_URL = 'https://tyvbsgonfticxuaggzgb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_h7xzTQetePBWjlSGwtxzcg_T-rgrlIv';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ข้อมูลจำลองสินค้า
const products = [
    { id: 1, name: 'Espresso', price: 50, type: 'coffee' },
    { id: 2, name: 'Americano', price: 55, type: 'coffee' },
    { id: 3, name: 'Latte', price: 65, type: 'coffee' },
    { id: 4, name: 'Mocha', price: 70, type: 'coffee' },
    { id: 5, name: 'Croissant', price: 60, type: 'bakery' },
    { id: 6, name: 'Brownie', price: 45, type: 'bakery' },
    { id: 7, name: 'Cheesecake', price: 85, type: 'bakery' }
];

let cart = [];
let currentUser = null;
let currentPoints = 0;

// โหลดข้อมูลเมื่อเปิดเว็บ
window.onload = async () => {
    checkTheme();
    renderProducts();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showDashboard();
    }
};

// --- ระบบ Auth (Login/Register) ---
async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('auth-msg');
    
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) msg.innerText = "Error: " + error.message;
    else msg.innerText = "สมัครสำเร็จ! กรุณายืนยันอีเมล หรือล็อคอินได้เลย (ถ้าปิด Confirm email ไว้)";
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('auth-msg');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        msg.innerText = "Error: " + error.message;
    } else {
        currentUser = data.user;
        showDashboard();
    }
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('login-section').classList.add('active');
    cart = [];
    updateCart();
}

async function showDashboard() {
    document.getElementById('login-section').classList.remove('active');
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('active');
    
    // ดึงแต้มสะสม
    await fetchPoints();
}

async function fetchPoints() {
    const { data, error } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', currentUser.id)
        .single();
    
    if (data) {
        currentPoints = data.points;
    } else if (error && error.code === 'PGRST116') {
        // ถ้าไม่มีข้อมูล ให้สร้างใหม่
        await supabase.from('profiles').insert([{ id: currentUser.id, points: 0 }]);
        currentPoints = 0;
    }
    document.getElementById('user-points').innerText = `แต้มสะสม: ${currentPoints}`;
}

// --- ระบบ POS และ ตะกร้า ---
function renderProducts() {
    const coffeeList = document.getElementById('coffee-list');
    const bakeryList = document.getElementById('bakery-list');

    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `<h4>${p.name}</h4><p>${p.price} ฿</p>`;
        div.onclick = () => addToCart(p);
        
        if (p.type === 'coffee') coffeeList.appendChild(div);
        else bakeryList.appendChild(div);
    });
}

function addToCart(product) {
    cart.push(product);
    updateCart();
}

function updateCart() {
    const ul = document.getElementById('cart-items');
    ul.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price;
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.name}</span> <span>${item.price} ฿ <button style="padding:2px 5px; margin-left:10px" onclick="removeFromCart(${index})">X</button></span>`;
        ul.appendChild(li);
    });

    document.getElementById('total-price').innerText = total;
    // คำนวณแต้ม: ทุกๆ 50 บาท ได้ 1 แต้ม
    const earn = Math.floor(total / 50);
    document.getElementById('earn-points').innerText = earn;
    
    document.getElementById('checkout-btn').disabled = cart.length === 0;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

async function checkout() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const earnedPoints = Math.floor(total / 50);

    const newTotalPoints = currentPoints + earnedPoints;

    // อัปเดตแต้มใน Supabase
    const { error } = await supabase
        .from('profiles')
        .update({ points: newTotalPoints })
        .eq('id', currentUser.id);

    if (!error) {
        alert(`ชำระเงินสำเร็จ! ยอดรวม ${total} บาท\nคุณได้รับ ${earnedPoints} แต้ม`);
        cart = [];
        updateCart();
        fetchPoints(); // โหลดแต้มใหม่
    } else {
        alert('เกิดข้อผิดพลาดในการบันทึกแต้ม');
    }
}

// --- ระบบ Dark/Light Mode ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function checkTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.body.classList.add('dark-mode');
}
