/**
 * SmartSearch Engine – Đá Mỹ Nghệ Ninh Bình
 * Nhúng file này VÀO SAU khi header đã được load.
 * Gọi: SmartSearch.init({ ... }) sau khi DOM sẵn sàng.
 */
(function (global) {
  'use strict';

  const ACCENT_MAP = {
    'àáâãäåāăąẩẫấầắặẳẵ': 'a', 'èéêëēĕėęěẹẻẽếềệểễ': 'e',
    'ìíîïīĭįịỉĩ': 'i', 'òóôõöōŏőọỏõốồổỗộớờởỡợ': 'o',
    'ùúûüūŭůűụủũứừửữự': 'u', 'ỳýÿỵỷỹ': 'y', 'đ': 'd', 'ñ': 'n'
  };
  const AF = {};
  for (const [chars, rep] of Object.entries(ACCENT_MAP)) {
    for (const c of chars) { AF[c] = rep; AF[c.toUpperCase()] = rep.toUpperCase(); }
  }
  function rd(s) { return (s || '').replace(/./g, c => AF[c] || c).toLowerCase(); }
  function tok(s) { return rd(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean); }

  const SPINNER = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18" style="display:block"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="44" stroke-dashoffset="32"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite"/></circle></svg>`;
  const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18" style="display:block"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

  const SS = {
    _data: { products: [], blogs: [] },
    _loaded: false,
    _t: null,

    /**
     * @param {Object} cfg
     * @param {string} cfg.inputSelector  - CSS selector cho ô tìm kiếm, default '#mainSearchInput'
     * @param {number} cfg.maxProducts    - Số sp tối đa hiện trong dropdown
     * @param {number} cfg.maxBlogs       - Số bài viết tối đa hiện trong dropdown
     * @param {Object} cfg.dataUrls       - { products: '/assets/data/mo-da.json', blogs: '/assets/data/blog.json' }
     */
    init(cfg) {
      this.cfg = Object.assign({
        inputSelector: '#mainSearchInput',
        maxProducts: 6,
        maxBlogs: 3,
        dataUrls: {
          products: '/assets/data/mo-da.json',
          blogs: '/assets/data/blog.json'
        }
      }, cfg);
      this._preload();
      this._bindAll();
    },

    _preload() {
      // Dùng cache nếu đã fetch ở trang product grid
      if (window.__SS_PRODUCTS__) this._data.products = window.__SS_PRODUCTS__;
      if (window.__SS_BLOGS__) this._data.blogs = window.__SS_BLOGS__;

      const p1 = fetch(this.cfg.dataUrls.products)
        .then(r => r.json())
        .then(d => { this._data.products = d || []; window.__SS_PRODUCTS__ = d; })
        .catch(() => {});
      const p2 = fetch(this.cfg.dataUrls.blogs)
        .then(r => r.json())
        .then(d => { this._data.blogs = d || []; window.__SS_BLOGS__ = d; })
        .catch(() => {});
      Promise.all([p1, p2]).then(() => { this._loaded = true; });
    },

    _bindAll() {
      document.querySelectorAll(this.cfg.inputSelector).forEach(inp => this._bindInput(inp));
    },

    _bindInput(inp) {
      const wrap = inp.closest('#headerSearchWrap, .header-search') || inp.parentElement;
      if (wrap && getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
      const btn = wrap.querySelector('button');

      const drop = document.createElement('div');
      drop.className = 'ss-dropdown';
      drop.innerHTML = '<div class="ss-dropdown-inner"></div>';
      wrap.appendChild(drop);

      inp.addEventListener('input', () => this._onInput(inp, drop, btn));
      inp.addEventListener('focus', () => { if (inp.value.trim().length >= 1) this._onInput(inp, drop, btn); });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Escape') this._close(drop, btn);
        if (e.key === 'Enter') {
          const q = inp.value.trim();
          if (q) window.location.href = '/search/?q=' + encodeURIComponent(q);
        }
      });
      if (btn) btn.addEventListener('click', () => {
        const q = inp.value.trim();
        if (q) window.location.href = '/search/?q=' + encodeURIComponent(q);
      });
      document.addEventListener('click', e => { if (!wrap.contains(e.target)) this._close(drop, btn); });
    },

    _onInput(inp, drop, btn) {
      clearTimeout(this._t);
      const q = inp.value.trim();
      if (!q) { this._close(drop, btn); return; }
      if (btn) btn.innerHTML = SPINNER;
      this._showSkel(drop);
      this._t = setTimeout(() => this._run(q, drop, btn), this._loaded ? 180 : 500);
    },

    _run(q, drop, btn) {
      this._render(this._search(q), q, drop);
      if (btn) btn.innerHTML = ICON_SEARCH;
    },

    _search(q) {
      const qt = tok(q);
      if (!qt.length) return { products: [], blogs: [] };
      const sc = (name, extra = []) => {
        const nf = rd(name);
        const cf = rd([name, ...extra].join(' '));
        let s = 0;
        for (const t of qt) {
          if (nf.includes(t)) s += 3;
          else if (cf.includes(t)) s += 1;
        }
        if (q.length > 2 && nf.startsWith(rd(q))) s += 5;
        return s;
      };
      return {
        products: this._data.products
          .map(p => ({ ...p, _s: sc(p.name, p.cat || []) }))
          .filter(p => p._s > 0)
          .sort((a, b) => b._s - a._s)
          .slice(0, this.cfg.maxProducts),
        blogs: this._data.blogs
          .map(b => ({ ...b, _s: sc(b.title, b.tags || []) }))
          .filter(b => b._s > 0)
          .sort((a, b) => b._s - a._s)
          .slice(0, this.cfg.maxBlogs),
      };
    },

    _hl(text, q) {
      const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let res = esc(text);
      for (const t of tok(q)) {
        res = res.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
        break;
      }
      return res;
    },

    _esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },

    _render(r, q, drop) {
      const inner = drop.querySelector('.ss-dropdown-inner');
      const total = r.products.length + r.blogs.length;
      let h = '';
      if (!total) {
        h = `<div class="ss-empty">Không tìm thấy kết quả cho "<strong>${this._esc(q)}</strong>"</div>`;
      } else {
        if (r.products.length) {
          h += `<div class="ss-section-label">🏛️ Sản phẩm (${r.products.length})</div>`;
          r.products.forEach(p => {
            h += `<a class="ss-item" href="${this._esc(p.link || '#')}">
              <img class="ss-item-img" src="${this._esc(p.image)}" alt="" loading="lazy" onerror="this.style.display='none'">
              <div class="ss-item-info">
                <div class="ss-item-name">${this._hl(p.name, q)}</div>
                <div class="ss-item-meta">${this._catLbl(p.loaida)}</div>
              </div>
              <span class="ss-badge ss-bp">Sản phẩm</span>
            </a>`;
          });
        }
        if (r.blogs.length) {
          h += `<div class="ss-section-label">📰 Bài viết (${r.blogs.length})</div>`;
          r.blogs.forEach(b => {
            h += `<a class="ss-item" href="${this._esc(b.link || '#')}">
              <img class="ss-item-img" src="${this._esc(b.image)}" alt="" loading="lazy" onerror="this.style.display='none'">
              <div class="ss-item-info">
                <div class="ss-item-name">${this._hl(b.title, q)}</div>
                <div class="ss-item-meta">${this._esc((b.excerpt || '').substring(0, 60))}...</div>
              </div>
              <span class="ss-badge ss-bb">Bài viết</span>
            </a>`;
          });
        }
        h += `<a class="ss-view-all" href="/search/?q=${encodeURIComponent(q)}">Xem tất cả kết quả cho "<strong>${this._esc(q)}</strong>" →</a>`;
      }
      inner.innerHTML = h;
      drop.classList.add('open');
    },

    _showSkel(drop) {
      const inner = drop.querySelector('.ss-dropdown-inner');
      inner.innerHTML = [0, 1, 2].map(() =>
        `<div style="display:flex;align-items:center;gap:10px;padding:8px 14px">
          <div style="width:44px;height:44px;border-radius:6px;background:#f0f0f0;flex-shrink:0"></div>
          <div style="flex:1">
            <div style="height:10px;background:#f0f0f0;border-radius:4px;margin-bottom:6px"></div>
            <div style="height:9px;background:#f0f0f0;border-radius:4px;width:55%"></div>
          </div>
        </div>`
      ).join('');
      drop.classList.add('open');
    },

    _close(d, btn) { d.classList.remove('open'); if (btn) btn.innerHTML = ICON_SEARCH; },
    _catLbl(v) {
      return { xanhden: 'Đá xanh đen', xanhreu: 'Đá xanh rêu', trang: 'Đá trắng', granite: 'Đá Granite', vang: 'Đá vàng' }[v] || v || '';
    },
  };

  global.SmartSearch = SS;
})(window);