/* load-footer.js
   Nhúng footer.html vào #site-footer, sau đó khởi tạo nút scroll-to-top.
   Đặt script này TRƯỚC </body> hoặc dùng defer.
*/
(function () {
  'use strict';

  /* ── Khởi tạo nút scroll-to-top ── */
  function initScrollTop() {
    var btn = document.getElementById('scrollTopFixed');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      btn.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── Tải footer.html rồi inject vào placeholder ── */
  function loadFooter() {
    var placeholder = document.getElementById('site-footer');
    if (!placeholder) return;

    fetch('/footer.html')
      .then(function (res) {
        if (!res.ok) throw new Error('Không tải được footer.html – HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        placeholder.innerHTML = html;
        /* Khởi tạo nút ngay sau khi HTML đã vào DOM */
        initScrollTop();
      })
      .catch(function (err) {
        console.error('[load-footer]', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooter);
  } else {
    loadFooter();
  }

})();