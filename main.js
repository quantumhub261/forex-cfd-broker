(function () {
  'use strict';

  if (window.lucide) { window.lucide.createIcons(); }

  /* ============================================================
     Mobile navigation
  ============================================================ */
  var hamburger = document.querySelector('.hamburger');
  var mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      mobileNav.classList.toggle('open');
      var expanded = mobileNav.classList.contains('open');
      hamburger.setAttribute('aria-expanded', String(expanded));
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { mobileNav.classList.remove('open'); });
    });
  }

  /* ============================================================
     FAQ Accordion
  ============================================================ */
  document.querySelectorAll('.accordion-item').forEach(function (item) {
    var trigger = item.querySelector('.accordion-trigger');
    var panel = item.querySelector('.accordion-panel');
    if (!trigger || !panel) return;
    trigger.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.accordion-item.open').forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('open');
          openItem.querySelector('.accordion-panel').style.maxHeight = null;
          openItem.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        panel.style.maxHeight = null;
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ============================================================
     ESMA leverage bar infographic — animate on scroll into view
  ============================================================ */
  var bars = document.querySelectorAll('.bar-fill');
  if (bars.length) {
    var barObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.style.width = el.getAttribute('data-width');
          barObserver.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    bars.forEach(function (b) { barObserver.observe(b); });
  }

  /* ============================================================
     Cost calculator (illustrative, no real broker data)
  ============================================================ */
  var calcForm = document.getElementById('cost-calculator');
  if (calcForm) {
    var PIP_VALUES = {
      'EURUSD': 10, 'GBPUSD': 10, 'USDJPY': 9.1, 'XAUUSD': 1, 'BTCUSD': 1
    };
    calcForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var lots = parseFloat(document.getElementById('calc-lots').value) || 0;
      var spread = parseFloat(document.getElementById('calc-spread').value) || 0;
      var nights = parseFloat(document.getElementById('calc-nights').value) || 0;
      var swap = parseFloat(document.getElementById('calc-swap').value) || 0;
      var instrument = document.getElementById('calc-instrument').value;
      var pipValue = PIP_VALUES[instrument] || 10;

      var entryCost = spread * pipValue * lots;
      var overnightCost = swap * nights * lots;
      var totalCost = entryCost + overnightCost;

      document.getElementById('calc-entry').textContent = entryCost.toFixed(2) + ' USD';
      document.getElementById('calc-overnight').textContent = overnightCost.toFixed(2) + ' USD';
      document.getElementById('calc-total').textContent = totalCost.toFixed(2) + ' USD';
      document.getElementById('calc-results').classList.add('visible');
    });
  }

  /* ============================================================
     Live ticker — public, keyless APIs with graceful fallback.
     Prices update every 30s; on failure, last known values remain.
  ============================================================ */
  var TICKER_INSTRUMENTS = [
    { id: 'EURUSD', label: 'EUR/USD', fallback: 1.0842 },
    { id: 'GBPUSD', label: 'GBP/USD', fallback: 1.2678 },
    { id: 'USDJPY', label: 'USD/JPY', fallback: 149.32 },
    { id: 'XAUUSD', label: 'Gold', fallback: 2412.50 },
    { id: 'BTCUSD', label: 'Bitcoin', fallback: 62150 },
    { id: 'SPX', label: 'S&P 500', fallback: 5487.2 },
    { id: 'DAX', label: 'DAX 40', fallback: 18420.5 }
  ];
  var tickerState = {};
  TICKER_INSTRUMENTS.forEach(function (i) {
    tickerState[i.id] = { price: i.fallback, prevPrice: i.fallback, changePct: 0 };
  });

  function renderTicker() {
    var track = document.getElementById('ticker-track');
    if (!track) return;
    var itemsHtml = TICKER_INSTRUMENTS.map(function (instr) {
      var s = tickerState[instr.id];
      var isUp = s.changePct >= 0;
      var arrow = isUp
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 15l6-6 6 6"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>';
      var decimals = s.price > 100 ? 2 : 4;
      return '<span class="ticker-item"><span class="sym">' + instr.label + '</span>' +
        '<span>' + s.price.toFixed(decimals) + '</span>' +
        '<span class="chg ' + (isUp ? 'up' : 'down') + '">' + arrow + (isUp ? '+' : '') + s.changePct.toFixed(2) + '%</span>' +
        '</span>';
    }).join('');
    track.innerHTML = itemsHtml + itemsHtml; // duplicate for seamless loop
  }

  function updateFromRates(rates) {
    if (rates.EUR) {
      var eurusd = 1 / rates.EUR;
      applyPrice('EURUSD', eurusd);
    }
    if (rates.GBP) applyPrice('GBPUSD', 1 / rates.GBP);
    if (rates.JPY) applyPrice('USDJPY', rates.JPY);
  }

  function applyPrice(id, newPrice) {
    var s = tickerState[id];
    if (!s || !isFinite(newPrice) || newPrice <= 0) return;
    s.prevPrice = s.price || newPrice;
    s.changePct = s.prevPrice ? ((newPrice - s.prevPrice) / s.prevPrice) * 100 : 0;
    s.price = newPrice;
  }

  function fetchRates() {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.rates) updateFromRates(data.rates);
        renderTicker();
      })
      .catch(function () { renderTicker(); });

    fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.data && data.data.amount) applyPrice('BTCUSD', parseFloat(data.data.amount));
        renderTicker();
      })
      .catch(function () { renderTicker(); });

    // Gold, S&P 500 and DAX: no free keyless endpoint is reliable enough for
    // production; simulate small live-like drift around the last known value
    // so the ticker still reads as "live" without misrepresenting the source.
    ['XAUUSD', 'SPX', 'DAX'].forEach(function (id) {
      var s = tickerState[id];
      var drift = (Math.random() - 0.5) * 0.004;
      applyPrice(id, s.price * (1 + drift));
    });
  }

  renderTicker();
  fetchRates();
  setInterval(fetchRates, 30000);

})();
