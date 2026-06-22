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

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('aluth_ewa_admin');
  location.reload();
});

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

// ===== SHARE URL =====
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
      <i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span>
    </a>
    <a href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}" target="_blank" class="share-option telegram">
      <i class="fa-brands fa-telegram"></i><span>Telegram</span>
    </a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" class="share-option facebook">
      <i class="fa-brands fa-facebook"></i><span>Facebook</span>
    </a>
    <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}" target="_blank" class="share-option twitter">
      <i class="fa-brands fa-twitter"></i><span>Twitter</span>
    </a>
    <a href="mailto:?subject=${encodeURIComponent(movie.title)}&body=${encodeURIComponent(shareText + ' ' + shareUrl)}" class="share-option email">
      <i class="fa-solid fa-envelope"></i><span>Email</span>
    </a>
    <div class="share-option copy" onclick="window.copyShareLink('${shareUrl}')">
      <i class="fa-solid fa-copy"></i><span>Copy Link</span>
    </div>
  `;
  shareModal.classList.add('active');
}

window.copyShareLink = (url) => {
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied!', 'success');
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
  
  const category = document.getElementById('movieCategory').value.trim();
  const title = document.getElementById('movieTitle').value.trim();
  const description = document.getElementById('movieDesc').value.trim();
  const fileLink = document.getElementById('movieFileLink').value.trim();
  const adLink = document.getElementById('movieAdLink').value.trim();
  const thumbnail = document.getElementById('movieThumb').value.trim();

  if (!category || !title || !description || !fileLink || !adLink) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    await addDoc(collection(db, 'posts'), {
      category,
      title,
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

// ===== GROUP MOVIES BY CATEGORY =====
function groupByCategory(movies) {
  const groups = {};
  movies.forEach(movie => {
    const cat = movie.category || 'Uncategorized';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(movie);
  });
  return groups;
}

// ===== LOAD POSTS (Grouped by Category) =====
const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

onSnapshot(q, (snapshot) => {
  const allPosts = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
  
  if (allPosts.length === 0) {
    postsList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <h3>No movies yet</h3>
        <p>Add your first movie above</p>
      </div>`;
    return;
  }

  const groups = groupByCategory(allPosts);
  const categoryNames = Object.keys(groups).sort();

  postsList.innerHTML = categoryNames.map(cat => {
    const movies = groups[cat];
    return `
      <div class="category-group">
        <div class="category-group-header">
          <h4><i class="fa-solid fa-folder"></i> ${cat}</h4>
          <span class="badge">${movies.length} movies</span>
        </div>
        <div class="category-group-body">
          ${movies.map(movie => `
            <div class="post-item">
              <div class="post-info">
                <h5><i class="fa-solid fa-film"></i> ${movie.title}</h5>
                <p>${movie.description}</p>
              </div>
              <div class="post-actions">
                <button class="icon-btn share" onclick="window.sharePostGlobal('${movie.id}', '${movie.title.replace(/'/g, "\\'")}', '${movie.description.replace(/'/g, "\\'")}')" title="Share">
                  <i class="fa-solid fa-share-nodes"></i>
                </button>
                <button class="icon-btn copy" onclick="window.copyLink('${movie.fileLink}')" title="Copy Link">
                  <i class="fa-solid fa-copy"></i>
                </button>
                <button class="icon-btn delete" onclick="window.deletePost('${movie.id}')" title="Delete">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
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
window.sharePostGlobal = (postId, title, description) => {
  shareMovie({ id: postId, title, description });
};
