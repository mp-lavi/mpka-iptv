/**
 * MPKA Iptv - Controlador Principal Completo para Samsung Tizen OS
 * Inclui todas as 7 melhorias:
 *  1. Agrupamento de Séries por Temporadas e Episódios (Modal de Episódios com marcação de assistido)
 *  2. Zapping Rápido no Player (▲/▼ ou CH+/CH- troca canal, ◄ abre Gaveta Lateral de Canais)
 *  3. Retomada Real de Filmes/Séries de onde parou (salva posição de tempo no localStorage)
 *  4. Integração com Tizen AVPlay (H265/HEVC/AC3) + Hls.js + <video> nativo
 *  5. Teclado Virtual On-Screen na aba Buscar + Barra de Pulo Rápido de Categorias (Jump Pills)
 *  6. Seleção Rápida de Qualidade (4K / FHD / HD / SD) para o mesmo canal com Seta ► no Player
 *  7. Controle de Pais com PIN de 4 dígitos + Guia EPG XMLTV
 */

(() => {
    'use strict';

    const STORAGE_KEYS = {
        M3U_URL: 'mpkaiptv_m3u_url',
        EPG_URL: 'mpkaiptv_epg_url',
        M3U_RAW: 'mpkaiptv_m3u_raw',
        FAVORITES: 'mpkaiptv_favorites',
        HISTORY: 'mpkaiptv_continue_watching',
        PARENTAL_PIN: 'mpkaiptv_parental_pin',
        PLAYBACK_POSITIONS: 'mpkaiptv_playback_positions', // { [streamUrl]: { time, duration, pct, updatedAt } }
        GITHUB_REPO: 'mpka_github_repo_v1',
        OTA_AUTO: 'mpka_ota_auto_v1',
        OTA_BUNDLE: 'mpka_ota_bundle_v1'
    };

    const KEYS = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        ENTER: 13,
        ESC: 27,
        TIZEN_RETURN: 10009,
        MEDIA_PLAY_PAUSE: 10252,
        MEDIA_PLAY: 415,
        MEDIA_PAUSE: 19,
        MEDIA_STOP: 413,
        MEDIA_REWIND: 412,
        MEDIA_FAST_FORWARD: 417,
        CH_UP: 427,
        CH_DOWN: 428
    };

    const ASPECT_MODES = [
        { id: 'aspect-original', label: 'Original' },
        { id: 'aspect-fill', label: '16:9 Cheia' },
        { id: 'aspect-cover', label: 'Zoom Preencher' },
        { id: 'aspect-cinema', label: 'Cinema 21:9' }
    ];

    const MAX_CARDS_PER_ROW = 40;
    const OSK_KEYS = [
        'A','B','C','D','E','F','G','H','I','J','K','L','M',
        'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
        '0','1','2','3','4','5','6','7','8','9','ESPAÇO','APAGAR','LIMPAR'
    ];

    // Estado central da aplicação
    const state = {
        // Zonas D-Pad: 'topbar' | 'osk' | 'catjump' | 'hero' | 'catalog' | 'modal' | 'pin' | 'epg' | 'series' | 'player' | 'player_drawer'
        mode: 'catalog',
        previousMode: 'catalog',
        activeTab: 'home',
        topBarIndex: 0,
        oskIndex: 0,
        catJumpIndex: 0,
        heroBtnIndex: 0,
        modalIndex: 0,
        epgModalIndex: 0,

        // Modal de Temporadas e Episódios (Séries)
        activeSeriesShow: null,
        seriesZone: 'episodes', // 'seasons' | 'episodes' | 'actions'
        seriesSeasonKeys: [],
        seriesSeasonIdx: 0,
        seriesEpisodeIdx: 0,

        // Controle Parental (PIN 4 dígitos)
        parentalPin: '0000',
        parentalUnlocked: false,
        pinBuffer: '',
        pinKeypadIndex: 4,
        pinFlowMode: 'unlock',
        onPinSuccessCallback: null,

        // EPG XMLTV
        epgData: null,

        // Cache das seções
        sectionCache: { live: [], movies: [], series: [] },
        sectionLoaded: { live: false, movies: false, series: false },

        categories: [],
        favorites: [],
        history: [],
        playbackPositions: {},

        rowIndex: 0,
        colIndices: [],
        activeChannel: null,
        activeVariantIdx: 0,
        drawerIndex: 0,
        searchQuery: '',
        hlsInstance: null,
        overlayTimer: null,
        toastTimer: null,
        positionSaveInterval: null,

        // Controles Multimídia Estilo Netflix dentro do Player
        playerHudZone: 'buttons', // 'timeline' | 'buttons'
        playerCtrlIdx: 0,
        aspectModeIdx: 0,
        subtitleTrackIdx: -1, // -1 = Desativado, >= 0 = Índice da trilha de legenda

        // Auto-Atualização GitHub OTA & Abas de Configurações
        githubRepo: 'mp-lavi/mpka-iptv',
        otaAutoEnabled: true,
        settingsTabIdx: 0 // 0 = 'update', 1 = 'playlist', 2 = 'parental'
    };

    // Referências DOM
    const dom = {
        navTabs: Array.from(document.querySelectorAll('.nav-tab')),
        parentalBadge: document.getElementById('parental-badge'),
        parentalIcon: document.getElementById('parental-icon'),
        parentalStatusText: document.getElementById('parental-status-text'),
        playlistStatusText: document.getElementById('playlist-status-text'),

        searchBarContainer: document.getElementById('search-bar-container'),
        searchBoxWrapper: document.querySelector('.search-box-wrapper'),
        searchInput: document.getElementById('search-input'),
        searchCountBadge: document.getElementById('search-count-badge'),
        onscreenKeyboard: document.getElementById('onscreen-keyboard'),

        categoryJumpBar: document.getElementById('category-Jump-bar'),

        heroBackdrop: document.getElementById('hero-backdrop'),
        heroBackdropImage: document.getElementById('hero-backdrop-image'),
        heroKickerText: document.getElementById('hero-kicker-text'),
        heroFavPill: document.getElementById('hero-fav-pill'),
        heroResumePill: document.getElementById('hero-resume-pill'),
        heroAdultPill: document.getElementById('hero-adult-pill'),
        heroTitle: document.getElementById('hero-title'),
        heroMetaLine: document.getElementById('hero-meta-line'),

        heroEpgStrip: document.getElementById('hero-epg-strip'),
        heroEpgNowTitle: document.getElementById('hero-epg-now-title'),
        heroEpgNowTime: document.getElementById('hero-epg-now-time'),
        heroEpgBarFill: document.getElementById('hero-epg-bar-fill'),
        heroEpgNextTitle: document.getElementById('hero-epg-next-title'),

        heroSynopsis: document.getElementById('hero-synopsis'),
        btnHeroPlay: document.getElementById('btn-hero-play'),
        heroPlayBtnText: document.getElementById('hero-play-btn-text'),
        btnHeroSecondary: document.getElementById('btn-hero-secondary'),
        heroSecIcon: document.getElementById('hero-sec-icon'),
        heroSecBtnText: document.getElementById('hero-sec-btn-text'),
        heroDots: Array.from(document.querySelectorAll('#hero-dots .h-dot')),

        sectionLoading: document.getElementById('section-loading'),
        sectionLoadingText: document.getElementById('section-loading-text'),
        rowsWrapper: document.getElementById('rows-wrapper'),
        clockDisplay: document.getElementById('clock-display'),

        // Modal Séries (Temporadas e Episódios)
        seriesModal: document.getElementById('series-modal'),
        seriesModalTitle: document.getElementById('series-modal-title'),
        seriesModalSubtitle: document.getElementById('series-modal-subtitle'),
        btnSeriesFav: document.getElementById('btn-series-fav'),
        seriesSeasonsBar: document.getElementById('series-seasons-bar'),
        seriesEpisodesList: document.getElementById('series-episodes-list'),
        btnSeriesClose: document.getElementById('btn-series-close'),

        // Modal Configurações (Lista IPTV + GitHub OTA + Controle Parental)
        settingsModal: document.getElementById('settings-modal'),
        settingsVersionBadge: document.getElementById('settings-version-badge'),
        settingsOtaBadge: document.getElementById('settings-ota-badge'),
        inputM3uUrl: document.getElementById('input-m3u-url'),
        inputEpgUrl: document.getElementById('input-epg-url'),
        inputM3uRaw: document.getElementById('input-m3u-raw'),
        btnRefreshPlaylist: document.getElementById('btn-refresh-playlist'),
        inputGithubRepo: document.getElementById('input-github-repo'),
        btnCheckOta: document.getElementById('btn-check-ota'),
        btnToggleAutoOta: document.getElementById('btn-toggle-autoota'),
        btnResetOta: document.getElementById('btn-reset-ota'),
        btnChangePin: document.getElementById('btn-change-pin'),
        btnLockAdultNow: document.getElementById('btn-lock-adult-now'),
        modalFeedback: document.getElementById('modal-feedback'),
        btnSaveM3u: document.getElementById('btn-save-m3u'),
        btnRestoreDefault: document.getElementById('btn-restore-default'),
        btnCloseModal: document.getElementById('btn-close-modal'),

        // Modal PIN
        pinModal: document.getElementById('pin-modal'),
        pinModalTitle: document.getElementById('pin-modal-title'),
        pinModalSubtitle: document.getElementById('pin-modal-subtitle'),
        pinBoxes: [
            document.getElementById('pin-box-0'),
            document.getElementById('pin-box-1'),
            document.getElementById('pin-box-2'),
            document.getElementById('pin-box-3')
        ],
        pinErrorMsg: document.getElementById('pin-error-msg'),
        pinKeys: Array.from(document.querySelectorAll('#pin-keypad .pin-key')),

        // Modal EPG
        epgModal: document.getElementById('epg-modal'),
        epgModalChannelTitle: document.getElementById('epg-modal-channel-title'),
        epgSourceBadge: document.getElementById('epg-source-badge'),
        epgScheduleList: document.getElementById('epg-schedule-list'),
        btnEpgWatch: document.getElementById('btn-epg-watch'),
        btnEpgFav: document.getElementById('btn-epg-fav'),
        btnEpgClose: document.getElementById('epg-close') || document.getElementById('btn-epg-close'),

        // Player Fullscreen + Controles Multimídia Estilo Netflix
        playerScreen: document.getElementById('player-screen'),
        avPlayerObj: document.getElementById('av-player'),
        videoElement: document.getElementById('video-element'),
        playerSubtitleBox: document.getElementById('player-subtitle-box'),
        playerActionToast: document.getElementById('player-action-toast'),
        playerToastIcon: document.getElementById('player-toast-icon'),
        playerToastText: document.getElementById('player-toast-text'),
        playerChannelDrawer: document.getElementById('player-channel-drawer'),
        drawerCategoryTitle: document.getElementById('drawer-category-title'),
        drawerChannelList: document.getElementById('drawer-channel-list'),
        playerSpinner: document.getElementById('player-spinner'),
        playerSpinnerText: document.getElementById('player-spinner-text'),
        playerOverlay: document.getElementById('player-overlay'),
        playerTypeText: document.getElementById('player-type-text'),
        playerVariantsBar: document.getElementById('player-variants-bar'),
        playerAspectBadge: document.getElementById('player-aspect-badge'),
        playerSubBadge: document.getElementById('player-sub-badge'),
        playerEngineTag: document.getElementById('player-engine-tag'),
        playerChannelGroup: document.getElementById('player-channel-group'),
        playerChannelName: document.getElementById('player-channel-name'),
        playerEpgInfo: document.getElementById('player-epg-info'),
        playerEpgNow: document.getElementById('player-epg-now'),
        playerEpgNext: document.getElementById('player-epg-next'),
        playerBufferStatus: document.getElementById('player-buffer-status'),
        playerResolutionInfo: document.getElementById('player-resolution-info'),

        // Timeline Scrubber & Botões Multimídia do Player
        playerTimelineRow: document.getElementById('player-timeline-row'),
        playerTimeCurrent: document.getElementById('player-time-current'),
        playerTimeDuration: document.getElementById('player-time-duration'),
        playerSeekbarTrack: document.getElementById('player-seekbar-track'),
        playerSeekbarBuffer: document.getElementById('player-seekbar-buffer'),
        playerSeekbarFill: document.getElementById('player-seekbar-fill'),
        playerControlsBar: document.getElementById('player-controls-bar'),
        pbtnPlayPause: document.getElementById('pbtn-playpause'),
        pbtnPlayPauseIcon: document.getElementById('pbtn-playpause-icon'),
        pbtnPlayPauseLabel: document.getElementById('pbtn-playpause-label'),
        pbtnRew: document.getElementById('pbtn-rew'),
        pbtnFwd: document.getElementById('pbtn-fwd'),
        pbtnRestart: document.getElementById('pbtn-restart'),
        pbtnNextEp: document.getElementById('pbtn-nextep'),
        pbtnSubtitles: document.getElementById('pbtn-subtitles'),
        pbtnSubtitlesLabel: document.getElementById('pbtn-subtitles-label'),
        pbtnAspect: document.getElementById('pbtn-aspect'),
        pbtnAspectLabel: document.getElementById('pbtn-aspect-label'),
        pbtnQuality: document.getElementById('pbtn-quality'),
        pbtnQualityLabel: document.getElementById('pbtn-quality-label'),
        pbtnDrawer: document.getElementById('pbtn-drawer'),
        pbtnDrawerLabel: document.getElementById('pbtn-drawer-label')
    };

    /**
     * Inicialização da Aplicação
     */
    async function init() {
        registerTizenKeys();
        startClock();
        loadPersistedUserData();
        renderOnScreenKeyboard();
        updateParentalStatusUI();
        updateOtaSettingsUI();
        bindClickAndSearchEvents();

        await bootstrapPlaylist();
        bindRemoteControlEvents();

        // Verifica atualizações silenciosamente no GitHub se Auto-Atualizar estiver ativo
        setTimeout(() => {
            if (state.otaAutoEnabled && state.githubRepo) {
                checkAndApplyGitHubUpdate(false);
            }
        }, 4000);
    }

    function registerTizenKeys() {
        try {
            if (window.tizen && window.tizen.tvinputdevice) {
                [
                    'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
                    'MediaRewind', 'MediaFastForward',
                    'ChannelUp', 'ChannelDown',
                    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
                ].forEach(k => {
                    try { window.tizen.tvinputdevice.registerKey(k); } catch (_) {}
                });
            }
        } catch (_) {}
    }

    function startClock() {
        const update = () => {
            const now = new Date();
            dom.clockDisplay.textContent =
                String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        };
        update();
        setInterval(update, 15000);
    }

    function loadPersistedUserData() {
        try {
            // Migra ou lê configurações salvas
            const savedPin = localStorage.getItem(STORAGE_KEYS.PARENTAL_PIN) || localStorage.getItem('tizenstream_parental_pin');
            state.parentalPin = (savedPin && /^\d{4}$/.test(savedPin)) ? savedPin : '0000';
        } catch (_) {
            state.parentalPin = '0000';
        }

        try {
            const favRaw = localStorage.getItem(STORAGE_KEYS.FAVORITES) || localStorage.getItem('tizenstream_favorites');
            state.favorites = favRaw ? JSON.parse(favRaw) : [];
        } catch (_) {
            state.favorites = [];
        }

        try {
            const histRaw = localStorage.getItem(STORAGE_KEYS.HISTORY) || localStorage.getItem('tizenstream_continue_watching');
            state.history = histRaw ? JSON.parse(histRaw) : [];
        } catch (_) {
            state.history = [];
        }

        try {
            const posRaw = localStorage.getItem(STORAGE_KEYS.PLAYBACK_POSITIONS);
            state.playbackPositions = posRaw ? JSON.parse(posRaw) : {};
        } catch (_) {
            state.playbackPositions = {};
        }

        try {
            state.githubRepo = localStorage.getItem(STORAGE_KEYS.GITHUB_REPO) || 'mp-lavi/mpka-iptv';
            const autoOta = localStorage.getItem(STORAGE_KEYS.OTA_AUTO);
            state.otaAutoEnabled = autoOta !== '0';
        } catch (_) {
            state.githubRepo = 'mp-lavi/mpka-iptv';
            state.otaAutoEnabled = true;
        }
    }

    /**
     * ========================================================================
     * 1. TECLADO VIRTUAL ON-SCREEN PARA BUSCA NA SMART TV
     * ========================================================================
     */
    function renderOnScreenKeyboard() {
        if (!dom.onscreenKeyboard) return;
        dom.onscreenKeyboard.innerHTML = '';

        OSK_KEYS.forEach((keyLabel, idx) => {
            const btn = document.createElement('button');
            const isWide = keyLabel.length > 1;
            btn.className = `osk-key ${isWide ? 'osk-wide' : ''}`;
            btn.textContent = keyLabel;
            btn.dataset.oskIdx = idx;
            btn.tabIndex = -1;

            btn.addEventListener('click', () => {
                state.mode = 'osk';
                state.oskIndex = idx;
                applyVisualFocus();
                triggerOskKey(keyLabel);
            });

            dom.onscreenKeyboard.appendChild(btn);
        });
    }

    function triggerOskKey(keyLabel) {
        if (keyLabel === 'ESPAÇO') {
            state.searchQuery += ' ';
        } else if (keyLabel === 'APAGAR') {
            state.searchQuery = state.searchQuery.slice(0, -1);
        } else if (keyLabel === 'LIMPAR') {
            state.searchQuery = '';
        } else {
            state.searchQuery += keyLabel.toLowerCase();
        }
        dom.searchInput.value = state.searchQuery;
        buildCategoriesForActiveTab(false);
        state.mode = 'osk';
        applyVisualFocus();
    }

    /**
     * ========================================================================
     * 2. BARRA DE FILTRO RÁPIDO DE CATEGORIAS (CATEGORY JUMP BAR)
     * ========================================================================
     */
    function renderCategoryJumpBar() {
        if (!dom.categoryJumpBar) return;
        dom.categoryJumpBar.innerHTML = '';

        if (state.categories.length <= 1) {
            dom.categoryJumpBar.classList.add('hidden');
            return;
        }

        dom.categoryJumpBar.classList.remove('hidden');
        state.categories.slice(0, 14).forEach((cat, idx) => {
            const pill = document.createElement('button');
            pill.className = `cat-pill ${idx === state.rowIndex ? 'active' : ''}`;
            const shortTitle = cat.title.replace(/^(Canais|Filmes|Series|Séries)\s*\|\s*/i, '');
            pill.textContent = shortTitle;
            pill.dataset.jumpIdx = idx;
            pill.tabIndex = -1;

            pill.addEventListener('click', () => {
                state.rowIndex = idx;
                state.catJumpIndex = idx;
                state.mode = 'catalog';
                renderCategoryJumpBar();
                applyVisualFocus();
            });

            dom.categoryJumpBar.appendChild(pill);
        });
    }

    /**
     * ========================================================================
     * 3. MODAL DE SÉRIES (SELETOR DE TEMPORADAS E EPISÓDIOS)
     * ========================================================================
     */
    async function openSeriesModal(showChannel) {
        if (!showChannel) return;

        if (isChannelLockedByParental(showChannel)) {
            openPinModal('unlock', () => openSeriesModal(showChannel));
            return;
        }

        state.previousMode = state.mode;
        state.mode = 'series';
        state.activeSeriesShow = showChannel;
        state.seriesSeasonIdx = 0;
        state.seriesEpisodeIdx = 0;
        state.seriesZone = 'episodes';

        dom.seriesModalTitle.textContent = showChannel.name;
        dom.seriesModalSubtitle.textContent = showChannel.badge || 'Selecione a temporada e o episódio abaixo';
        dom.btnSeriesFav.textContent = isFavorite(showChannel) ? '★ Remover Série dos Favoritos' : '★ Favoritar Série';

        dom.seriesModal.classList.remove('hidden');
        dom.seriesModal.setAttribute('aria-hidden', 'false');

        // Se os episódios ainda não foram carregados sob demanda (API Xtream get_series_info)
        if (!showChannel.seasons || Object.keys(showChannel.seasons).length === 0) {
            dom.seriesSeasonsBar.innerHTML = '<span style="color:#9ca3af;font-size:14px;">Buscando temporadas no servidor...</span>';
            dom.seriesEpisodesList.innerHTML = '<div style="padding:28px 16px;color:#e5e7eb;font-size:16px;">Carregando lista de episódios de <strong>' + escapeHtml(showChannel.name) + '</strong>...</div>';
            state.seriesZone = 'close';
            applyVisualFocus();

            await M3UParser.fetchSeriesEpisodesOnDemand(showChannel);
        }

        const keys = showChannel.seasons ? Object.keys(showChannel.seasons).map(Number).sort((a, b) => a - b) : [];
        state.seriesSeasonKeys = keys;

        if (keys.length === 0) {
            dom.seriesSeasonsBar.innerHTML = '';
            dom.seriesEpisodesList.innerHTML = '<div style="padding:28px 16px;color:#f87171;font-size:16px;">Nenhum episódio disponível para esta série no momento.</div>';
            state.seriesZone = 'close';
            applyVisualFocus();
            return;
        }

        state.seriesZone = 'episodes';
        renderSeriesModalContent();
        applyVisualFocus();
    }

    function renderSeriesModalContent() {
        const show = state.activeSeriesShow;
        if (!show || !show.seasons) return;

        // Renderiza pílulas de Temporadas (T1, T2...)
        dom.seriesSeasonsBar.innerHTML = '';
        state.seriesSeasonKeys.forEach((sNum, idx) => {
            const pill = document.createElement('button');
            pill.className = `season-pill ${idx === state.seriesSeasonIdx ? 'active' : ''}`;
            pill.textContent = `Temporada ${sNum}`;
            pill.addEventListener('click', () => {
                state.seriesSeasonIdx = idx;
                state.seriesEpisodeIdx = 0;
                state.seriesZone = 'episodes';
                renderSeriesModalContent();
                applyVisualFocus();
            });
            dom.seriesSeasonsBar.appendChild(pill);
        });

        // Renderiza Episódios da Temporada ativa
        const activeSeasonKey = state.seriesSeasonKeys[state.seriesSeasonIdx];
        const episodes = show.seasons[activeSeasonKey] || [];
        dom.seriesEpisodesList.innerHTML = '';

        episodes.forEach((ep, idx) => {
            const btn = document.createElement('button');
            btn.className = 'episode-row-btn';
            btn.id = `series-ep-btn-${idx}`;

            const savedPos = state.playbackPositions[ep.url];
            let progressLabel = '▶ Assistir';
            if (savedPos && savedPos.time > 10) {
                progressLabel = `⏱ Retomar (${formatSecondsToClock(savedPos.time)} • ${savedPos.pct || 0}%)`;
            }

            btn.innerHTML = `
                <div class="ep-left">
                    <span class="ep-number-badge">EP ${String(ep.episode).padStart(2, '0')}</span>
                    <span class="ep-title-text">${escapeHtml(ep.title || ep.name)}</span>
                </div>
                <span class="ep-watched-tag">${progressLabel}</span>
            `;

            btn.addEventListener('click', () => {
                closeSeriesModal();
                openPlayer(ep);
            });

            dom.seriesEpisodesList.appendChild(btn);
        });
    }

    function closeSeriesModal() {
        dom.seriesModal.classList.add('hidden');
        dom.seriesModal.setAttribute('aria-hidden', 'true');
        state.mode = 'catalog';
        applyVisualFocus();
    }

    /**
     * ========================================================================
     * 4. RETOMADA REAL DE TEMPO (RESUME PLAYBACK PARA FILMES E EPISÓDIOS)
     * ========================================================================
     */
    function savePlaybackProgress(streamUrl, currentTime, duration) {
        if (!streamUrl || !currentTime || currentTime < 5) return;
        const pct = duration > 0 ? Math.min(98, Math.max(5, Math.round((currentTime / duration) * 100))) : 35;
        state.playbackPositions[streamUrl] = {
            time: Math.floor(currentTime),
            duration: Math.floor(duration || 0),
            pct: pct,
            updatedAt: Date.now()
        };
        try {
            localStorage.setItem(STORAGE_KEYS.PLAYBACK_POSITIONS, JSON.stringify(state.playbackPositions));
        } catch (_) {}
    }

    function getSavedProgress(channel) {
        if (!channel || !channel.url) return null;
        return state.playbackPositions[channel.url] || null;
    }

    function formatSecondsToClock(sec) {
        const s = Math.max(0, Math.floor(sec || 0));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = s % 60;
        if (h > 0) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
        }
        return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    }

    /**
     * ========================================================================
     * 5. CONTROLE DE PAIS (PIN DE 4 DÍGITOS + BLOQUEIO DE CATEGORIAS ADULTAS +18)
     * ========================================================================
     */
    function isChannelLockedByParental(channel) {
        if (!channel) return false;
        const isAdult = Boolean(channel.isAdult) || M3UParser.isAdultContent(channel.name, channel.group);
        return isAdult && !state.parentalUnlocked;
    }

    function updateParentalStatusUI() {
        if (state.parentalUnlocked) {
            dom.parentalBadge.classList.add('unlocked');
            dom.parentalIcon.textContent = '🔓';
            dom.parentalStatusText.textContent = '+18 Liberado';
        } else {
            dom.parentalBadge.classList.remove('unlocked');
            dom.parentalIcon.textContent = '🔒';
            dom.parentalStatusText.textContent = '+18 Bloqueado';
        }
    }

    function lockAdultSessionNow() {
        state.parentalUnlocked = false;
        updateParentalStatusUI();
        buildCategoriesForActiveTab(true);
        setModalFeedback('Sessão +18 bloqueada novamente com sucesso.', 'success');
    }

    function openPinModal(flowMode, onSuccess) {
        state.previousMode = state.mode;
        state.mode = 'pin';
        state.pinFlowMode = flowMode || 'unlock';
        state.pinBuffer = '';
        state.pinKeypadIndex = 4;
        state.onPinSuccessCallback = onSuccess || null;

        if (state.pinFlowMode === 'change_verify_old') {
            dom.pinModalTitle.textContent = 'Digite o PIN Atual';
            dom.pinModalSubtitle.innerHTML = 'Confirme seu PIN atual de 4 dígitos para definir uma nova senha (Padrão: <strong>0000</strong>).';
        } else if (state.pinFlowMode === 'change_set_new') {
            dom.pinModalTitle.textContent = 'Novo PIN de 4 Dígitos';
            dom.pinModalSubtitle.textContent = 'Escolha os 4 números do novo PIN do Controle de Pais.';
        } else {
            dom.pinModalTitle.textContent = 'Controle de Pais (+18)';
            dom.pinModalSubtitle.innerHTML = 'Conteúdo adulto bloqueado. Digite o PIN de 4 dígitos para liberar (Padrão: <strong>0000</strong>).';
        }

        dom.pinErrorMsg.textContent = '';
        renderPinBoxes();
        dom.pinModal.classList.remove('hidden');
        dom.pinModal.setAttribute('aria-hidden', 'false');
        applyVisualFocus();
    }

    function closePinModal(restoreMode = null) {
        dom.pinModal.classList.add('hidden');
        dom.pinModal.setAttribute('aria-hidden', 'true');
        state.mode = restoreMode || state.previousMode || 'catalog';
        applyVisualFocus();
    }

    function renderPinBoxes() {
        for (let i = 0; i < 4; i++) {
            const box = dom.pinBoxes[i];
            const filled = i < state.pinBuffer.length;
            box.textContent = filled ? '●' : '';
            box.classList.toggle('filled', filled);
        }
    }

    function handlePinKeyInput(keyVal) {
        if (keyVal === 'clear') {
            state.pinBuffer = '';
            dom.pinErrorMsg.textContent = '';
            renderPinBoxes();
            return;
        }
        if (keyVal === 'cancel') {
            closePinModal();
            return;
        }

        if (/^\d$/.test(keyVal) && state.pinBuffer.length < 4) {
            state.pinBuffer += keyVal;
            dom.pinErrorMsg.textContent = '';
            renderPinBoxes();

            if (state.pinBuffer.length === 4) {
                setTimeout(validateEnteredPin, 140);
            }
        }
    }

    function validateEnteredPin() {
        const entered = state.pinBuffer;

        if (state.pinFlowMode === 'change_verify_old') {
            if (entered === state.parentalPin) {
                openPinModal('change_set_new', state.onPinSuccessCallback);
            } else {
                dom.pinErrorMsg.textContent = 'PIN atual incorreto. Tente novamente.';
                state.pinBuffer = '';
                renderPinBoxes();
            }
            return;
        }

        if (state.pinFlowMode === 'change_set_new') {
            state.parentalPin = entered;
            try {
                localStorage.setItem(STORAGE_KEYS.PARENTAL_PIN, entered);
            } catch (_) {}
            closePinModal('modal');
            setModalFeedback(`Novo PIN de Controle de Pais (${entered}) salvo com sucesso!`, 'success');
            return;
        }

        if (entered === state.parentalPin) {
            state.parentalUnlocked = true;
            updateParentalStatusUI();
            const cb = state.onPinSuccessCallback;
            closePinModal('catalog');
            buildCategoriesForActiveTab(true);
            if (typeof cb === 'function') cb();
        } else {
            dom.pinErrorMsg.textContent = 'PIN incorreto! Acesso negado.';
            state.pinBuffer = '';
            renderPinBoxes();
        }
    }

    /**
     * ========================================================================
     * 6. MOTOR DE EPG (XMLTV) E MODAL DE GRADE DETALHADA
     * ========================================================================
     */
    async function loadEpgInBackground(m3uUrl, customEpgUrl) {
        let targetEpgUrl = (customEpgUrl || '').trim();
        if (!targetEpgUrl && m3uUrl) {
            const endpoints = M3UParser.extractXtreamEndpoints(m3uUrl);
            if (endpoints && endpoints.epg) {
                targetEpgUrl = endpoints.epg;
                if (!dom.inputEpgUrl.value) {
                    dom.inputEpgUrl.value = targetEpgUrl;
                }
            }
        }

        if (!targetEpgUrl) return;

        try {
            const response = await fetch(targetEpgUrl);
            if (!response.ok) return;
            const xmlText = await response.text();
            const parsedEpg = M3UParser.parseXMLTV(xmlText);
            if (parsedEpg.count > 0) {
                state.epgData = parsedEpg;
                if (state.activeTab === 'home' || state.activeTab === 'live') {
                    renderCatalogRows();
                    applyVisualFocus();
                }
            }
        } catch (err) {
            console.warn('Aviso ao carregar EPG externo:', err);
        }
    }

    function openEpgModal(channel) {
        if (!channel) return;

        if (isChannelLockedByParental(channel)) {
            openPinModal('unlock', () => openEpgModal(channel));
            return;
        }

        state.previousMode = state.mode;
        state.mode = 'epg';
        state.epgModalIndex = 0;

        dom.epgModalChannelTitle.textContent = channel.name;
        const epgInfo = M3UParser.getChannelEPG(channel, state.epgData);
        dom.epgSourceBadge.textContent = (state.epgData && state.epgData.count > 0) ? 'EPG XMLTV ATIVO' : 'GRADE EPG';

        dom.epgScheduleList.innerHTML = '';
        if (epgInfo && epgInfo.schedule && epgInfo.schedule.length > 0) {
            epgInfo.schedule.forEach(slot => {
                const row = document.createElement('div');
                row.className = `epg-slot-item ${slot.isCurrent ? 'current-slot' : ''}`;
                row.innerHTML = `
                    <div class="epg-slot-time">${escapeHtml(slot.timeRange)} ${slot.isCurrent ? '• AGORA' : ''}</div>
                    <div class="epg-slot-info">
                        <div class="epg-slot-title">${escapeHtml(slot.title)}</div>
                        <div class="epg-slot-desc">${escapeHtml(slot.desc)}</div>
                    </div>
                `;
                dom.epgScheduleList.appendChild(row);
            });
        }

        dom.epgModal.classList.remove('hidden');
        dom.epgModal.setAttribute('aria-hidden', 'false');
        applyVisualFocus();
    }

    function closeEpgModal() {
        dom.epgModal.classList.add('hidden');
        dom.epgModal.setAttribute('aria-hidden', 'true');
        state.mode = 'catalog';
        applyVisualFocus();
    }

    function getEpgModalButtons() {
        return [dom.btnEpgWatch, dom.btnEpgFav, dom.btnEpgClose];
    }

    /**
     * ========================================================================
     * FAVORITOS E HISTÓRICO
     * ========================================================================
     */
    function isFavorite(item) {
        return item && state.favorites.some(f => f.name === item.name && f.section === item.section);
    }

    function toggleFavoriteCurrentChannel() {
        const ch = state.activeChannel;
        if (!ch) return;

        const idx = state.favorites.findIndex(f => f.name === ch.name && f.section === ch.section);
        if (idx === -1) {
            state.favorites.unshift(ch);
        } else {
            state.favorites.splice(idx, 1);
        }
        try {
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(state.favorites.slice(0, 60)));
        } catch (_) {}

        updateHeroBanner(ch);
        buildCategoriesForActiveTab(true);
    }

    function addToContinueWatching(item) {
        if (!item || !item.url) return;
        state.history = state.history.filter(h => h.url !== item.url && h.name !== item.name);
        state.history.unshift(item);
        state.history = state.history.slice(0, 20);
        try {
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history));
        } catch (_) {}
    }

    /**
     * ========================================================================
     * BOOTSTRAP DA LISTA M3U E SEÇÕES
     * ========================================================================
     */
    async function bootstrapPlaylist() {
        const savedUrl = localStorage.getItem(STORAGE_KEYS.M3U_URL) || localStorage.getItem('tizenstream_m3u_url') || 'http://ubkeqzg.biz/ss-ts/586960/jxkChq';
        const savedEpgUrl = localStorage.getItem(STORAGE_KEYS.EPG_URL) || localStorage.getItem('tizenstream_epg_url') || '';
        const savedRaw = localStorage.getItem(STORAGE_KEYS.M3U_RAW) || localStorage.getItem('tizenstream_m3u_raw') || '';

        dom.inputM3uUrl.value = savedUrl;
        dom.inputEpgUrl.value = savedEpgUrl;
        dom.inputM3uRaw.value = savedRaw;

        resetSectionsCache();

        if (savedRaw.trim()) {
            const parsed = M3UParser.parse(savedRaw);
            if (parsed.length > 0) {
                distributeItemsIntoSections(parsed);
                dom.playlistStatusText.textContent = `MPKA Local (${parsed.length} itens)`;
                loadEpgInBackground(savedUrl, savedEpgUrl);
                await switchTab('home');
                return;
            }
        }

        if (savedUrl.trim()) {
            try {
                showSectionLoading('Carregando canais da sua lista no MPKA Iptv...');
                const liveItems = await M3UParser.fetchSectionFromUrl(savedUrl, 'live');
                if (liveItems.length > 0) {
                    localStorage.setItem(STORAGE_KEYS.M3U_URL, savedUrl);
                    if (M3UParser.isMultiSectionXtreamUrl(savedUrl)) {
                        state.sectionCache.live = liveItems;
                        state.sectionLoaded.live = true;
                        M3UParser.fetchSectionFromUrl(savedUrl, 'movies')
                            .then(movies => {
                                state.sectionCache.movies = movies;
                                state.sectionLoaded.movies = true;
                                updateStatusCounter();
                                if (state.activeTab === 'home') buildCategoriesForActiveTab(true);
                            })
                            .catch(() => {});
                        M3UParser.fetchSectionFromUrl(savedUrl, 'series')
                            .then(series => {
                                state.sectionCache.series = series;
                                state.sectionLoaded.series = true;
                                updateStatusCounter();
                                if (state.activeTab === 'home') buildCategoriesForActiveTab(true);
                            })
                            .catch(() => {});
                    } else {
                        distributeItemsIntoSections(liveItems);
                    }
                    updateStatusCounter();
                    hideSectionLoading();
                    loadEpgInBackground(savedUrl, savedEpgUrl);
                    await switchTab('home');
                    return;
                }
            } catch (err) {
                console.warn('Erro ao buscar URL salva, usando demo integrada:', err);
                hideSectionLoading();
            }
        }

        const defaults = M3UParser.getDefaultChannels();
        distributeItemsIntoSections(defaults);
        dom.playlistStatusText.textContent = 'MPKA Demo (6 itens)';
        await switchTab('home');
    }

    function resetSectionsCache() {
        state.sectionCache = { live: [], movies: [], series: [] };
        state.sectionLoaded = { live: false, movies: false, series: false };
    }

    function distributeItemsIntoSections(items) {
        resetSectionsCache();
        items.forEach(item => {
            const sec = item.section || 'live';
            if (state.sectionCache[sec]) {
                state.sectionCache[sec].push(item);
            } else {
                state.sectionCache.live.push(item);
            }
        });
        state.sectionLoaded.live = true;
        state.sectionLoaded.movies = true;
        state.sectionLoaded.series = true;
    }

    function updateStatusCounter() {
        const total =
            state.sectionCache.live.length +
            state.sectionCache.movies.length +
            state.sectionCache.series.length;
        dom.playlistStatusText.textContent = `MPKA Ativo (${total.toLocaleString('pt-BR')} títulos)`;
    }

    async function switchTab(tabName) {
        if (tabName === 'settings') {
            openSettingsModal();
            return;
        }

        state.activeTab = tabName;
        dom.navTabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        dom.searchBarContainer.classList.toggle('hidden', tabName !== 'search');

        const savedUrl = (localStorage.getItem(STORAGE_KEYS.M3U_URL) || localStorage.getItem('tizenstream_m3u_url') || '').trim();
        if (
            (tabName === 'live' || tabName === 'movies' || tabName === 'series') &&
            !state.sectionLoaded[tabName] &&
            savedUrl &&
            M3UParser.isMultiSectionXtreamUrl(savedUrl)
        ) {
            const labelMap = {
                live: 'Canais Ao Vivo (unificando qualidades)',
                movies: 'Catálogo de Filmes',
                series: 'Séries (agrupando temporadas e episódios)'
            };
            try {
                showSectionLoading(`Carregando ${labelMap[tabName]}...`);
                const items = await M3UParser.fetchSectionFromUrl(savedUrl, tabName);
                state.sectionCache[tabName] = items;
                state.sectionLoaded[tabName] = true;
                updateStatusCounter();
            } catch (e) {
                console.warn(`Falha ao carregar seção ${tabName}:`, e);
            } finally {
                hideSectionLoading();
            }
        }

        state.rowIndex = 0;
        state.catJumpIndex = 0;
        state.colIndices = [];
        buildCategoriesForActiveTab(false);
    }

    function buildCategoriesForActiveTab(preserveFocus = false) {
        const categories = [];
        const tab = state.activeTab;

        if (tab === 'home') {
            const safeHistory = state.history.filter(h => !isChannelLockedByParental(h));
            const fallbackHome = [
                ...state.sectionCache.movies.filter(m => !isChannelLockedByParental(m)).slice(0, 6),
                ...state.sectionCache.live.filter(l => !isChannelLockedByParental(l)).slice(0, 6),
                ...state.sectionCache.series.filter(s => !isChannelLockedByParental(s)).slice(0, 4)
            ].slice(0, 12);

            const continueItems = safeHistory.length > 0 ? safeHistory : fallbackHome;
            if (continueItems.length > 0) {
                categories.push({
                    kicker: 'PRA VOCÊ',
                    title: 'Continue assistindo',
                    items: continueItems
                });
            }

            if (state.favorites.length > 0) {
                categories.push({
                    kicker: 'SUA LISTA',
                    title: 'Meus Favoritos',
                    items: state.favorites
                });
            }

            if (state.sectionCache.movies.length > 0) {
                groupItemsByCategory(state.sectionCache.movies, 3).forEach(g => categories.push({
                    kicker: 'CINEMA EM CASA',
                    title: g.title,
                    items: g.items
                }));
            }

            if (state.sectionCache.live.length > 0) {
                groupItemsByCategory(state.sectionCache.live, 4).forEach(g => categories.push({
                    kicker: 'TV AO VIVO',
                    title: g.title,
                    items: g.items
                }));
            }

            if (state.sectionCache.series.length > 0) {
                groupItemsByCategory(state.sectionCache.series, 3).forEach(g => categories.push({
                    kicker: 'MARATONAR',
                    title: g.title,
                    items: g.items
                }));
            }
        } else if (tab === 'live') {
            groupItemsByCategory(state.sectionCache.live, 65).forEach(g => categories.push({
                kicker: 'TRANSMISSÃO AO VIVO',
                title: g.title,
                items: g.items
            }));
        } else if (tab === 'movies') {
            groupItemsByCategory(state.sectionCache.movies, 65).forEach(g => categories.push({
                kicker: 'CATÁLOGO DE FILMES',
                title: g.title,
                items: g.items
            }));
        } else if (tab === 'series') {
            groupItemsByCategory(state.sectionCache.series, 65).forEach(g => categories.push({
                kicker: 'SÉRIES & NOVELAS',
                title: g.title,
                items: g.items
            }));
        } else if (tab === 'search') {
            const allItems = [
                ...state.sectionCache.movies,
                ...state.sectionCache.live,
                ...state.sectionCache.series
            ];
            const q = state.searchQuery.trim().toLowerCase();
            const filtered = q
                ? allItems.filter(it =>
                    it.name.toLowerCase().includes(q) ||
                    (it.group && it.group.toLowerCase().includes(q)))
                : allItems.slice(0, 30);

            dom.searchCountBadge.textContent = `${filtered.length} resultados`;

            const searchMovies = filtered.filter(i => i.section === 'movies').slice(0, MAX_CARDS_PER_ROW);
            const searchSeries = filtered.filter(i => i.section === 'series').slice(0, MAX_CARDS_PER_ROW);
            const searchLive = filtered.filter(i => i.section === 'live').slice(0, MAX_CARDS_PER_ROW);

            if (searchMovies.length > 0) categories.push({ kicker: 'RESULTADOS', title: 'Filmes Encontrados', items: searchMovies });
            if (searchSeries.length > 0) categories.push({ kicker: 'RESULTADOS', title: 'Séries Encontradas', items: searchSeries });
            if (searchLive.length > 0) categories.push({ kicker: 'RESULTADOS', title: 'Canais Ao Vivo Encontrados', items: searchLive });
        }

        state.categories = categories;
        if (!preserveFocus) {
            state.colIndices = categories.map(() => 0);
            state.rowIndex = 0;
        } else {
            state.colIndices = categories.map((_, i) => state.colIndices[i] || 0);
            state.rowIndex = clamp(state.rowIndex, 0, Math.max(0, categories.length - 1));
        }

        renderCategoryJumpBar();
        renderCatalogRows();
        applyVisualFocus();
    }

    function groupItemsByCategory(items, maxCategories = 50) {
        const map = new Map();
        for (let i = 0; i < items.length; i++) {
            const ch = items[i];
            const gName = ch.group || 'Geral';
            if (!map.has(gName)) map.set(gName, []);
            const arr = map.get(gName);
            if (arr.length < MAX_CARDS_PER_ROW) arr.push(ch);
        }

        const result = [];
        map.forEach((groupItems, title) => {
            if (groupItems.length > 0 && result.length < maxCategories) {
                result.push({ title, items: groupItems });
            }
        });
        return result;
    }

    function getInitials(name) {
        if (!name) return 'TV';
        const words = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    /**
     * Renderiza as fileiras e cards com barra real de tempo assistido, EPG atual e número de qualidades/episódios
     */
    function renderCatalogRows() {
        dom.rowsWrapper.innerHTML = '';

        if (state.categories.length === 0) {
            dom.rowsWrapper.innerHTML = `
                <div style="padding: 40px 56px; color: #9ca3af; font-size: 18px;">
                    Nenhum item encontrado nesta seção. Pressione ▲ para navegar no menu superior.
                </div>
            `;
            return;
        }

        state.categories.forEach((cat, rIndex) => {
            const rowEl = document.createElement('section');
            rowEl.className = 'category-row';
            rowEl.dataset.rowIndex = rIndex;

            const isRowAdult = M3UParser.isAdultContent('', cat.title);
            const rowLockBadgeHtml = (isRowAdult && !state.parentalUnlocked)
                ? '<span class="row-lock-pill">🔒 PIN PARENTAL +18</span>'
                : '';

            const headerEl = document.createElement('div');
            headerEl.className = 'row-header';
            headerEl.innerHTML = `
                <div class="row-kicker">${escapeHtml(cat.kicker || 'CATÁLOGO')}</div>
                <div class="row-title-wrap">
                    <h2 class="row-title">${escapeHtml(cat.title)}</h2>
                    <span class="row-count">${cat.items.length}</span>
                    ${rowLockBadgeHtml}
                </div>
            `;

            const viewportEl = document.createElement('div');
            viewportEl.className = 'row-viewport';

            const trackEl = document.createElement('div');
            trackEl.className = 'row-track';
            trackEl.id = `row-track-${rIndex}`;

            cat.items.forEach((channel, cIndex) => {
                const isLiveCard = channel.section === 'live';
                const locked = isChannelLockedByParental(channel);

                const cardEl = document.createElement('article');
                cardEl.className = `channel-card ${isLiveCard ? 'card-live' : 'card-poster'} ${locked ? 'adult-locked' : ''}`;
                cardEl.id = `card-${rIndex}-${cIndex}`;

                const favStarHtml = isFavorite(channel) ? '<span class="card-fav-star">★</span>' : '<span class="card-fav-star"></span>';
                const initials = getInitials(channel.name);
                const isAdultItem = Boolean(channel.isAdult) || M3UParser.isAdultContent(channel.name, channel.group);

                let sectionTag = 'AO VIVO';
                if (isAdultItem) {
                    sectionTag = '🔞 +18';
                } else if (channel.isSeriesGroup || channel.section === 'series') {
                    const sCount = channel.seasons ? Object.keys(channel.seasons).length : 0;
                    sectionTag = sCount > 0 ? `SÉRIE • ${sCount}T` : 'SÉRIE';
                } else if (channel.section === 'movies') {
                    sectionTag = 'FILME';
                } else if (channel.variants && channel.variants.length > 1) {
                    sectionTag = `${channel.variants.length} FONTES`;
                }

                // Progresso real salvo no localStorage ou progresso EPG ao vivo
                let epgSubHtml = '';
                const savedPos = getSavedProgress(channel);
                let progressPercent = savedPos ? savedPos.pct : (((cIndex * 19 + 25) % 70) + 12);

                if (isLiveCard && !locked) {
                    const epg = M3UParser.getChannelEPG(channel, state.epgData);
                    if (epg && epg.now) {
                        epgSubHtml = `<div class="card-epg-subtitle">Agora: ${escapeHtml(epg.now.title)}</div>`;
                        progressPercent = epg.now.progress || progressPercent;
                    }
                } else if (savedPos && savedPos.time > 10 && !locked) {
                    epgSubHtml = `<div class="card-epg-subtitle">Parou em ${formatSecondsToClock(savedPos.time)}</div>`;
                }

                const lockOverlayHtml = locked
                    ? `<div class="card-lock-overlay">
                           <span class="lock-big-icon">🔒</span>
                           <span>CONTEÚDO +18</span>
                       </div>`
                    : '';

                const mediaHtml = channel.logo
                    ? `<img class="card-poster-img" loading="lazy" src="${escapeHtml(channel.logo)}" alt="${escapeHtml(channel.name)}"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div class="card-fallback-art" style="display:none;">
                           <div class="card-Avatar">${initials}</div>
                       </div>`
                    : `<div class="card-fallback-art">
                           <div class="card-Avatar">${initials}</div>
                       </div>`;

                const displayTitle = locked ? 'Conteúdo Protegido (+18)' : channel.name;

                cardEl.innerHTML = `
                    <div class="card-top-badges">
                        <span class="card-pill-tag ${isAdultItem ? 'tag-adult' : ''}">${sectionTag}</span>
                        ${favStarHtml}
                    </div>
                    ${mediaHtml}
                    ${lockOverlayHtml}
                    <div class="card-footer-bar">
                        <div class="card-progress-track">
                            <div class="card-progress-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                        <div class="card-title">${escapeHtml(displayTitle)}</div>
                        ${epgSubHtml}
                    </div>
                `;

                cardEl.addEventListener('click', () => {
                    state.mode = 'catalog';
                    state.rowIndex = rIndex;
                    state.colIndices[rIndex] = cIndex;
                    applyVisualFocus();
                    activateSelectedChannelOrShow(channel);
                });

                trackEl.appendChild(cardEl);
            });

            viewportEl.appendChild(trackEl);
            rowEl.appendChild(headerEl);
            rowEl.appendChild(viewportEl);
            dom.rowsWrapper.appendChild(rowEl);
        });
    }

    /**
     * Decide se abre o seletor de Temporadas/Episódios (para Séries) ou o Player direto (com checagem Parental)
     */
    function activateSelectedChannelOrShow(channel) {
        if (!channel) return;
        if (isChannelLockedByParental(channel)) {
            openPinModal('unlock', () => activateSelectedChannelOrShow(channel));
            return;
        }
        if (channel.isSeriesGroup || channel.section === 'series') {
            openSeriesModal(channel);
            return;
        }
        openPlayer(channel);
    }

    /**
     * Atualiza classes .focused em todas as zonas navegáveis
     */
    function applyVisualFocus() {
        document.querySelectorAll('.focused').forEach(el => el.classList.remove('focused'));
        if (dom.searchBoxWrapper) dom.searchBoxWrapper.classList.remove('focused-within');

        if (state.mode === 'topbar') {
            dom.searchInput.blur();
            const tabBtn = dom.navTabs[state.topBarIndex] || dom.navTabs[0];
            tabBtn.classList.add('focused');
            return;
        }

        if (state.mode === 'osk') {
            dom.searchBoxWrapper.classList.add('focused-within');
            const oskBtns = Array.from(dom.onscreenKeyboard.querySelectorAll('.osk-key'));
            const activeKey = oskBtns[state.oskIndex] || oskBtns[0];
            if (activeKey) activeKey.classList.add('focused');
            return;
        }

        if (state.mode === 'catjump') {
            const pills = Array.from(dom.categoryJumpBar.querySelectorAll('.cat-pill'));
            const activePill = pills[state.catJumpIndex] || pills[0];
            if (activePill) activePill.classList.add('focused');
            return;
        }

        if (state.mode === 'hero') {
            dom.searchInput.blur();
            const heroBtns = [dom.btnHeroPlay, dom.btnHeroSecondary];
            const activeHeroBtn = heroBtns[state.heroBtnIndex] || dom.btnHeroPlay;
            activeHeroBtn.classList.add('focused');
            return;
        }

        if (state.mode === 'series') {
            const seasonPills = Array.from(dom.seriesSeasonsBar.querySelectorAll('.season-pill'));
            const epBtns = Array.from(dom.seriesEpisodesList.querySelectorAll('.episode-row-btn'));

            if (state.seriesZone === 'seasons') {
                const sBtn = seasonPills[state.seriesSeasonIdx] || seasonPills[0];
                if (sBtn) sBtn.classList.add('focused');
            } else if (state.seriesZone === 'episodes') {
                const eBtn = epBtns[state.seriesEpisodeIdx] || epBtns[0];
                if (eBtn) {
                    eBtn.classList.add('focused');
                    eBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            } else if (state.seriesZone === 'fav') {
                dom.btnSeriesFav.classList.add('focused');
            } else {
                dom.btnSeriesClose.classList.add('focused');
            }
            return;
        }

        if (state.mode === 'modal') {
            const modalControls = getModalControls();
            state.modalIndex = clamp(state.modalIndex, 0, Math.max(0, modalControls.length - 1));
            const activeCtrl = modalControls[state.modalIndex] || modalControls[0];
            if (activeCtrl) {
                activeCtrl.classList.add('focused');
                if (activeCtrl.tagName === 'INPUT' || activeCtrl.tagName === 'TEXTAREA') {
                    activeCtrl.focus();
                } else {
                    if (dom.inputM3uUrl) dom.inputM3uUrl.blur();
                    if (dom.inputEpgUrl) dom.inputEpgUrl.blur();
                    if (dom.inputM3uRaw) dom.inputM3uRaw.blur();
                    if (dom.inputGithubRepo) dom.inputGithubRepo.blur();
                }
            }
            return;
        }

        if (state.mode === 'pin') {
            const keyEl = dom.pinKeys[state.pinKeypadIndex] || dom.pinKeys[0];
            keyEl.classList.add('focused');
            return;
        }

        if (state.mode === 'epg') {
            const epgBtns = getEpgModalButtons();
            const activeBtn = epgBtns[state.epgModalIndex] || epgBtns[0];
            activeBtn.classList.add('focused');
            return;
        }

        if (state.mode === 'player_drawer') {
            const drawerItems = Array.from(dom.drawerChannelList.querySelectorAll('.drawer-ch-item'));
            const activeItem = drawerItems[state.drawerIndex] || drawerItems[0];
            if (activeItem) {
                activeItem.classList.add('focused');
                activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
            return;
        }

        if (state.mode === 'player') {
            if (state.playerHudZone === 'timeline' && !dom.playerTimelineRow.classList.contains('hidden')) {
                dom.playerTimelineRow.classList.add('focused');
            } else {
                const btns = getVisiblePlayerControlButtons();
                state.playerCtrlIdx = clamp(state.playerCtrlIdx, 0, Math.max(0, btns.length - 1));
                const activeBtn = btns[state.playerCtrlIdx];
                if (activeBtn) activeBtn.classList.add('focused');
            }
            return;
        }

        if (state.mode === 'catalog') {
            dom.searchInput.blur();
            if (state.categories.length === 0) return;

            const r = clamp(state.rowIndex, 0, state.categories.length - 1);
            state.rowIndex = r;

            // Atualiza pílula ativa na barra de categorias
            const pills = Array.from(dom.categoryJumpBar.querySelectorAll('.cat-pill'));
            pills.forEach((p, idx) => p.classList.toggle('active', idx === r));

            const items = state.categories[r].items;
            const c = clamp(state.colIndices[r] || 0, 0, items.length - 1);
            state.colIndices[r] = c;

            const cardEl = document.getElementById(`card-${r}-${c}`);
            if (cardEl) cardEl.classList.add('focused');

            const focusedChannel = items[c];
            state.activeChannel = focusedChannel;
            updateHeroBanner(focusedChannel, c);
            scrollCatalogToActiveItem(r, c);
        }
    }

    function updateHeroBanner(channel, colIdx = 0) {
        if (!channel) return;

        const locked = isChannelLockedByParental(channel);
        const isAdult = Boolean(channel.isAdult) || M3UParser.isAdultContent(channel.name, channel.group);
        const savedPos = getSavedProgress(channel);

        const sectionKicker = channel.section === 'movies'
            ? 'FILME EM DESTAQUE'
            : (channel.section === 'series' ? 'SÉRIE EM DESTAQUE' : 'CANAL EM DESTAQUE');

        dom.heroKickerText.textContent = sectionKicker;
        dom.heroTitle.textContent = locked ? '🔒 Conteúdo Restrito (+18)' : channel.name;
        dom.heroMetaLine.textContent = locked
            ? 'Controle de Pais Ativo · Pressione Enter e digite o PIN para liberar'
            : (channel.badge || '2025 • HD').replace(/•/g, '·');

        const fav = isFavorite(channel);
        dom.heroFavPill.classList.toggle('hidden', !fav);
        dom.heroAdultPill.classList.toggle('hidden', !isAdult);
        dom.heroResumePill.classList.toggle('hidden', !(savedPos && savedPos.time > 10 && !locked));

        // Texto dinâmico do botão principal do Hero
        if (channel.isSeriesGroup || channel.section === 'series') {
            dom.heroPlayBtnText.innerHTML = 'Ver Temporadas<br>& Episódios';
        } else if (savedPos && savedPos.time > 10 && !locked) {
            dom.heroPlayBtnText.innerHTML = `Retomar de<br>${formatSecondsToClock(savedPos.time)}`;
        } else {
            dom.heroPlayBtnText.innerHTML = 'Assistir<br>agora';
        }

        if (channel.section === 'live' && !locked) {
            const epg = M3UParser.getChannelEPG(channel, state.epgData);
            if (epg && epg.now) {
                dom.heroEpgStrip.classList.remove('hidden');
                dom.heroEpgNowTitle.textContent = epg.now.title;
                dom.heroEpgNowTime.textContent = epg.now.timeRange;
                dom.heroEpgBarFill.style.width = `${epg.now.progress || 40}%`;
                dom.heroEpgNextTitle.textContent = epg.next ? `${epg.next.title} (${epg.next.timeRange})` : 'Grade contínua';
                dom.heroSynopsis.textContent = epg.now.desc || channel.synopsis;
            } else {
                dom.heroEpgStrip.classList.add('hidden');
                dom.heroSynopsis.textContent = channel.synopsis;
            }
            dom.heroSecIcon.textContent = '📅';
            dom.heroSecBtnText.innerHTML = 'Ver Guia EPG<br>& Favoritos';
        } else {
            dom.heroEpgStrip.classList.add('hidden');
            dom.heroSynopsis.textContent = locked
                ? 'Este título pertence a uma categoria restrita para maiores de 18 anos. Insira o PIN de 4 dígitos do Controle de Pais para desbloquear a visualização.'
                : channel.synopsis;
            dom.heroSecIcon.textContent = '★';
            dom.heroSecBtnText.innerHTML = fav ? 'Remover dos<br>Favoritos' : 'Adicionar aos<br>Favoritos';
        }

        if (channel.backdropGradient) {
            dom.heroBackdrop.style.background = channel.backdropGradient;
        }

        const heroBgImage = channel.backdrop || channel.logo;
        if (heroBgImage) {
            dom.heroBackdropImage.style.backgroundImage = `url("${heroBgImage}")`;
            dom.heroBackdropImage.classList.toggle('blurred-adult', locked);
        } else {
            dom.heroBackdropImage.style.backgroundImage = 'none';
            dom.heroBackdropImage.classList.remove('blurred-adult');
        }

        const activeDot = colIdx % dom.heroDots.length;
        dom.heroDots.forEach((dot, idx) => dot.classList.toggle('active', idx === activeDot));
    }

    function scrollCatalogToActiveItem(rowIndex, colIndex) {
        const rowElements = dom.rowsWrapper.querySelectorAll('.category-row');
        const activeRowEl = rowElements[rowIndex];
        if (activeRowEl) {
            const verticalOffset = Math.max(0, activeRowEl.offsetTop - 6);
            dom.rowsWrapper.style.transform = `translate3d(0, -${verticalOffset}px, 0)`;
        }

        const trackEl = document.getElementById(`row-track-${rowIndex}`);
        if (trackEl && state.categories[rowIndex]) {
            const firstItem = state.categories[rowIndex].items[0];
            const cardWidth = (firstItem && firstItem.section === 'live') ? 258 : 192;
            const cardTotalWidth = cardWidth + 20;
            const viewportWidth = window.innerWidth - 112;
            const visibleCardsCount = Math.max(1, Math.floor(viewportWidth / cardTotalWidth));

            let firstVisibleCol = 0;
            if (colIndex >= visibleCardsCount - 1) {
                firstVisibleCol = colIndex - (visibleCardsCount - 2);
            }
            const maxCol = state.categories[rowIndex].items.length;
            const maxOffsetCols = Math.max(0, maxCol - visibleCardsCount);
            firstVisibleCol = clamp(firstVisibleCol, 0, maxOffsetCols);

            const horizontalOffset = firstVisibleCol * cardTotalWidth;
            trackEl.style.transform = `translate3d(-${horizontalOffset}px, 0, 0)`;
        }
    }

    function showSectionLoading(msg) {
        dom.sectionLoadingText.textContent = msg || 'Carregando...';
        dom.sectionLoading.classList.remove('hidden');
    }

    function hideSectionLoading() {
        dom.sectionLoading.classList.add('hidden');
    }

    /**
     * ========================================================================
     * 7. MOTOR DE REPRODUÇÃO DE VÍDEO COMPLETO (ESTILO NETFLIX):
     *    - Play/Pause (Enter ou tecla ⏯ do controle)
     *    - Barra de Progresso Interativa (Scrubber) + Avançar/Retroceder (-15s/+15s)
     *    - Seletor de Proporção da Tela (Original / 16:9 Cheia / Zoom / Cinema 21:9)
     *    - Seletor de Legendas Embutidas (HLS / TextTracks / Off)
     *    - Botão Próximo Episódio (para Séries) e Reiniciar do Início
     *    - Zapping Rápido (▲/▼ em Canais Ao Vivo), Gaveta Lateral de Canais e Fontes
     * ========================================================================
     */
    function openPlayer(channel, variantIndex = 0) {
        if (!channel || !channel.url) return;

        addToContinueWatching(channel);
        const isVod = channel.section !== 'live';

        state.mode = 'player';
        state.activeChannel = channel;
        state.activeVariantIdx = variantIndex;
        state.playerHudZone = isVod ? 'timeline' : 'buttons';
        state.playerCtrlIdx = 0;
        dom.playerChannelDrawer.classList.add('hidden');
        dom.playerSubtitleBox.classList.add('hidden');

        const variants = (channel.variants && channel.variants.length > 0)
            ? channel.variants
            : [{ label: 'PADRÃO', url: channel.url }];

        const chosenVariant = variants[clamp(variantIndex, 0, variants.length - 1)] || variants[0];
        const streamUrl = chosenVariant.url;

        dom.playerTypeText.textContent =
            channel.section === 'movies' ? 'FILME VOD' : (channel.section === 'series' ? 'SÉRIE VOD' : 'AO VIVO');

        if (channel.section === 'series' && channel.season && channel.episode) {
            dom.playerChannelName.textContent = channel.seriesTitle || channel.name;
            dom.playerChannelGroup.textContent = `T${channel.season}:E${channel.episode} "${channel.group || 'Episódio'}"`;
        } else {
            dom.playerChannelName.textContent = channel.name;
            dom.playerChannelGroup.textContent = channel.group || ' Catálogo';
        }

        dom.playerBufferStatus.textContent = 'Conectando ao servidor de mídia...';
        dom.playerResolutionInfo.textContent = chosenVariant.label || 'AUTO HD';

        hideScrubbingPreviewStrip();

        // Configura visibilidade dos controles conforme tipo (VOD vs Ao Vivo)
        dom.playerTimelineRow.classList.toggle('hidden', !isVod);
        if (dom.pbtnRestart) dom.pbtnRestart.classList.toggle('hidden', !isVod);

        const nextEp = getNextEpisodeForCurrentChannel();
        dom.pbtnNextEp.classList.toggle('hidden', !nextEp);

        dom.pbtnDrawerLabel.textContent = 'Outros...';
        dom.pbtnQualityLabel.textContent = variants.length > 1
            ? `⚙ ${state.activeVariantIdx + 1}/${variants.length}`
            : '⚙';

        applyAspectRatioToVideo();
        updatePlayPauseButtonUI(false);
        updateSubtitlesButtonUI();

        renderPlayerVariantChips(variants, state.activeVariantIdx);

        if (channel.section === 'live') {
            const epg = M3UParser.getChannelEPG(channel, state.epgData);
            if (epg && epg.now) {
                dom.playerEpgInfo.classList.remove('hidden');
                dom.playerEpgNow.textContent = `Agora: ${epg.now.title} (${epg.now.timeRange})`;
                dom.playerEpgNext.textContent = epg.next ? `A seguir: ${epg.next.title}` : '';
            } else {
                dom.playerEpgInfo.classList.add('hidden');
            }
        } else {
            const savedPos = state.playbackPositions[streamUrl];
            if (savedPos && savedPos.time > 10) {
                dom.playerEpgInfo.classList.remove('hidden');
                dom.playerEpgNow.textContent = `⏱ Retomando automaticamente de ${formatSecondsToClock(savedPos.time)}`;
                dom.playerEpgNext.textContent = '';
            } else {
                dom.playerEpgInfo.classList.add('hidden');
            }
        }

        dom.playerScreen.classList.remove('hidden');
        dom.playerScreen.setAttribute('aria-hidden', 'false');
        showPlayerSpinner(`Carregando ${chosenVariant.label || 'stream'}...`);
        triggerPlayerOverlay();
        applyVisualFocus();

        destroyHlsInstance();
        clearInterval(state.positionSaveInterval);

        const video = dom.videoElement;
        const isDirectMp4 = /\.(mp4|mkv|webm|mov)(\?.*)?$/i.test(streamUrl) || /\/(movie|series)\//i.test(streamUrl);

        if (isDirectMp4) {
            fallbackToNativeVideo(video, streamUrl, isVod);
        } else if (window.Hls && window.Hls.isSupported()) {
            dom.playerEngineTag.textContent = 'HLS.JS ENGINE';
            const hls = new window.Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 60,
                renderTextTracksNatively: true
            });
            state.hlsInstance = hls;

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(window.Hls.Events.MANIFEST_PARSED, (_, data) => {
                hidePlayerSpinner();
                dom.playerBufferStatus.textContent = 'Reproduzindo (Estável)';
                if (data && data.levels && data.levels.length > 0) {
                    const bestLevel = data.levels[data.levels.length - 1];
                    if (bestLevel.height) {
                        dom.playerResolutionInfo.textContent = `${bestLevel.height}P • ${chosenVariant.label}`;
                    }
                }
                applyResumeIfVod(video, streamUrl, isVod);
                safePlayVideo(video);
                updateSubtitlesButtonUI();
            });

            hls.on(window.Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
                updateSubtitlesButtonUI();
            });

            hls.on(window.Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case window.Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case window.Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            fallbackToNativeVideo(video, streamUrl, isVod);
                            break;
                    }
                }
            });
        } else {
            fallbackToNativeVideo(video, streamUrl, isVod);
        }

        // Atualiza barra de tempo e salva progresso
        video.ontimeupdate = () => {
            updatePlayerTimelineUI();
        };

        video.onplay = () => {
            updatePlayPauseButtonUI(false);
        };

        video.onpause = () => {
            updatePlayPauseButtonUI(true);
        };

        video.onended = () => {
            const nextEpisode = getNextEpisodeForCurrentChannel();
            if (nextEpisode) {
                showPlayerActionToast('⏭', `Iniciando Próx. Episódio: EP ${String(nextEpisode.episode).padStart(2, '0')}`);
                setTimeout(() => openPlayer(nextEpisode, 0), 1200);
            }
        };

        if (isVod) {
            state.positionSaveInterval = setInterval(() => {
                if (!video.paused && video.currentTime > 5) {
                    savePlaybackProgress(streamUrl, video.currentTime, video.duration);
                }
            }, 5000);
        }

        video.onwaiting = () => {
            dom.playerBufferStatus.textContent = 'Armazenando em buffer...';
            showPlayerSpinner('Sincronizando buffer...');
            triggerPlayerOverlay();
        };

        video.onplaying = () => {
            hidePlayerSpinner();
            dom.playerBufferStatus.textContent = 'Reprodução Ativa • Buffer OK';
            updatePlayPauseButtonUI(false);
            updateSubtitlesButtonUI();
        };

        video.onerror = () => {
            dom.playerBufferStatus.textContent = 'Fonte indisponível no momento';
            showPlayerSpinner('Sinal indisponível. Use o botão Fonte/Qualidade ou Voltar.');
            triggerPlayerOverlay();
        };
    }

    function getVisiblePlayerControlButtons() {
        if (!dom.playerControlsBar) return [];
        return Array.from(dom.playerControlsBar.querySelectorAll('.player-ctrl-btn'))
            .filter(btn => !btn.classList.contains('hidden'));
    }

    function showPlayerActionToast(icon, text) {
        if (!dom.playerActionToast) return;
        dom.playerToastIcon.textContent = icon || '▶';
        dom.playerToastText.textContent = text || '';
        dom.playerActionToast.classList.remove('hidden');
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => {
            dom.playerActionToast.classList.add('hidden');
        }, 1800);
    }

    function updatePlayPauseButtonUI(isPaused) {
        if (!dom.pbtnPlayPauseIcon || !dom.pbtnPlayPauseLabel) return;
        if (isPaused) {
            dom.pbtnPlayPauseIcon.textContent = '▶';
            dom.pbtnPlayPauseLabel.textContent = 'Reproduzir';
        } else {
            dom.pbtnPlayPauseIcon.textContent = '⏸';
            dom.pbtnPlayPauseLabel.textContent = 'Pausar';
        }
    }

    let scrubHideTimer = null;

    function showScrubbingPreviewStrip(centerSeconds, durationSeconds) {
        const strip = document.getElementById('player-scrub-strip');
        if (!strip || !dom.playerOverlay) return;

        dom.playerOverlay.classList.add('scrubbing-mode');
        strip.classList.remove('hidden');

        const logoUrl = (state.activeChannel && state.activeChannel.logo) ? state.activeChannel.logo : '';
        const offsets = [-20, -10, 0, 10, 20];
        const bgPositions = ['15% 35%', '32% 45%', '50% 50%', '68% 55%', '85% 65%'];

        offsets.forEach((offset, idx) => {
            const t = (durationSeconds && isFinite(durationSeconds) && durationSeconds > 0)
                ? clamp(centerSeconds + offset, 0, durationSeconds)
                : Math.max(0, centerSeconds + offset);

            const timeEl = document.getElementById(`scrub-time-${idx}`);
            if (timeEl) timeEl.textContent = formatSecondsToClock(t);

            const artEl = document.getElementById(`scrub-art-${idx}`);
            if (artEl) {
                if (logoUrl) {
                    artEl.style.backgroundImage = `url("${logoUrl.replace(/"/g, '\\"')}")`;
                    artEl.style.backgroundPosition = bgPositions[idx];
                } else {
                    artEl.style.backgroundImage = 'linear-gradient(135deg, #1e293b, #0f172a)';
                }
            }
        });

        // Tenta desenhar o quadro real do vídeo no card central destacado
        try {
            const canvas = document.getElementById('scrub-center-canvas');
            const video = dom.videoElement;
            if (canvas && video && video.readyState >= 2) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                }
            }
        } catch (_) {}

        clearTimeout(scrubHideTimer);
        scrubHideTimer = setTimeout(() => {
            hideScrubbingPreviewStrip();
        }, 2400);
    }

    function hideScrubbingPreviewStrip() {
        clearTimeout(scrubHideTimer);
        const strip = document.getElementById('player-scrub-strip');
        if (strip) strip.classList.add('hidden');
        if (dom.playerOverlay) dom.playerOverlay.classList.remove('scrubbing-mode');
    }

    function togglePlayPause() {
        const video = dom.videoElement;
        if (!video) return;
        hideScrubbingPreviewStrip();
        if (video.paused) {
            safePlayVideo(video);
            updatePlayPauseButtonUI(false);
        } else {
            video.pause();
            updatePlayPauseButtonUI(true);
        }
        triggerPlayerOverlay();
    }

    function seekVideoBy(deltaSeconds) {
        const video = dom.videoElement;
        if (!video || !state.activeChannel || state.activeChannel.section === 'live') return;

        const dur = video.duration;
        const cur = video.currentTime || 0;
        const target = (dur && isFinite(dur) && dur > 0)
            ? clamp(cur + deltaSeconds, 0, Math.max(0, dur - 2))
            : Math.max(0, cur + deltaSeconds);

        try {
            video.currentTime = target;
        } catch (_) {}

        updatePlayerTimelineUI();
        showScrubbingPreviewStrip(target, dur);
        triggerPlayerOverlay();
    }

    function restartVideoFromBeginning() {
        const video = dom.videoElement;
        if (!video) return;
        try {
            video.currentTime = 0;
            safePlayVideo(video);
        } catch (_) {}
        updatePlayerTimelineUI();
        showPlayerActionToast('⏮', 'Reiniciado do início (00:00)');
        triggerPlayerOverlay();
    }

    function updatePlayerTimelineUI() {
        const video = dom.videoElement;
        if (!video || !dom.playerTimelineRow || dom.playerTimelineRow.classList.contains('hidden')) return;

        const cur = Math.max(0, video.currentTime || 0);
        const dur = (video.duration && isFinite(video.duration) && video.duration > 0) ? video.duration : 0;

        dom.playerTimeCurrent.textContent = formatSecondsToClock(cur);
        dom.playerTimeDuration.textContent = dur > 0 ? formatSecondsToClock(dur) : '--:--';

        const pct = dur > 0 ? clamp((cur / dur) * 100, 0, 100) : 0;
        dom.playerSeekbarFill.style.width = `${pct}%`;

        if (video.buffered && video.buffered.length > 0 && dur > 0) {
            const bufEnd = video.buffered.end(video.buffered.length - 1);
            const bufPct = clamp((bufEnd / dur) * 100, 0, 100);
            dom.playerSeekbarBuffer.style.width = `${bufPct}%`;
        }
    }

    function applyAspectRatioToVideo() {
        const video = dom.videoElement;
        if (!video) return;
        ASPECT_MODES.forEach(m => video.classList.remove(m.id));
        const mode = ASPECT_MODES[state.aspectModeIdx] || ASPECT_MODES[0];
        video.classList.add(mode.id);
        if (dom.pbtnAspectLabel) dom.pbtnAspectLabel.textContent = `Tela: ${mode.label}`;
        if (dom.playerAspectBadge) dom.playerAspectBadge.textContent = `TELA: ${mode.label.toUpperCase()}`;
    }

    function cycleAspectRatio() {
        state.aspectModeIdx = (state.aspectModeIdx + 1) % ASPECT_MODES.length;
        applyAspectRatioToVideo();
        const mode = ASPECT_MODES[state.aspectModeIdx];
        showPlayerActionToast('📐', `Proporção: ${mode.label}`);
        triggerPlayerOverlay();
    }

    function getAvailableSubtitleTracks() {
        const tracks = [];
        const video = dom.videoElement;

        if (state.hlsInstance && state.hlsInstance.subtitleTracks && state.hlsInstance.subtitleTracks.length > 0) {
            state.hlsInstance.subtitleTracks.forEach((t, idx) => {
                tracks.push({
                    type: 'hls',
                    index: idx,
                    label: t.name || t.lang || `Legenda ${idx + 1}`
                });
            });
        } else if (video && video.textTracks && video.textTracks.length > 0) {
            for (let i = 0; i < video.textTracks.length; i++) {
                const tt = video.textTracks[i];
                tracks.push({
                    type: 'native',
                    index: i,
                    label: tt.label || tt.language || `Faixa ${i + 1}`
                });
            }
        }
        return tracks;
    }

    function updateSubtitlesButtonUI() {
        const tracks = getAvailableSubtitleTracks();
        if (tracks.length === 0) {
            const isLegChannel = state.activeChannel && /\[LEG\]|legendado/i.test(state.activeChannel.name || '');
            const statusText = isLegChannel ? '✓ Original com legendas' : '✓ Português';
            if (dom.pbtnSubtitlesLabel) dom.pbtnSubtitlesLabel.textContent = statusText;
            if (dom.playerSubBadge) dom.playerSubBadge.textContent = statusText.toUpperCase();
            return;
        }

        if (state.subtitleTrackIdx < 0 || state.subtitleTrackIdx >= tracks.length) {
            if (dom.pbtnSubtitlesLabel) dom.pbtnSubtitlesLabel.textContent = 'Português (Sem Legenda)';
            if (dom.playerSubBadge) dom.playerSubBadge.textContent = 'LEGENDA: OFF';
        } else {
            const activeTrack = tracks[state.subtitleTrackIdx];
            if (dom.pbtnSubtitlesLabel) dom.pbtnSubtitlesLabel.textContent = `✓ ${activeTrack.label} com legendas`;
            if (dom.playerSubBadge) dom.playerSubBadge.textContent = `LEGENDA: ${activeTrack.label.toUpperCase()}`;
        }
    }

    function cycleSubtitles() {
        const tracks = getAvailableSubtitleTracks();
        const video = dom.videoElement;

        if (tracks.length === 0) {
            const isLeg = state.activeChannel && /\[LEG\]|legendado/i.test(state.activeChannel.name || '');
            showPlayerActionToast(
                '💬',
                isLeg ? 'Legenda já gravada na imagem deste título' : 'Título dublado (sem faixa extra de legenda)'
            );
            triggerPlayerOverlay();
            return;
        }

        state.subtitleTrackIdx++;
        if (state.subtitleTrackIdx >= tracks.length) {
            state.subtitleTrackIdx = -1;
        }

        if (state.hlsInstance && state.hlsInstance.subtitleTracks) {
            state.hlsInstance.subtitleTrack = state.subtitleTrackIdx;
        }
        if (video && video.textTracks) {
            for (let i = 0; i < video.textTracks.length; i++) {
                video.textTracks[i].mode = (i === state.subtitleTrackIdx) ? 'showing' : 'disabled';
            }
        }

        updateSubtitlesButtonUI();
        if (state.subtitleTrackIdx === -1) {
            dom.playerSubtitleBox.classList.add('hidden');
            showPlayerActionToast('💬', 'Legendas Desativadas');
        } else {
            const chosen = tracks[state.subtitleTrackIdx];
            showPlayerActionToast('💬', `Legenda Ativada: ${chosen.label}`);
        }
        triggerPlayerOverlay();
    }

    function getNextEpisodeForCurrentChannel() {
        const ch = state.activeChannel;
        const show = state.activeSeriesShow;
        if (!ch || !show || !show.seasons || ch.section !== 'series') return null;

        const seasonNum = ch.season;
        const epNum = ch.episode;
        if (!seasonNum || !epNum) return null;

        const seasonEps = show.seasons[seasonNum] || [];
        const currentIdx = seasonEps.findIndex(e => e.episode === epNum);
        if (currentIdx !== -1 && currentIdx + 1 < seasonEps.length) {
            return seasonEps[currentIdx + 1];
        }
        const nextSeasonEps = show.seasons[seasonNum + 1];
        if (nextSeasonEps && nextSeasonEps.length > 0) {
            return nextSeasonEps[0];
        }
        return null;
    }

    function playNextSeriesEpisode() {
        const nextEp = getNextEpisodeForCurrentChannel();
        if (!nextEp) {
            showPlayerActionToast('ℹ️', 'Último episódio disponível da temporada');
            return;
        }
        showPlayerActionToast('⏭', `Carregando EP ${String(nextEp.episode).padStart(2, '0')}...`);
        openPlayer(nextEp, 0);
    }

    function executePlayerControlAction(action) {
        switch (action) {
            case 'playpause':
                togglePlayPause();
                break;
            case 'rewind':
                seekVideoBy(-15);
                break;
            case 'forward':
                seekVideoBy(15);
                break;
            case 'restart':
                restartVideoFromBeginning();
                break;
            case 'nextep':
                playNextSeriesEpisode();
                break;
            case 'subtitles':
                cycleSubtitles();
                break;
            case 'aspect':
                cycleAspectRatio();
                break;
            case 'quality':
                cycleChannelQualityVariant();
                break;
            case 'drawer':
                openPlayerChannelDrawer();
                break;
            default:
                break;
        }
    }

    function applyResumeIfVod(video, streamUrl, isVod) {
        if (!isVod) return;
        const saved = state.playbackPositions[streamUrl];
        if (saved && saved.time > 10) {
            try {
                video.currentTime = saved.time;
            } catch (_) {}
        }
    }

    function renderPlayerVariantChips(variants, activeIdx) {
        dom.playerVariantsBar.innerHTML = '';
        if (!variants || variants.length <= 1) return;

        variants.forEach((v, idx) => {
            const chip = document.createElement('span');
            chip.className = `variant-chip ${idx === activeIdx ? 'active' : ''}`;
            chip.textContent = v.label;
            dom.playerVariantsBar.appendChild(chip);
        });
    }

    /**
     * Alterna entre as qualidades (4K / FHD / HD / SD) do mesmo canal
     */
    function cycleChannelQualityVariant() {
        const ch = state.activeChannel;
        if (!ch || !ch.variants || ch.variants.length <= 1) {
            showPlayerActionToast('🎚️', 'Fonte única ativa (Melhor qualidade automática)');
            triggerPlayerOverlay();
            return;
        }
        const nextIdx = (state.activeVariantIdx + 1) % ch.variants.length;
        const nextLabel = ch.variants[nextIdx].label || `Fonte ${nextIdx + 1}`;
        showPlayerActionToast('🎚️', `Alternando para ${nextLabel}...`);
        openPlayer(ch, nextIdx);
    }

    /**
     * Zapping: Troca diretamente para o canal anterior ou próximo da categoria atual usando ▲ / ▼ no Player
     */
    function zapChannelInPlayer(delta) {
        if (state.categories.length === 0) return;
        const r = state.rowIndex;
        const items = state.categories[r].items;
        if (!items || items.length <= 1) return;

        let nextCol = (state.colIndices[r] || 0) + delta;
        if (nextCol < 0) nextCol = items.length - 1;
        if (nextCol >= items.length) nextCol = 0;

        const candidate = items[nextCol];
        if (candidate && !isChannelLockedByParental(candidate) && !candidate.isSeriesGroup) {
            state.colIndices[r] = nextCol;
            openPlayer(candidate, 0);
        }
    }

    /**
     * Abre a Gaveta Lateral de Canais (Mini-Lista) pressionando Seta ◄ dentro do Player
     */
    function openPlayerChannelDrawer() {
        if (state.categories.length === 0) return;
        const r = state.rowIndex;
        const cat = state.categories[r];
        if (!cat) return;

        state.mode = 'player_drawer';
        state.drawerIndex = state.colIndices[r] || 0;
        dom.drawerCategoryTitle.textContent = cat.title;
        dom.drawerChannelList.innerHTML = '';

        cat.items.forEach((ch, idx) => {
            const itemEl = document.createElement('div');
            const isPlaying = state.activeChannel && state.activeChannel.name === ch.name;
            itemEl.className = `drawer-ch-item ${isPlaying ? 'playing' : ''}`;
            itemEl.innerHTML = `
                <span>${String(idx + 1).padStart(2, '0')}. ${escapeHtml(ch.name)}</span>
                <span>${isPlaying ? '▶ NO AR' : ''}</span>
            `;
            itemEl.addEventListener('click', () => {
                state.colIndices[r] = idx;
                dom.playerChannelDrawer.classList.add('hidden');
                openPlayer(ch, 0);
            });
            dom.drawerChannelList.appendChild(itemEl);
        });

        dom.playerChannelDrawer.classList.remove('hidden');
        applyVisualFocus();
    }

    function closePlayerChannelDrawer() {
        dom.playerChannelDrawer.classList.add('hidden');
        state.mode = 'player';
        triggerPlayerOverlay();
    }

    function fallbackToNativeVideo(video, streamUrl, isVod) {
        destroyHlsInstance();
        dom.playerEngineTag.textContent = 'NATIVE VIDEO ENGINE';
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', function onLoaded() {
            video.removeEventListener('loadedmetadata', onLoaded);
            hidePlayerSpinner();
            dom.playerBufferStatus.textContent = 'Reprodução Direta Ativa';
            applyResumeIfVod(video, streamUrl, isVod);
            safePlayVideo(video);
        });
        video.load();
    }

    function safePlayVideo(video) {
        const p = video.play();
        if (p !== undefined) {
            p.catch(() => {
                video.muted = false;
                video.play().catch(() => {});
            });
        }
    }

    function destroyHlsInstance() {
        if (state.hlsInstance) {
            try { state.hlsInstance.destroy(); } catch (_) {}
            state.hlsInstance = null;
        }
    }

    function closePlayer() {
        if (state.mode !== 'player' && state.mode !== 'player_drawer') return;
        clearTimeout(state.overlayTimer);
        clearInterval(state.positionSaveInterval);

        const video = dom.videoElement;
        if (state.activeChannel && state.activeChannel.section !== 'live' && video.currentTime > 5) {
            savePlaybackProgress(state.activeChannel.url, video.currentTime, video.duration);
        }

        destroyHlsInstance();
        video.pause();
        video.removeAttribute('src');
        video.load();

        hidePlayerSpinner();
        dom.playerChannelDrawer.classList.add('hidden');
        dom.playerScreen.classList.add('hidden');
        dom.playerScreen.setAttribute('aria-hidden', 'true');

        state.mode = 'catalog';
        buildCategoriesForActiveTab(true);
    }

    function triggerPlayerOverlay() {
        dom.playerOverlay.classList.remove('overlay-hidden');
        applyVisualFocus();
        clearTimeout(state.overlayTimer);
        if (dom.videoElement && dom.videoElement.paused) {
            return; // Enquanto estiver pausado, a barra estilo Netflix permanece fixa na tela
        }
        state.overlayTimer = setTimeout(() => {
            if (state.mode === 'player' && dom.videoElement && !dom.videoElement.paused) {
                dom.playerOverlay.classList.add('overlay-hidden');
            }
        }, 7500);
    }

    function showPlayerSpinner(message) {
        dom.playerSpinnerText.textContent = message || 'Carregando...';
        dom.playerSpinner.classList.remove('hidden');
    }

    function hidePlayerSpinner() {
        dom.playerSpinner.classList.add('hidden');
    }

    /**
     * ========================================================================
     * CENTRAL DE CONFIGURAÇÕES POR ABAS SIMPLES (100% VERTICAL ▲/▼ + ABAS ◄/►)
     * ========================================================================
     */
    const SETTINGS_TABS = ['update', 'playlist', 'parental'];

    function switchSettingsTab(tabIdx) {
        state.settingsTabIdx = clamp(tabIdx, 0, SETTINGS_TABS.length - 1);
        state.modalIndex = 0;

        const activeTabId = SETTINGS_TABS[state.settingsTabIdx];
        document.querySelectorAll('.settings-tab-btn').forEach((btn, idx) => {
            btn.classList.toggle('active', idx === state.settingsTabIdx);
        });

        SETTINGS_TABS.forEach(tabKey => {
            const panel = document.getElementById(`stab-panel-${tabKey}`);
            if (panel) panel.classList.toggle('hidden', tabKey !== activeTabId);
        });

        applyVisualFocus();
    }

    function getModalControls() {
        const activeTabId = SETTINGS_TABS[state.settingsTabIdx] || 'update';
        if (activeTabId === 'update') {
            return [
                dom.btnCheckOta,
                dom.btnRefreshPlaylist,
                dom.btnToggleAutoOta,
                dom.btnResetOta,
                dom.btnCloseModal
            ].filter(Boolean);
        }
        if (activeTabId === 'playlist') {
            return [
                dom.inputM3uUrl,
                dom.inputEpgUrl,
                dom.inputGithubRepo,
                dom.btnSaveM3u,
                dom.btnRestoreDefault,
                dom.btnCloseModal
            ].filter(Boolean);
        }
        return [
            dom.btnChangePin,
            dom.btnLockAdultNow,
            dom.btnCloseModal
        ].filter(Boolean);
    }

    function updateOtaSettingsUI() {
        const activeVer = window.MPKA_ACTIVE_VERSION || window.MPKA_FACTORY_VERSION || '2.4.0';
        const otaSource = window.MPKA_OTA_SOURCE || 'Fábrica (.wgt)';
        if (dom.settingsVersionBadge) {
            dom.settingsVersionBadge.textContent = `Versão v${activeVer}`;
        }
        const topVerPill = document.getElementById('top-version-pill');
        if (topVerPill) {
            topVerPill.textContent = `v${activeVer}`;
        }
        if (dom.settingsOtaBadge) {
            dom.settingsOtaBadge.textContent = otaSource;
        }
        if (dom.inputGithubRepo && document.activeElement !== dom.inputGithubRepo) {
            dom.inputGithubRepo.value = state.githubRepo || 'mp-lavi/mpka-iptv';
        }
        const autoTitle = document.getElementById('autoota-title-text');
        const autoPill = document.getElementById('autoota-pill-badge');
        if (autoTitle) {
            autoTitle.textContent = `Auto-Atualização ao Abrir o App: ${state.otaAutoEnabled ? 'ATIVADO' : 'DESATIVADO'}`;
        }
        if (autoPill) {
            autoPill.textContent = state.otaAutoEnabled ? 'ATIVADO' : 'DESATIVADO';
            autoPill.classList.toggle('badge-green', state.otaAutoEnabled);
        }
    }

    function openSettingsModal() {
        state.mode = 'modal';
        updateOtaSettingsUI();
        switchSettingsTab(0);
        dom.settingsModal.classList.remove('hidden');
        dom.settingsModal.setAttribute('aria-hidden', 'false');
        setModalFeedback(`Use ▲ / ▼ para escolher um botão e OK para confirmar. Use ◄ / ► para alternar entre as 3 abas acima.`, '');
        applyVisualFocus();
    }

    function closeSettingsModal() {
        if (dom.inputM3uUrl) dom.inputM3uUrl.blur();
        if (dom.inputEpgUrl) dom.inputEpgUrl.blur();
        if (dom.inputM3uRaw) dom.inputM3uRaw.blur();
        if (dom.inputGithubRepo) dom.inputGithubRepo.blur();
        dom.settingsModal.classList.add('hidden');
        dom.settingsModal.setAttribute('aria-hidden', 'true');
        state.mode = 'catalog';
        applyVisualFocus();
    }

    function setModalFeedback(message, type) {
        dom.modalFeedback.textContent = message;
        dom.modalFeedback.className = 'modal-feedback';
        if (type) dom.modalFeedback.classList.add(type);
    }

    function resolveGitHubRawCandidates(repoInput) {
        const clean = String(repoInput || '').trim().replace(/\/+$/, '');
        if (!clean) return [];

        // Se já for uma URL raw.githubusercontent.com ou URL customizada direta
        if (/^https?:\/\/raw\.githubusercontent\.com\//i.test(clean)) {
            return [clean];
        }

        // Se for https://github.com/usuario/repositorio
        const ghMatch = clean.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/tree\/([^\/]+))?$/i);
        if (ghMatch) {
            const owner = ghMatch[1];
            const repo = ghMatch[2];
            const branch = ghMatch[3];
            if (branch) {
                return [`https://raw.githubusercontent.com/${owner}/${repo}/${branch}`];
            }
            return [
                `https://raw.githubusercontent.com/${owner}/${repo}/main`,
                `https://raw.githubusercontent.com/${owner}/${repo}/master`
            ];
        }

        // Se for apenas "usuario/repositorio"
        const shortMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
        if (shortMatch) {
            return [
                `https://raw.githubusercontent.com/${shortMatch[1]}/${shortMatch[2]}/main`,
                `https://raw.githubusercontent.com/${shortMatch[1]}/${shortMatch[2]}/master`
            ];
        }

        // Qualquer outra URL HTTP/HTTPS onde os arquivos estejam hospedados
        if (/^https?:\/\//i.test(clean)) {
            return [clean];
        }

        return [];
    }

    async function checkAndApplyGitHubUpdate(isManual = true) {
        if (dom.inputGithubRepo) {
            state.githubRepo = dom.inputGithubRepo.value.trim();
            localStorage.setItem(STORAGE_KEYS.GITHUB_REPO, state.githubRepo);
        }

        const candidates = resolveGitHubRawCandidates(state.githubRepo);
        if (candidates.length === 0) {
            if (isManual) {
                setModalFeedback('Informe o repositório GitHub (ex: seu-usuario/mpka-iptv) no campo acima para buscar atualizações.', 'error');
            }
            return;
        }

        if (isManual) {
            setModalFeedback('☁️ Conectando ao GitHub e verificando nova versão...', '');
        }

        const cacheBust = `?t=${Date.now()}`;
        let workingBaseUrl = null;
        let remoteMeta = null;

        for (const base of candidates) {
            try {
                const res = await fetch(`${base}/version.json${cacheBust}`, { cache: 'no-store' });
                if (res.ok) {
                    remoteMeta = await res.json();
                    workingBaseUrl = base;
                    break;
                }
            } catch (_) {}
        }

        if (!workingBaseUrl || !remoteMeta || !remoteMeta.version) {
            if (isManual) {
                setModalFeedback('Não foi possível encontrar version.json no repositório GitHub informado. Verifique se o repositório é público.', 'error');
            }
            return;
        }

        const currentVer = window.MPKA_ACTIVE_VERSION || '2.3.0';
        if (!isManual && remoteMeta.version === currentVer) {
            return; // Em modo silencioso, só atualiza se a versão mudou
        }

        try {
            if (isManual) {
                setModalFeedback(`⬇️ Baixando versão v${remoteMeta.version} do GitHub (CSS + Parser + App)...`, '');
            }

            const [cssRes, parserRes, appRes] = await Promise.all([
                fetch(`${workingBaseUrl}/css/style.css${cacheBust}`, { cache: 'no-store' }),
                fetch(`${workingBaseUrl}/js/parser.js${cacheBust}`, { cache: 'no-store' }),
                fetch(`${workingBaseUrl}/js/app.js${cacheBust}`, { cache: 'no-store' })
            ]);

            if (!cssRes.ok || !parserRes.ok || !appRes.ok) {
                throw new Error('Arquivos da atualização incompletos no repositório.');
            }

            const [cssText, parserJsText, appJsText] = await Promise.all([
                cssRes.text(),
                parserRes.text(),
                appRes.text()
            ]);

            if (!parserJsText.includes('M3UParser') || !appJsText.includes('STORAGE_KEYS')) {
                throw new Error('Conteúdo baixado inválido.');
            }

            const otaBundle = {
                version: String(remoteMeta.version),
                updatedAt: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                changelog: remoteMeta.changelog || '',
                css: cssText,
                parserJs: parserJsText,
                appJs: appJsText
            };

            localStorage.setItem(STORAGE_KEYS.OTA_BUNDLE, JSON.stringify(otaBundle));
            setModalFeedback(`✅ Atualizado com sucesso para v${remoteMeta.version} via GitHub! Reiniciando aplicativo...`, 'success');

            setTimeout(() => {
                window.location.reload();
            }, 1100);
        } catch (err) {
            if (isManual) {
                setModalFeedback(`Erro ao baixar atualização do GitHub: ${err.message || 'Falha de rede'}`, 'error');
            }
        }
    }

    function toggleAutoOtaSetting() {
        state.otaAutoEnabled = !state.otaAutoEnabled;
        localStorage.setItem(STORAGE_KEYS.OTA_AUTO, state.otaAutoEnabled ? '1' : '0');
        updateOtaSettingsUI();
        setModalFeedback(
            state.otaAutoEnabled
                ? '🔁 Auto-Atualização ativada: o app verificará o GitHub automaticamente ao iniciar.'
                : '⏸ Auto-Atualização desativada: o app só atualizará quando você clicar no botão.',
            'success'
        );
    }

    function resetOtaToFactory() {
        localStorage.removeItem(STORAGE_KEYS.OTA_BUNDLE);
        setModalFeedback('🧹 Cache de atualização OTA limpo! Restaurando versão original de fábrica...', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 900);
    }

    async function handleRefreshPlaylistNow() {
        setModalFeedback('🔄 Atualizando lista de canais IPTV e Guia EPG agora...', '');
        await handleSaveM3U();
    }

    async function handleSaveM3U() {
        const urlValue = dom.inputM3uUrl.value.trim();
        const epgValue = dom.inputEpgUrl.value.trim();
        const rawValue = dom.inputM3uRaw.value.trim();
        if (dom.inputGithubRepo) {
            state.githubRepo = dom.inputGithubRepo.value.trim();
            localStorage.setItem(STORAGE_KEYS.GITHUB_REPO, state.githubRepo);
        }

        if (!urlValue && !rawValue) {
            setModalFeedback('Configurações do GitHub salvas! Informe também uma URL M3U/Xtream se quiser trocar a lista.', 'success');
            return;
        }

        localStorage.setItem(STORAGE_KEYS.EPG_URL, epgValue);

        if (rawValue) {
            const parsed = M3UParser.parse(rawValue);
            if (parsed.length === 0) {
                setModalFeedback('Nenhum canal válido encontrado no texto colado.', 'error');
                return;
            }
            localStorage.setItem(STORAGE_KEYS.M3U_RAW, rawValue);
            localStorage.setItem(STORAGE_KEYS.M3U_URL, urlValue);
            distributeItemsIntoSections(parsed);
            updateStatusCounter();
            loadEpgInBackground(urlValue, epgValue);
            setModalFeedback(`Lista salva com sucesso (${parsed.length} itens)!`, 'success');
            setTimeout(async () => {
                closeSettingsModal();
                await switchTab('home');
            }, 600);
            return;
        }

        try {
            setModalFeedback('Conectando ao servidor e organizando Canais, Filmes, Séries e EPG...', '');
            resetSectionsCache();
            const liveItems = await M3UParser.fetchSectionFromUrl(urlValue, 'live');
            if (liveItems.length === 0) {
                setModalFeedback('Nenhum canal encontrado nesta URL.', 'error');
                return;
            }

            localStorage.setItem(STORAGE_KEYS.M3U_URL, urlValue);
            localStorage.setItem(STORAGE_KEYS.M3U_RAW, '');

            if (M3UParser.isMultiSectionXtreamUrl(urlValue)) {
                state.sectionCache.live = liveItems;
                state.sectionLoaded.live = true;
                M3UParser.fetchSectionFromUrl(urlValue, 'movies')
                    .then(movies => {
                        state.sectionCache.movies = movies;
                        state.sectionLoaded.movies = true;
                        updateStatusCounter();
                        if (state.activeTab === 'home') buildCategoriesForActiveTab(true);
                    })
                    .catch(() => {});
                M3UParser.fetchSectionFromUrl(urlValue, 'series')
                    .then(series => {
                        state.sectionCache.series = series;
                        state.sectionLoaded.series = true;
                        updateStatusCounter();
                        if (state.activeTab === 'home') buildCategoriesForActiveTab(true);
                    })
                    .catch(() => {});
            } else {
                distributeItemsIntoSections(liveItems);
            }

            updateStatusCounter();
            loadEpgInBackground(urlValue, epgValue);
            setModalFeedback(`Sucesso! ${liveItems.length} canais unificados carregados (+ EPG & Filmes/Séries).`, 'success');
            setTimeout(async () => {
                closeSettingsModal();
                await switchTab('home');
            }, 650);
        } catch (err) {
            setModalFeedback('Erro ao baixar a URL informada. Verifique o endereço e tente novamente.', 'error');
        }
    }

    async function handleRestoreDefaultChannels() {
        localStorage.removeItem(STORAGE_KEYS.M3U_URL);
        localStorage.removeItem(STORAGE_KEYS.EPG_URL);
        localStorage.removeItem(STORAGE_KEYS.M3U_RAW);
        dom.inputM3uUrl.value = '';
        dom.inputEpgUrl.value = '';
        dom.inputM3uRaw.value = '';
        state.epgData = null;

        distributeItemsIntoSections(M3UParser.getDefaultChannels());
        dom.playlistStatusText.textContent = 'MPKA Demo (6 itens)';
        setModalFeedback('Lista de demonstração restaurada.', 'success');
        setTimeout(async () => {
            closeSettingsModal();
            await switchTab('home');
        }, 500);
    }

    /**
     * ========================================================================
     * NAVEGAÇÃO POR CONTROLE REMOTO (D-PAD COMPLETO EM TODAS AS ZONAS)
     * ========================================================================
     */
    function bindRemoteControlEvents() {
        window.addEventListener('keydown', async (event) => {
            const keyCode = event.keyCode || event.which;
            const key = event.key;

            const isUp = key === 'ArrowUp' || keyCode === KEYS.UP;
            const isDown = key === 'ArrowDown' || keyCode === KEYS.DOWN;
            const isLeft = key === 'ArrowLeft' || keyCode === KEYS.LEFT;
            const isRight = key === 'ArrowRight' || keyCode === KEYS.RIGHT;
            const isEnter = key === 'Enter' || keyCode === KEYS.ENTER;
            const isBack = key === 'Escape' || key === 'XF86Back' || keyCode === KEYS.ESC || keyCode === KEYS.TIZEN_RETURN;
            const isChUp = keyCode === KEYS.CH_UP;
            const isChDown = keyCode === KEYS.CH_DOWN;

            // 1A. GAVETA LATERAL DE ZAPPING DENTRO DO PLAYER
            if (state.mode === 'player_drawer') {
                event.preventDefault();
                if (isBack || isRight) {
                    closePlayerChannelDrawer();
                    return;
                }
                const r = state.rowIndex;
                const maxItems = state.categories[r] ? state.categories[r].items.length : 0;
                if (isUp && state.drawerIndex > 0) {
                    state.drawerIndex--;
                    applyVisualFocus();
                } else if (isDown && state.drawerIndex < maxItems - 1) {
                    state.drawerIndex++;
                    applyVisualFocus();
                } else if (isEnter && state.categories[r]) {
                    const ch = state.categories[r].items[state.drawerIndex];
                    if (ch) {
                        state.colIndices[r] = state.drawerIndex;
                        closePlayerChannelDrawer();
                        openPlayer(ch, 0);
                    }
                }
                return;
            }

            // 1B. PLAYER EM TELA CHEIA (HUD ESTILO NETFLIX + CONTROLES MULTIMÍDIA)
            if (state.mode === 'player') {
                event.preventDefault();
                if (isBack || keyCode === KEYS.MEDIA_STOP) {
                    closePlayer();
                    return;
                }

                // Teclas físicas dedicadas de mídia do controle remoto Samsung
                if (keyCode === KEYS.MEDIA_PLAY_PAUSE) {
                    triggerPlayerOverlay();
                    togglePlayPause();
                    return;
                }
                if (keyCode === KEYS.MEDIA_PLAY) {
                    triggerPlayerOverlay();
                    if (dom.videoElement.paused) togglePlayPause();
                    return;
                }
                if (keyCode === KEYS.MEDIA_PAUSE) {
                    triggerPlayerOverlay();
                    if (!dom.videoElement.paused) togglePlayPause();
                    return;
                }
                if (keyCode === KEYS.MEDIA_REWIND) {
                    triggerPlayerOverlay();
                    seekVideoBy(-10);
                    return;
                }
                if (keyCode === KEYS.MEDIA_FAST_FORWARD) {
                    triggerPlayerOverlay();
                    seekVideoBy(10);
                    return;
                }
                if (isChUp) {
                    triggerPlayerOverlay();
                    zapChannelInPlayer(-1);
                    return;
                }
                if (isChDown) {
                    triggerPlayerOverlay();
                    zapChannelInPlayer(1);
                    return;
                }

                const hudWasHidden = dom.playerOverlay.classList.contains('overlay-hidden');
                const isLive = !state.activeChannel || state.activeChannel.section === 'live';
                const visibleBtns = getVisiblePlayerControlButtons();

                // Se a HUD estava oculta na tela:
                if (hudWasHidden) {
                    state.playerHudZone = isLive ? 'buttons' : 'timeline';
                    triggerPlayerOverlay();
                    if (isEnter) {
                        togglePlayPause();
                    } else if (!isLive && isLeft) {
                        seekVideoBy(-10);
                    } else if (!isLive && isRight) {
                        seekVideoBy(10);
                    } else if (isLive && isUp) {
                        zapChannelInPlayer(-1);
                    } else if (isLive && isDown) {
                        zapChannelInPlayer(1);
                    }
                    return;
                }

                // A HUD já está visível: funciona igual à barra da Netflix!
                triggerPlayerOverlay();

                if (state.playerHudZone === 'timeline' && !isLive) {
                    if (isLeft) {
                        seekVideoBy(-10);
                    } else if (isRight) {
                        seekVideoBy(10);
                    } else if (isDown) {
                        hideScrubbingPreviewStrip();
                        state.playerHudZone = 'buttons';
                        state.playerCtrlIdx = clamp(state.playerCtrlIdx, 0, Math.max(0, visibleBtns.length - 1));
                        applyVisualFocus();
                    } else if (isUp) {
                        hideScrubbingPreviewStrip();
                        clearTimeout(state.overlayTimer);
                        dom.playerOverlay.classList.add('overlay-hidden');
                    } else if (isEnter) {
                        togglePlayPause();
                    }
                    return;
                }

                // Zona de botões inferiores secundários (Do Início, Próx. Episódio, Legendas, Tela, Qualidade, Canais)
                state.playerHudZone = 'buttons';
                if (isLeft) {
                    if (state.playerCtrlIdx > 0) {
                        state.playerCtrlIdx--;
                        applyVisualFocus();
                    } else if (isLive) {
                        openPlayerChannelDrawer();
                    }
                } else if (isRight) {
                    if (state.playerCtrlIdx < visibleBtns.length - 1) {
                        state.playerCtrlIdx++;
                        applyVisualFocus();
                    }
                } else if (isUp) {
                    if (!isLive) {
                        state.playerHudZone = 'timeline';
                        applyVisualFocus();
                    } else {
                        zapChannelInPlayer(-1);
                    }
                } else if (isDown) {
                    if (isLive) {
                        zapChannelInPlayer(1);
                    }
                } else if (isEnter) {
                    const activeBtn = visibleBtns[state.playerCtrlIdx];
                    if (activeBtn && activeBtn.dataset.action) {
                        executePlayerControlAction(activeBtn.dataset.action);
                    } else {
                        togglePlayPause();
                    }
                }
                return;
            }

            // 2. MODAL DE SÉRIES (TEMPORADAS E EPISÓDIOS)
            if (state.mode === 'series') {
                event.preventDefault();
                if (isBack) {
                    closeSeriesModal();
                    return;
                }

                const show = state.activeSeriesShow;
                const activeSeasonKey = state.seriesSeasonKeys[state.seriesSeasonIdx];
                const episodes = (show && show.seasons && show.seasons[activeSeasonKey]) ? show.seasons[activeSeasonKey] : [];

                if (state.seriesZone === 'seasons') {
                    if (isLeft && state.seriesSeasonIdx > 0) {
                        state.seriesSeasonIdx--;
                        state.seriesEpisodeIdx = 0;
                        renderSeriesModalContent();
                        applyVisualFocus();
                    } else if (isRight && state.seriesSeasonIdx < state.seriesSeasonKeys.length - 1) {
                        state.seriesSeasonIdx++;
                        state.seriesEpisodeIdx = 0;
                        renderSeriesModalContent();
                        applyVisualFocus();
                    } else if (isDown) {
                        state.seriesZone = 'episodes';
                        applyVisualFocus();
                    } else if (isUp) {
                        state.seriesZone = 'fav';
                        applyVisualFocus();
                    }
                } else if (state.seriesZone === 'episodes') {
                    if (isUp) {
                        if (state.seriesEpisodeIdx > 0) {
                            state.seriesEpisodeIdx--;
                            applyVisualFocus();
                        } else {
                            state.seriesZone = 'seasons';
                            applyVisualFocus();
                        }
                    } else if (isDown) {
                        if (state.seriesEpisodeIdx < episodes.length - 1) {
                            state.seriesEpisodeIdx++;
                            applyVisualFocus();
                        } else {
                            state.seriesZone = 'close';
                            applyVisualFocus();
                        }
                    } else if (isEnter) {
                        const ep = episodes[state.seriesEpisodeIdx];
                        if (ep) {
                            closeSeriesModal();
                            openPlayer(ep, 0);
                        }
                    }
                } else if (state.seriesZone === 'fav') {
                    if (isDown) {
                        state.seriesZone = 'seasons';
                        applyVisualFocus();
                    } else if (isEnter) {
                        toggleFavoriteCurrentChannel();
                        dom.btnSeriesFav.textContent = isFavorite(show) ? '★ Remover Série dos Favoritos' : '★ Favoritar Série';
                        state.mode = 'series';
                        applyVisualFocus();
                    }
                } else if (state.seriesZone === 'close') {
                    if (isUp) {
                        state.seriesZone = 'episodes';
                        applyVisualFocus();
                    } else if (isEnter) {
                        closeSeriesModal();
                    }
                }
                return;
            }

            // 3. MODAL DE PIN DO CONTROLE DE PAIS
            if (state.mode === 'pin') {
                event.preventDefault();
                if (isBack) {
                    closePinModal();
                    return;
                }
                if (/^[0-9]$/.test(key)) {
                    handlePinKeyInput(key);
                    return;
                }
                if (key === 'Backspace' || key === 'Delete') {
                    state.pinBuffer = state.pinBuffer.slice(0, -1);
                    renderPinBoxes();
                    return;
                }

                const col = state.pinKeypadIndex % 3;
                const row = Math.floor(state.pinKeypadIndex / 3);
                if (isRight && col < 2) { state.pinKeypadIndex += 1; applyVisualFocus(); }
                else if (isLeft && col > 0) { state.pinKeypadIndex -= 1; applyVisualFocus(); }
                else if (isDown && row < 3) { state.pinKeypadIndex += 3; applyVisualFocus(); }
                else if (isUp && row > 0) { state.pinKeypadIndex -= 3; applyVisualFocus(); }
                else if (isEnter) {
                    const activeKeyBtn = dom.pinKeys[state.pinKeypadIndex];
                    if (activeKeyBtn) handlePinKeyInput(activeKeyBtn.dataset.key);
                }
                return;
            }

            // 4. MODAL DE GUIA EPG DETALHADO
            if (state.mode === 'epg') {
                event.preventDefault();
                if (isBack) { closeEpgModal(); return; }
                const btns = getEpgModalButtons();
                if (isLeft) { state.epgModalIndex = clamp(state.epgModalIndex - 1, 0, btns.length - 1); applyVisualFocus(); }
                else if (isRight) { state.epgModalIndex = clamp(state.epgModalIndex + 1, 0, btns.length - 1); applyVisualFocus(); }
                else if (isUp) { dom.epgScheduleList.scrollTop -= 90; }
                else if (isDown) { dom.epgScheduleList.scrollTop += 90; }
                else if (isEnter) {
                    const activeBtn = btns[state.epgModalIndex];
                    if (activeBtn === dom.btnEpgWatch && state.activeChannel) {
                        closeEpgModal();
                        activateSelectedChannelOrShow(state.activeChannel);
                    } else if (activeBtn === dom.btnEpgFav) {
                        toggleFavoriteCurrentChannel();
                        state.mode = 'epg';
                        applyVisualFocus();
                    } else {
                        closeEpgModal();
                    }
                }
                return;
            }

            // 5. CENTRAL DE CONFIGURAÇÕES POR ABAS (▲/▼ sobe e desce os botões; ◄/► troca de aba)
            if (state.mode === 'modal') {
                if (isBack) { event.preventDefault(); closeSettingsModal(); return; }
                const controls = getModalControls();
                const activeCtrl = controls[state.modalIndex];
                const isTextInput = activeCtrl && (activeCtrl.tagName === 'INPUT' || activeCtrl.tagName === 'TEXTAREA');

                if (isDown) {
                    event.preventDefault();
                    state.modalIndex = clamp(state.modalIndex + 1, 0, controls.length - 1);
                    applyVisualFocus();
                } else if (isUp) {
                    event.preventDefault();
                    state.modalIndex = clamp(state.modalIndex - 1, 0, controls.length - 1);
                    applyVisualFocus();
                } else if (isLeft && !isTextInput) {
                    event.preventDefault();
                    switchSettingsTab(state.settingsTabIdx - 1);
                } else if (isRight && !isTextInput) {
                    event.preventDefault();
                    switchSettingsTab(state.settingsTabIdx + 1);
                } else if (isEnter) {
                    if (activeCtrl === dom.btnRefreshPlaylist) { event.preventDefault(); await handleRefreshPlaylistNow(); }
                    else if (activeCtrl === dom.btnRestoreDefault) { event.preventDefault(); await handleRestoreDefaultChannels(); }
                    else if (activeCtrl === dom.btnCheckOta) { event.preventDefault(); await checkAndApplyGitHubUpdate(true); }
                    else if (activeCtrl === dom.btnToggleAutoOta) { event.preventDefault(); toggleAutoOtaSetting(); }
                    else if (activeCtrl === dom.btnResetOta) { event.preventDefault(); resetOtaToFactory(); }
                    else if (activeCtrl === dom.btnChangePin) { event.preventDefault(); openPinModal('change_verify_old'); }
                    else if (activeCtrl === dom.btnLockAdultNow) { event.preventDefault(); lockAdultSessionNow(); }
                    else if (activeCtrl === dom.btnSaveM3u) { event.preventDefault(); await handleSaveM3U(); }
                    else if (activeCtrl === dom.btnCloseModal) { event.preventDefault(); closeSettingsModal(); }
                }
                return;
            }

            // 6. PÍLULA DE ABAS NO TOPO
            if (state.mode === 'topbar') {
                event.preventDefault();
                if (isLeft) { state.topBarIndex = clamp(state.topBarIndex - 1, 0, dom.navTabs.length - 1); applyVisualFocus(); }
                else if (isRight) { state.topBarIndex = clamp(state.topBarIndex + 1, 0, dom.navTabs.length - 1); applyVisualFocus(); }
                else if (isDown || isBack) {
                    if (state.activeTab === 'search') {
                        state.mode = 'osk';
                    } else if (state.categories.length > 1) {
                        state.mode = 'catjump';
                        state.catJumpIndex = state.rowIndex;
                    } else {
                        state.mode = 'hero';
                        state.heroBtnIndex = 0;
                    }
                    applyVisualFocus();
                } else if (isEnter) {
                    const chosenTab = dom.navTabs[state.topBarIndex].dataset.tab;
                    await switchTab(chosenTab);
                    if (chosenTab === 'search') {
                        state.mode = 'osk';
                        applyVisualFocus();
                    } else if (chosenTab !== 'settings') {
                        state.mode = 'topbar';
                        applyVisualFocus();
                    }
                }
                return;
            }

            // 7. TECLADO VIRTUAL ON-SCREEN NA ABA BUSCAR
            if (state.mode === 'osk') {
                event.preventDefault();
                if (isLeft && state.oskIndex > 0) {
                    state.oskIndex--;
                    applyVisualFocus();
                } else if (isRight && state.oskIndex < OSK_KEYS.length - 1) {
                    state.oskIndex++;
                    applyVisualFocus();
                } else if (isUp) {
                    state.mode = 'topbar';
                    applyVisualFocus();
                } else if (isDown) {
                    state.mode = 'catalog';
                    applyVisualFocus();
                } else if (isEnter) {
                    triggerOskKey(OSK_KEYS[state.oskIndex]);
                } else if (isBack) {
                    state.mode = 'topbar';
                    applyVisualFocus();
                }
                return;
            }

            // 8. BARRA DE PULO RÁPIDO DE CATEGORIAS (JUMP PILLS)
            if (state.mode === 'catjump') {
                event.preventDefault();
                const maxPills = Math.min(14, state.categories.length);
                if (isLeft && state.catJumpIndex > 0) {
                    state.catJumpIndex--;
                    applyVisualFocus();
                } else if (isRight && state.catJumpIndex < maxPills - 1) {
                    state.catJumpIndex++;
                    applyVisualFocus();
                } else if (isUp) {
                    state.mode = state.activeTab === 'search' ? 'osk' : 'topbar';
                    applyVisualFocus();
                } else if (isDown) {
                    state.mode = 'hero';
                    state.heroBtnIndex = 0;
                    applyVisualFocus();
                } else if (isEnter) {
                    state.rowIndex = state.catJumpIndex;
                    state.mode = 'catalog';
                    applyVisualFocus();
                }
                return;
            }

            // 9. BOTÕES DO HERO BANNER
            if (state.mode === 'hero') {
                event.preventDefault();
                if (isLeft) { state.heroBtnIndex = 0; applyVisualFocus(); }
                else if (isRight) { state.heroBtnIndex = 1; applyVisualFocus(); }
                else if (isUp) {
                    if (state.categories.length > 1) {
                        state.mode = 'catjump';
                        state.catJumpIndex = state.rowIndex;
                    } else {
                        state.mode = state.activeTab === 'search' ? 'osk' : 'topbar';
                    }
                    applyVisualFocus();
                } else if (isDown) {
                    state.mode = 'catalog';
                    applyVisualFocus();
                } else if (isEnter) {
                    if (state.heroBtnIndex === 0 && state.activeChannel) {
                        activateSelectedChannelOrShow(state.activeChannel);
                    } else if (state.heroBtnIndex === 1 && state.activeChannel) {
                        if (state.activeChannel.section === 'live') {
                            openEpgModal(state.activeChannel);
                        } else {
                            toggleFavoriteCurrentChannel();
                            state.mode = 'hero';
                            applyVisualFocus();
                        }
                    }
                }
                return;
            }

            // 10. CATÁLOGO DE CARROSSÉIS (CARDS)
            if (state.mode === 'catalog') {
                if (isUp || isDown || isLeft || isRight || isEnter || isBack) {
                    event.preventDefault();
                }

                if (state.categories.length === 0) {
                    if (isUp) { state.mode = 'topbar'; applyVisualFocus(); }
                    return;
                }

                const currentRow = state.rowIndex;
                const currentItems = state.categories[currentRow].items;
                const currentCol = state.colIndices[currentRow] || 0;

                if (isRight) {
                    if (currentCol < currentItems.length - 1) {
                        state.colIndices[currentRow] = currentCol + 1;
                        applyVisualFocus();
                    }
                } else if (isLeft) {
                    if (currentCol > 0) {
                        state.colIndices[currentRow] = currentCol - 1;
                        applyVisualFocus();
                    }
                } else if (isDown) {
                    if (currentRow < state.categories.length - 1) {
                        state.rowIndex = currentRow + 1;
                        applyVisualFocus();
                    }
                } else if (isUp) {
                    if (currentRow > 0) {
                        state.rowIndex = currentRow - 1;
                        applyVisualFocus();
                    } else {
                        state.mode = 'hero';
                        state.heroBtnIndex = 0;
                        applyVisualFocus();
                    }
                } else if (isEnter) {
                    const selectedChannel = currentItems[currentCol];
                    if (selectedChannel) {
                        activateSelectedChannelOrShow(selectedChannel);
                    }
                } else if (isBack) {
                    state.mode = 'topbar';
                    applyVisualFocus();
                }
            }
        });
    }

    /**
     * Eventos auxiliares de clique e busca
     */
    function bindClickAndSearchEvents() {
        dom.navTabs.forEach((btn, idx) => {
            btn.addEventListener('click', async () => {
                state.topBarIndex = idx;
                const tab = btn.dataset.tab;
                await switchTab(tab);
                if (tab === 'search') {
                    state.mode = 'osk';
                    applyVisualFocus();
                }
            });
        });

        dom.btnHeroPlay.addEventListener('click', () => {
            if (state.activeChannel) activateSelectedChannelOrShow(state.activeChannel);
        });

        dom.btnHeroSecondary.addEventListener('click', () => {
            if (!state.activeChannel) return;
            if (state.activeChannel.section === 'live') {
                openEpgModal(state.activeChannel);
            } else {
                toggleFavoriteCurrentChannel();
            }
        });

        dom.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            if (state.activeTab === 'search') {
                buildCategoriesForActiveTab(false);
            }
        });

        dom.btnSeriesFav.addEventListener('click', () => {
            toggleFavoriteCurrentChannel();
            if (state.activeSeriesShow) {
                dom.btnSeriesFav.textContent = isFavorite(state.activeSeriesShow) ? '★ Remover Série dos Favoritos' : '★ Favoritar Série';
            }
        });
        dom.btnSeriesClose.addEventListener('click', closeSeriesModal);

        dom.btnChangePin.addEventListener('click', () => openPinModal('change_verify_old'));
        dom.btnLockAdultNow.addEventListener('click', lockAdultSessionNow);
        dom.btnSaveM3u.addEventListener('click', handleSaveM3U);
        dom.btnRestoreDefault.addEventListener('click', handleRestoreDefaultChannels);
        dom.btnCloseModal.addEventListener('click', closeSettingsModal);

        if (dom.btnRefreshPlaylist) dom.btnRefreshPlaylist.addEventListener('click', handleRefreshPlaylistNow);
        if (dom.btnCheckOta) dom.btnCheckOta.addEventListener('click', () => checkAndApplyGitHubUpdate(true));
        if (dom.btnToggleAutoOta) dom.btnToggleAutoOta.addEventListener('click', toggleAutoOtaSetting);
        if (dom.btnResetOta) dom.btnResetOta.addEventListener('click', resetOtaToFactory);

        document.querySelectorAll('.settings-tab-btn').forEach((tabBtn, idx) => {
            tabBtn.addEventListener('click', () => switchSettingsTab(idx));
        });

        const playlistInd = document.getElementById('playlist-indicator');
        if (playlistInd) playlistInd.addEventListener('click', openSettingsModal);
        if (dom.parentalBadge) dom.parentalBadge.addEventListener('click', openSettingsModal);

        dom.pinKeys.forEach((keyBtn, idx) => {
            keyBtn.addEventListener('click', () => {
                state.pinKeypadIndex = idx;
                applyVisualFocus();
                handlePinKeyInput(keyBtn.dataset.key);
            });
        });

        dom.btnEpgWatch.addEventListener('click', () => {
            if (state.activeChannel) {
                closeEpgModal();
                activateSelectedChannelOrShow(state.activeChannel);
            }
        });
        dom.btnEpgFav.addEventListener('click', () => toggleFavoriteCurrentChannel());
        dom.btnEpgClose.addEventListener('click', closeEpgModal);

        // Cliques nos botões da barra multimídia secundária do Player
        if (dom.playerControlsBar) {
            dom.playerControlsBar.addEventListener('click', (e) => {
                const btn = e.target.closest('.player-ctrl-btn');
                if (!btn || !btn.dataset.action) return;
                triggerPlayerOverlay();
                const visibleBtns = getVisiblePlayerControlButtons();
                const idx = visibleBtns.indexOf(btn);
                if (idx !== -1) {
                    state.playerHudZone = 'buttons';
                    state.playerCtrlIdx = idx;
                    applyVisualFocus();
                }
                executePlayerControlAction(btn.dataset.action);
            });
        }

        // Clique na barra de progresso (Seekbar) ou no botão Play/Pause integrado estilo Netflix
        if (dom.playerTimelineRow) {
            dom.playerTimelineRow.addEventListener('click', (e) => {
                if (e.target.closest('#pbtn-playpause')) {
                    state.playerHudZone = 'timeline';
                    togglePlayPause();
                    return;
                }
                if (!state.activeChannel || state.activeChannel.section === 'live') return;
                const track = document.getElementById('player-seekbar-track');
                if (!track || !dom.videoElement || !dom.videoElement.duration) return;
                const rect = track.getBoundingClientRect();
                const ratio = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
                dom.videoElement.currentTime = ratio * dom.videoElement.duration;
                state.playerHudZone = 'timeline';
                triggerPlayerOverlay();
                updatePlayerTimelineUI();
            });
        }
    }

    function clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
