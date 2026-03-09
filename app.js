// === Main App ===
(function() {
    'use strict';

    var currentLang = localStorage.getItem('gvLang') || 'fr';
    var langLabels = {
        fr: 'FR', en: 'EN', it: 'IT', es: 'ES', de: 'DE',
        pt: 'PT', ro: 'RO', sq: 'SQ', ru: 'RU', ar: 'AR'
    };

    // === Language System ===
    function setLang(lang) {
        if (!T[lang]) return;
        currentLang = lang;
        localStorage.setItem('gvLang', lang);

        // RTL for Arabic
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;

        // Update flag button
        document.getElementById('langFlag').textContent = langLabels[lang];

        // Mark active in dropdown
        document.querySelectorAll('.lang-option').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });

        // Update hero
        var t = T[lang];
        document.getElementById('heroTitle').textContent = t.heroTitle;
        document.getElementById('searchInput').placeholder = t.searchPlaceholder;

        // Update all [data-i18n] elements
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            if (t[key]) el.textContent = t[key];
        });

        // Close dropdown
        document.getElementById('langDropdown').classList.remove('open');

        // Update live data
        updateTime();
    }

    // === Language dropdown ===
    document.getElementById('langToggle').addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('langDropdown').classList.toggle('open');
    });

    document.querySelectorAll('.lang-option').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            setLang(this.getAttribute('data-lang'));
        });
    });

    document.addEventListener('click', function() {
        document.getElementById('langDropdown').classList.remove('open');
    });

    // === Search ===
    var searchInput = document.getElementById('searchInput');
    var searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterCards, 150);
    });

    function filterCards() {
        var q = searchInput.value.toLowerCase().trim();
        var sections = document.querySelectorAll('.section');

        sections.forEach(function(sec) {
            var cards = sec.querySelectorAll('.card');
            var vis = 0;
            cards.forEach(function(card) {
                var tags = (card.getAttribute('data-tags') || '').toLowerCase();
                var h3 = card.querySelector('h3');
                var p = card.querySelector('.card-body p');
                var text = tags + ' ' + (h3 ? h3.textContent : '') + ' ' + (p ? p.textContent : '');
                if (!q || text.indexOf(q) !== -1) {
                    card.classList.remove('hidden');
                    vis++;
                } else {
                    card.classList.add('hidden');
                }
            });

            var emers = sec.querySelectorAll('.emer');
            emers.forEach(function(em) {
                var lbl = em.querySelector('.emer-lbl');
                var num = em.querySelector('.emer-num');
                var txt = (lbl ? lbl.textContent : '') + ' ' + (num ? num.textContent : '');
                txt = txt.toLowerCase();
                if (!q || txt.indexOf(q) !== -1) {
                    em.style.display = '';
                    vis++;
                } else {
                    em.style.display = 'none';
                }
            });

            sec.classList.toggle('hidden', vis === 0 && q !== '');
        });
    }

    // === Smooth scroll ===
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
        a.addEventListener('click', function(e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                var offset = document.querySelector('.city-banner').offsetHeight + 10;
                var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
        });
    });

    // === Map (Leaflet / OpenStreetMap) ===
    var map = L.map('map', {
        center: [46.2044, 6.1432],
        zoom: 13,
        zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
    }).addTo(map);

    // Geneva marker
    var genevaIcon = L.divIcon({
        className: 'geneva-marker',
        html: '<div style="background:#D42027;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">GE</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    L.marker([46.2044, 6.1432], { icon: genevaIcon }).addTo(map)
        .bindPopup('<b>Genève</b><br>Jet d\'eau');

    var userMarker = null;

    // Geolocation
    document.getElementById('locateBtn').addEventListener('click', function() {
        if (!navigator.geolocation) return;
        var btn = this;
        btn.style.opacity = '0.6';

        navigator.geolocation.getCurrentPosition(
            function(pos) {
                var lat = pos.coords.latitude;
                var lng = pos.coords.longitude;

                if (userMarker) {
                    map.removeLayer(userMarker);
                }

                var userIcon = L.divIcon({
                    className: 'user-marker',
                    html: '<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });

                userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
                map.setView([lat, lng], 14);
                btn.style.opacity = '1';
            },
            function() {
                btn.style.opacity = '1';
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    // === Weather Data (Open-Meteo - enhanced) ===
    function fetchWeather() {
        var url = 'https://api.open-meteo.com/v1/forecast?latitude=46.2044&longitude=6.1432&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,uv_index&timezone=Europe%2FZurich';
        fetch(url)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.current) {
                    var temp = Math.round(data.current.temperature_2m);
                    var code = data.current.weather_code;
                    var icon = weatherIcon(code);
                    var desc = weatherDesc(code);

                    // Weather strip
                    document.getElementById('wsTemp').textContent = icon + ' ' + temp + '°C';
                    document.getElementById('wsWind').textContent = Math.round(data.current.wind_speed_10m) + ' km/h';
                    document.getElementById('wsUV').textContent = Math.round(data.current.uv_index);
                }
            })
            .catch(function() {});
    }

    function weatherIcon(code) {
        if (code === 0) return '\u2600\uFE0F';
        if (code <= 3) return '\u26C5';
        if (code <= 49) return '\u2601\uFE0F';
        if (code <= 69) return '\uD83C\uDF27\uFE0F';
        if (code <= 79) return '\u2744\uFE0F';
        if (code <= 99) return '\u26A1';
        return '\u2601\uFE0F';
    }

    function weatherDesc(code) {
        var t = T[currentLang] || T.fr;
        if (code === 0) return t.wClear || 'Ciel dégagé';
        if (code <= 3) return t.wCloudy || 'Partiellement nuageux';
        if (code <= 49) return t.wFog || 'Brouillard';
        if (code <= 59) return t.wDrizzle || 'Bruine';
        if (code <= 69) return t.wRain || 'Pluie';
        if (code <= 79) return t.wSnow || 'Neige';
        if (code <= 99) return t.wThunder || 'Orage';
        return t.wCloudy || 'Nuageux';
    }

    // Lake temperature
    function fetchLakeTemp() {
        var el = document.getElementById('wsLake');
        fetch('https://alplakes-eawag.s3.eu-central-1.amazonaws.com/simulations/delft3d-flow/geneva/T_2024.json', { mode: 'cors' })
            .then(function(r) {
                if (!r.ok) throw new Error('x');
                return r.json();
            })
            .then(function(data) {
                if (data && data.temperature) {
                    el.textContent = Math.round(data.temperature) + '°C';
                } else {
                    el.textContent = '~' + estimateLakeTemp() + '°C';
                }
            })
            .catch(function() {
                el.textContent = '~' + estimateLakeTemp() + '°C';
            });
    }

    function estimateLakeTemp() {
        var month = new Date().getMonth();
        var temps = [6, 6, 7, 9, 13, 18, 22, 22, 19, 14, 10, 7];
        return temps[month];
    }

    // Time
    function updateTime() {
        var now = new Date();
        var locale = currentLang === 'ar' ? 'ar-SA' : currentLang;
        var timeStr = now.toLocaleTimeString(locale, { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' });
        var dateStr = now.toLocaleDateString(locale, { timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long' });

        document.getElementById('wsTime').textContent = timeStr;
        document.getElementById('wsDate').textContent = dateStr;
    }

    setInterval(updateTime, 30000);
    setInterval(fetchWeather, 600000);
    setInterval(fetchLakeTemp, 600000);

    // === Scroll animations ===
    function animateOnScroll() {
        var cards = document.querySelectorAll('.card, .emer');
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        cards.forEach(function(card) {
            card.classList.add('animate-in');
            observer.observe(card);
        });
    }

    // === Back to top ===
    var backTop = document.getElementById('backTop');
    window.addEventListener('scroll', function() {
        backTop.classList.toggle('show', window.scrollY > 400);
    });
    backTop.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // === Legal Modal ===
    var legalModal = document.getElementById('legalModal');
    document.getElementById('legalBtn').addEventListener('click', function() {
        legalModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    });
    document.getElementById('legalClose').addEventListener('click', function() {
        legalModal.classList.remove('open');
        document.body.style.overflow = '';
    });
    legalModal.addEventListener('click', function(e) {
        if (e.target === legalModal) {
            legalModal.classList.remove('open');
            document.body.style.overflow = '';
        }
    });

    // === Init ===
    setLang(currentLang);
    fetchWeather();
    fetchLakeTemp();
    updateTime();
    animateOnScroll();

})();
