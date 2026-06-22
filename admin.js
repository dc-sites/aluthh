import { db } from './firebase-config.js';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ===== CONFIG =====
const ADMIN_PASSWORD = 'admin123'; // Change this!

const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addMovieForm = document.getElementById('addMovieForm');
const postsList = document.getElementById('postsList');
const shareModal = document.getElementById('shareModal');
const shareModalClose = document.getElementById('shareModalClose');
const shareOptions = document.getElementById('shareOptions');
const toast = document.getElementById('toast');

let postCount = 0;

// ===== TOAST =====
function showToast(message, type = 'success') {
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== LOGIN =====
loginBtn.addEventListener('click', () => {
  const pwd = document.getElementById('adminPassword').value;
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('aluth_ewa_admin', 'true');
    showAdminPanel();
  } else {
    showToast('Wrong password!', 'error');
  }
});

document.getElementById('adminPassword').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

// ===== LOGOUT =====
logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('aluth_ewa_admin');
  location.reload();
});

// ===== CHECK SESSION =====
function showAdminPanel() {
  loginScreen.style.display = 'none';
  adminPanel.style.display = 'block';
}

if (sessionStorage.getItem('aluth_ewa_admin') === 'true') {
  showAdminPanel();
}

// ===== FORMAT DATE =====
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== GET SHARE URL =====
function getShareUrl(postId) {
  const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
  return `${baseUrl}?movie=${postId}`;
}

// ===== SHARE MOVIE =====
function shareMovie(movie) {
  const shareUrl = getShareUrl(movie.id);
  const shareText = `Check out ${movie.title} on ALUTH EWA! ${movie.description}`;
  
  shareOptions.innerHTML = `
    <a href="https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}" target="_blank" class="share-option whatsapp">
      <i class="fa-brands fa-whatsapp"></i>
      <span>WhatsApp</span>
    </a>
    <a href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}" target="_blank" class="share-option telegram">
      <i class="fa-brands fa-telegram"></i>
      <span>Telegram</span>
    </a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" class="share-option facebook">
      <i class="fa-brands fa-facebook"></i>
      <span>Facebook</span>
    </a>
    <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}" target="_blank" class="share-option twitter">
      <i class="fa-brands fa-twitter"></i>
      <span>Twitter</span>
    </a>
    <a href="mailto:?subject=${encodeURIComponent(movie.title)}&body=${encodeURIComponent(shareText + ' ' + shareUrl)}" class="share-option email">
      <i class="fa-solid fa-envelope"></i>
      <span>Email</span>
    </a>
    <div class="share-option copy" onclick="window.copyShareLink('${shareUrl}')">
      <i class="fa-solid fa-copy"></i>
      <span>Copy Link</span>
    </div>
  `;
  
  shareModal.classList.add('active');
}

window.copyShareLink = (url) => {
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied to clipboard!', 'success');
    shareModal.classList.remove('active');
  });
};

shareModalClose.addEventListener('click', () => shareModal.classList.remove('active'));
shareModal.addEventListener('click', (e) => {
  if (e.target === shareModal) shareModal.classList.remove('active');
});

// ===== ADD MOVIE =====
addMovieForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('movieTitle').value.trim();
  const description = document.getElementById('movieDesc').value.trim();
  const fileLink = document.getElementById('movieFileLink').value.trim();
  const adLink = document.getElementById('movieAdLink').value.trim();
  const thumbnail = document.getElementById('movieThumb').value.trim();

  if (!description || !fileLink || !adLink) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  // Auto-generate title if empty
  const finalTitle = title || `Video ${String(postCount + 1).padStart(2, '0')}`;

  try {
    await addDoc(collection(db, 'posts'), {
      title: finalTitle,
      description,
      fileLink,
      adLink,
      thumbnail: thumbnail || '',
      views: 0,
      createdAt: serverTimestamp()
    });

    showToast('Movie uploaded successfully!', 'success');
    addMovieForm.reset();
  } catch (error) {
    console.error(error);
    showToast('Upload failed: ' + error.message, 'error');
  }
});

// ===== LOAD POSTS =====
const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

onSnapshot(q, (snapshot) => {
  postCount = snapshot.size;
  
  if (snapshot.empty) {
    postsList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <h3>No movies yet</h3>
        <p>Add your first movie above</p>
      </div>`;
    return;
  }

  postsList.innerHTML = snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return `
      <div class="post-item">
        <div class="post-info">
          <h4><i class="fa-solid fa-film"></i> ${data.title}</h4>
          <p>${data.description}</p>
          <p style="margin-top:5px; font-size:11px;">
            <i class="fa-regular fa-calendar"></i> ${formatDate(data.createdAt)} 
            <i class="fa-solid fa-eye" style="margin-left:10px;"></i> ${data.views || 0} views
          </p>
        </div>
        <div class="post-actions">
          <button class="icon-btn share" onclick="window.sharePostGlobal('${docSnap.id}')" title="Share">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
          <button class="icon-btn copy" onclick="window.copyLink('${data.fileLink}')" title="Copy File Link">
            <i class="fa-solid fa-copy"></i>
          </button>
          <button class="icon-btn delete" onclick="window.deletePost('${docSnap.id}')" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
});

// ===== DELETE POST =====
window.deletePost = async (postId) => {
  if (!confirm('Delete this movie?')) return;
  try {
    await deleteDoc(doc(db, 'posts', postId));
    showToast('Movie deleted', 'success');
  } catch (error) {
    showToast('Delete failed', 'error');
  }
};

// ===== COPY LINK =====
window.copyLink = (link) => {
  navigator.clipboard.writeText(link).then(() => {
    showToast('Link copied!', 'success');
  });
};

// ===== SHARE POST =====
window.sharePostGlobal = (postId) => {
  const movie = { id: postId, title: 'Movie', description: '' };
  // Find movie data from the list
  const postItem = document.querySelector(`[onclick*="${postId}"]`);
  if (postItem) {
    const postInfo = postItem.closest('.post-item').querySelector('.post-info');
    movie.title = postInfo.querySelector('h4').textContent.trim();
    movie.description = postInfo.querySelector('p').textContent.trim();
  }
  shareMovie(movie);
};