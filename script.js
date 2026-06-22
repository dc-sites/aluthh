import { db } from './firebase-config.js';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const moviesGrid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const totalMoviesEl = document.getElementById('totalMovies');
const modal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const shareModal = document.getElementById('shareModal');
const shareModalClose = document.getElementById('shareModalClose');
const shareOptions = document.getElementById('shareOptions');
const toast = document.getElementById('toast');

let allMovies = [];

// ===== SECRET ADMIN ACCESS (Click logo 5 times) =====
let logoClickCount = 0;
let logoClickTimer = null;

document.getElementById('logoClick').addEventListener('click', (e) => {
  e.preventDefault();
  logoClickCount++;
  
  clearTimeout(logoClickTimer);
  logoClickTimer = setTimeout(() => {
    logoClickCount = 0;
  }, 2000);
  
  if (logoClickCount >= 5) {
    window.location.href = 'admin.html';
  }
});

// ===== SHOW TOAST =====
function showToast(message, type = 'success') {
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== GET CLICK COUNT =====
function getClickCount(postId) {
  return parseInt(localStorage.getItem(`clicks_${postId}`) || '0');
}

function setClickCount(postId, count) {
  localStorage.setItem(`clicks_${postId}`, count.toString());
}

// ===== FORMAT DATE =====
function formatDate(timestamp) {
  if (!timestamp) return 'Recently';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== GET SHARE URL =====
function getShareUrl(postId) {
  const baseUrl = window.location.origin + window.location.pathname;
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

// ===== RENDER MOVIES =====
function renderMovies(movies) {
  if (movies.length === 0) {
    moviesGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fa-solid fa-film"></i>
        <h3>No movies yet</h3>
        <p>Check back soon for new releases!</p>
      </div>`;
    return;
  }

  moviesGrid.innerHTML = movies.map(movie => {
    const clicks = getClickCount(movie.id);
    const btnClass = clicks === 1 ? 'watch-btn clicked' : 'watch-btn';
    const btnText = clicks === 1 
      ? '<i class="fa-solid fa-play"></i> Watch Now' 
      : '<i class="fa-solid fa-play"></i> Watch Now';
    const btnHint = clicks === 1 ? ' (Click again to watch)' : '';

    const thumbHtml = movie.thumbnail 
      ? `<img src="${movie.thumbnail}" alt="${movie.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><i class="fa-solid fa-film placeholder-icon" style="display:none"></i>`
      : `<i class="fa-solid fa-film placeholder-icon"></i>`;

    return `
      <div class="movie-card" data-id="${movie.id}">
        <div class="movie-thumb">
          ${thumbHtml}
          <span class="movie-badge"><i class="fa-solid fa-star"></i> HD</span>
        </div>
        <div class="movie-info">
          <div class="movie-title">
            <i class="fa-solid fa-clapperboard"></i> ${movie.title}
          </div>
          <div class="movie-desc">${movie.description}</div>
          <div class="movie-meta">
            <span><i class="fa-regular fa-calendar"></i> ${formatDate(movie.createdAt)}</span>
            <span><i class="fa-solid fa-eye"></i> ${movie.views || 0}</span>
          </div>
          <button class="${btnClass}" data-id="${movie.id}">
            ${btnText}${btnHint}
          </button>
          <button class="share-btn" data-id="${movie.id}">
            <i class="fa-solid fa-share-nodes"></i> Share
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach click handlers
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleWatchClick(btn.dataset.id);
    });
  });

  document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const movie = allMovies.find(m => m.id === btn.dataset.id);
      if (movie) shareMovie(movie);
    });
  });

  document.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });
}

// ===== HANDLE WATCH CLICK (2-CLICK SYSTEM) =====
function handleWatchClick(postId) {
  const movie = allMovies.find(m => m.id === postId);
  if (!movie) return;

  let clicks = getClickCount(postId);
  clicks++;

  if (clicks === 1) {
    // FIRST CLICK → Open Ad Link
    setClickCount(postId, 1);
    showToast('<i class="fa-solid fa-bullhorn"></i> Please wait... opening sponsor', 'success');
    window.open(movie.adLink, '_blank');
    
    // Update button appearance
    setTimeout(() => {
      const btn = document.querySelector(`.watch-btn[data-id="${postId}"]`);
      if (btn) {
        btn.classList.add('clicked');
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Watch Now <small>(Click again)</small>';
      }
    }, 500);

    // Increment views in Firebase
    try {
      updateDoc(doc(db, 'posts', postId), { views: increment(1) });
    } catch (e) { console.log(e); }

  } else if (clicks >= 2) {
    // SECOND CLICK → Open Actual File Link
    setClickCount(postId, 0); // Reset
    window.open(movie.fileLink, '_blank');
    showToast('<i class="fa-solid fa-check"></i> Enjoy the movie!', 'success');
  }
}

// ===== OPEN MODAL =====
function openModal(postId) {
  const movie = allMovies.find(m => m.id === postId);
  if (!movie) return;

  const clicks = getClickCount(postId);
  const statusHtml = clicks === 1 
    ? '<span style="color:#228b22"><i class="fa-solid fa-check-circle"></i> Ready to watch - Click Watch Now</span>'
    : '<span style="color:var(--accent)"><i class="fa-solid fa-info-circle"></i> Click Watch Now to begin</span>';

  modalBody.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <i class="fa-solid fa-clapperboard" style="font-size:50px; color:var(--accent);"></i>
    </div>
    <h2 style="text-align:center; margin-bottom:15px;">${movie.title}</h2>
    <p style="color:var(--text-secondary); line-height:1.7; margin-bottom:20px;">${movie.description}</p>
    <div style="background:var(--bg-darker); padding:15px; border-radius:10px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span><i class="fa-regular fa-calendar"></i> Added:</span>
        <strong>${formatDate(movie.createdAt)}</strong>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span><i class="fa-solid fa-eye"></i> Views:</span>
        <strong>${movie.views || 0}</strong>
      </div>
    </div>
    <div style="text-align:center; margin-bottom:15px;">${statusHtml}</div>
    <button class="watch-btn ${clicks===1?'clicked':''}" onclick="window.handleWatchClickGlobal('${movie.id}')" style="width:100%; margin-bottom:10px;">
      <i class="fa-solid fa-play"></i> Watch Now
    </button>
    <button class="share-btn" onclick="window.shareMovieGlobal('${movie.id}')" style="width:100%;">
      <i class="fa-solid fa-share-nodes"></i> Share Movie
    </button>
  `;
  modal.classList.add('active');
}

window.handleWatchClickGlobal = handleWatchClick;
window.shareMovieGlobal = (postId) => {
  const movie = allMovies.find(m => m.id === postId);
  if (movie) shareMovie(movie);
};

modalClose.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('active');
});

// ===== SEARCH =====
searchInput.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allMovies.filter(m =>
    m.title.toLowerCase().includes(term) ||
    m.description.toLowerCase().includes(term)
  );
  renderMovies(filtered);
});

// ===== LOAD MOVIES FROM FIREBASE =====
const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

onSnapshot(q, (snapshot) => {
  allMovies = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  totalMoviesEl.textContent = allMovies.length;
  renderMovies(allMovies);
}, (error) => {
  console.error('Firebase error:', error);
  moviesGrid.innerHTML = `
    <div class="empty-state" style="grid-column:1/-1;">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <h3>Connection Error</h3>
      <p>Please check your Firebase configuration.</p>
    </div>`;
});