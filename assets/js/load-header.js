/**
 * load-header.js – Tải header.html vào mọi trang
 * Chỉ cần nhúng script này + smart-search.js vào <head> của từng trang.
 * Không cần copy-paste HTML header vào từng trang nữa.
 */
(function () {
  'use strict';

  // Tạo placeholder ngay khi script chạy (trước DOMContentLoaded)
  var placeholder = document.createElement('div');
  placeholder.id = 'site-header';

  function insertPlaceholder() {
    if (document.body) {
      document.body.insertBefore(placeholder, document.body.firstChild);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.insertBefore(placeholder, document.body.firstChild);
      });
    }
  }
  insertPlaceholder();

  function loadHeader() {
    fetch('header.html')
      .then(function (res) {
        if (!res.ok) throw new Error('Không tải được header.html – HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        placeholder.innerHTML = '';
        var nodes = doc.body.childNodes;
        while (nodes.length) {
          placeholder.appendChild(nodes[0]);
        }

        // Chạy lại script inline trong header (innerHTML không tự execute script)
        placeholder.querySelectorAll('script').forEach(function (oldScript) {
          var newScript = document.createElement('script');
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          document.head.appendChild(newScript);
          oldScript.parentNode.removeChild(oldScript);
        });

        afterHeaderLoaded();
      })
      .catch(function (err) {
        console.error('[load-header]', err);
      });
  }

  function afterHeaderLoaded() {
    initHeaderJS();
    initSmartSearch();
    initLucide();
    initScrollTop();
    /* markActiveNav chạy sau 50ms để không xung đột với setActiveNav trong header.html */
    setTimeout(markActiveNav, 50);
  }

  /* ─── Drawer, Sticky, Mobile logic ─── */
  function initHeaderJS() {
    var drawer   = document.getElementById('mobileDrawer');
    var overlay  = document.getElementById('mobileOverlay');
    var closeBtn = document.getElementById('drawerCloseBtn');

    document.body.style.overflow = '';

    function openDrawer() {
      if (!drawer) return;
      drawer.classList.add('open');
      if (overlay) overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.classList.add('visible');
      placeholder.querySelectorAll('.hamburger').forEach(function (b) { b.classList.add('open'); });
      setTimeout(function () {
        var inp = document.getElementById('drawerSearchInput');
        if (inp) inp.focus();
      }, 350);
    }

    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
      if (closeBtn) closeBtn.classList.remove('visible');
      placeholder.querySelectorAll('.hamburger').forEach(function (b) { b.classList.remove('open'); });
    }

    placeholder.querySelectorAll('.hamburger').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDrawer();
      });
    });

    if (overlay) overlay.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });

    // Accordion drawer – chỉ chevron toggle, link chính vẫn điều hướng
    if (drawer) {
      drawer.querySelectorAll('.drawer-nav > ul > li > a').forEach(function (link) {
        var chevron = link.querySelector('.drawer-chevron');
        if (!chevron) return;
        chevron.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var li = link.closest('li');
          var isOpen = li.classList.contains('open');
          drawer.querySelectorAll('.drawer-nav > ul > li.open').forEach(function (openLi) {
            openLi.classList.remove('open');
          });
          if (!isOpen) li.classList.add('open');
        });
      });

      // Swipe trái để đóng drawer
      var startX = 0, startY = 0;
      drawer.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });
      drawer.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - startX;
        var dy = Math.abs(e.changedTouches[0].clientY - startY);
        if (dx < -60 && dy < 60) closeDrawer();
      }, { passive: true });
    }

    // Mobile sticky header
    var stickyMobile = document.getElementById('mobileStickyHeader');
    var mainHeader   = placeholder.querySelector('.header');
    if (stickyMobile && mainHeader) {
      window.addEventListener('scroll', function () {
        if (window.innerWidth > 1023) {
          stickyMobile.classList.remove('mobile-sticky-visible');
          return;
        }
        if (mainHeader.getBoundingClientRect().bottom < 0) {
          stickyMobile.classList.add('mobile-sticky-visible');
        } else {
          stickyMobile.classList.remove('mobile-sticky-visible');
        }
      }, { passive: true });
    }

    // Desktop sticky wrap
    var stickyWrap = document.getElementById('stickyWrap');
    if (stickyWrap) {
      window.addEventListener('scroll', function () {
        if (window.innerWidth <= 1023) {
          stickyWrap.classList.remove('visible');
          return;
        }
        stickyWrap.classList.toggle('visible', window.scrollY > 120);
      }, { passive: true });
    }

    // Enter/click tìm kiếm trong drawer
    var drawerInput = document.getElementById('drawerSearchInput');
    var drawerBtn   = document.getElementById('drawerSearchBtn');
    if (drawerInput) {
      drawerInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var q = drawerInput.value.trim();
          if (q) window.location.href = '/search/?q=' + encodeURIComponent(q);
        }
      });
    }
    if (drawerBtn) {
      drawerBtn.addEventListener('click', function () {
        var q = drawerInput ? drawerInput.value.trim() : '';
        if (q) window.location.href = '/search/?q=' + encodeURIComponent(q);
      });
    }
  }

  /* ─── Đánh dấu nav active theo URL ─── */
  function markActiveNav() {
    var path = window.location.pathname;
    /* Chuẩn hoá: /index.html → / */
    var normPath = path.replace(/\/index\.html$/, '/') || '/';

    function isHome() {
      return normPath === '/' || normPath === '';
    }

    function activeCheck(href) {
      if (!href) return false;
      if (href === '/') return isHome();
      return normPath.startsWith(href);
    }

    /* Desktop nav + sticky nav */
    placeholder.querySelectorAll('.nav-inner > li').forEach(function (li) {
      li.classList.remove('active');
      var link = li.querySelector(':scope > a');
      if (!link) return;
      if (activeCheck(link.getAttribute('href'))) li.classList.add('active');
    });

    /* Mobile drawer nav */
    placeholder.querySelectorAll('.drawer-nav > ul > li').forEach(function (li) {
      li.classList.remove('active');
      var link = li.querySelector(':scope > a');
      if (!link) return;
      if (activeCheck(link.getAttribute('href'))) li.classList.add('active');
    });
  }

  /* ─── Khởi động SmartSearch sau khi header load xong ─── */
  function initSmartSearch() {
    function tryInit() {
      if (window.SmartSearch) {
        SmartSearch.init({
          inputSelector: '.smart-search-input',
          maxProducts: 6,
          maxBlogs: 3,
          dataUrls: {
            products: '/assets/data/mo-da.json',
            blogs:    '/assets/data/blog.json'
          }
        });
      } else {
        setTimeout(tryInit, 100);
      }
    }
    tryInit();
  }

  /* ─── Lucide icons ─── */
  function initLucide() {
    function tryLucide() {
      if (window.lucide) {
        lucide.createIcons();
      } else {
        setTimeout(tryLucide, 100);
      }
    }
    tryLucide();
  }

  /* ─── Scroll-to-top button ─── */
  function initScrollTop() {
    function tryBind() {
      var btn = document.getElementById('scrollTopFixed');
      if (!btn) return;
      window.addEventListener('scroll', function () {
        btn.classList.toggle('visible', window.scrollY > 300);
      }, { passive: true });
      btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryBind);
    } else {
      tryBind();
    }
  }

  /* ─── Khởi chạy ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHeader);
  } else {
    loadHeader();
  }

})();