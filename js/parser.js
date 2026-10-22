/**
 * MPKA Iptv - M3U / Xtream Codes Native API Parser + Series TMDB Covers + XMLTV EPG Engine
 * Compatível com Tizen Web Engine (ES6+)
 */

const M3UParser = (() => {
    const DEFAULT_CHANNELS = [
        {
            id: 'ch_1',
            name: 'Big Buck Bunny: O Filme',
            tvgId: 'bbb.demo',
            section: 'movies',
            group: 'Filmes | Animação & Aventura',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/400px-Big_buck_bunny_poster_big.jpg',
            badge: '2025 • 01:12:00 • Animação',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            isAdult: false,
            synopsis: 'Acompanhe as aventuras de Big Buck Bunny, um coelho gigante de bom coração que lida com três roedores valentões da floresta em uma produção aberta da Blender Foundation com qualidade cristalina.',
            backdropGradient: 'radial-gradient(circle at 75% 25%, rgba(229, 9, 20, 0.42) 0%, rgba(11, 13, 17, 0.98) 72%)'
        },
        {
            id: 'ch_2',
            name: 'Tears of Steel: Domínio Cyber',
            tvgId: 'tos.demo',
            section: 'movies',
            group: 'Filmes | Ficção Científica',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Tos-poster.png/400px-Tos-poster.png',
            badge: '2025 • 01:28:40 • Sci-Fi',
            url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
            isAdult: false,
            synopsis: 'Em uma Amsterdã futurista e devastada, um grupo de guerreiros e cientistas se reúne na Oude Kerk para tentar reverter um evento catastrófico causado por robôs implacáveis.',
            backdropGradient: 'radial-gradient(circle at 75% 25%, rgba(14, 165, 233, 0.42) 0%, rgba(11, 13, 17, 0.98) 72%)'
        },
        {
            id: 'ch_3',
            name: 'Red Bull Extreme Live TV',
            tvgId: 'redbull.live',
            section: 'live',
            group: 'Canais | Esportes',
            logo: '',
            badge: 'AO VIVO • ESPORTE • 2 FONTES',
            url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
            variants: [
                { label: 'FHD 1080P', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' },
                { label: 'HD 720P', url: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8' }
            ],
            isAdult: false,
            synopsis: 'Transmissão contínua com foco em esportes radicais, corridas de alta velocidade, eventos internacionais e cronometragem oficial de baixa latência.',
            backdropGradient: 'radial-gradient(circle at 75% 25%, rgba(245, 158, 11, 0.42) 0%, rgba(11, 13, 17, 0.98) 72%)'
        },
        {
            id: 'ch_4',
            name: 'Sintel: Crônicas do Dragão',
            tvgId: 'sintel.series',
            section: 'series',
            group: 'Series | Fantasia & Épico',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/400px-Sintel_poster.jpg',
            backdrop: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/400px-Sintel_poster.jpg',
            badge: '1 Temporada • 2 Episódios • HDR',
            url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
            isSeriesGroup: true,
            seasons: {
                1: [
                    {
                        id: 'sintel_s1e1',
                        season: 1,
                        episode: 1,
                        title: 'T1:E1 - O Encontro com Scales',
                        name: 'Sintel: Crônicas do Dragão - S01E01',
                        duration: '00:14:48',
                        group: 'Series | Fantasia & Épico',
                        section: 'series',
                        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/400px-Sintel_poster.jpg',
                        url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
                    },
                    {
                        id: 'sintel_s1e2',
                        season: 1,
                        episode: 2,
                        title: 'T1:E2 - A Busca nas Terras do Norte',
                        name: 'Sintel: Crônicas do Dragão - S01E02',
                        duration: '00:10:00',
                        group: 'Series | Fantasia & Épico',
                        section: 'series',
                        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/400px-Sintel_poster.jpg',
                        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
                    }
                ]
            },
            isAdult: false,
            synopsis: 'Uma jovem solitária chamada Sintel embarca em uma jornada épica por terras congeladas e desertos perigosos em busca de seu único amigo: um pequeno dragão chamado Scales.',
            backdropGradient: 'radial-gradient(circle at 75% 25%, rgba(168, 85, 247, 0.42) 0%, rgba(11, 13, 17, 0.98) 72%)'
        },
        {
            id: 'ch_5',
            name: 'Freerunning World Tour',
            tvgId: 'parkour.series',
            section: 'series',
            group: 'Series | Documentários & Ação',
            logo: '',
            badge: '1 Temporada • 1 Episódio • FHD',
            url: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
            isSeriesGroup: true,
            seasons: {
                1: [
                    {
                        id: 'parkour_s1e1',
                        season: 1,
                        episode: 1,
                        title: 'T1:E1 - Desafio nos Telhados Europeus',
                        name: 'Freerunning World Tour - S01E01',
                        duration: '00:08:20',
                        group: 'Series | Documentários & Ação',
                        section: 'series',
                        logo: '',
                        url: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8'
                    }
                ]
            },
            isAdult: false,
            synopsis: 'Atletas urbanos desafiam a gravidade saltando entre telhados, obstáculos arquitetônicos e arenas mundiais com manobras acrobáticas de tirar o fôlego.',
            backdropGradient: 'radial-gradient(circle at 75% 25%, rgba(16, 185, 129, 0.42) 0%, rgba(11, 13, 17, 0.98) 72%)'
        },
        {
            id: 'ch_6',
            name: 'Apple BipBop Master TV',
            tvgId: 'apple.live',
            section: 'live',
            group: 'Canais | Abertos',
            logo: '',
            badge: 'AO VIVO • SINAL ABERTO',
            url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
            variants: [
                { label: 'MASTER ABR', url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8' }
            ],
            isAdult: false,
            synopsis: 'Canal de engenharia e calibração audiovisual em sinal aberto. Ideal para verificação de sincronia de áudio, estabilidade de buffer e troca adaptativa de bitrate (ABR) na Smart TV.',
            backdropGradient: 'radial-gradient(circle at 75% 25%, rgba(236, 72, 153, 0.42) 0%, rgba(11, 13, 17, 0.98) 72%)'
        }
    ];

    const GRADIENTS = [
        'radial-gradient(circle at 75% 25%, rgba(229, 9, 20, 0.40) 0%, rgba(11, 13, 17, 0.98) 72%)',
        'radial-gradient(circle at 75% 25%, rgba(14, 165, 233, 0.38) 0%, rgba(11, 13, 17, 0.98) 72%)',
        'radial-gradient(circle at 75% 25%, rgba(245, 158, 11, 0.38) 0%, rgba(11, 13, 17, 0.98) 72%)',
        'radial-gradient(circle at 75% 25%, rgba(168, 85, 247, 0.38) 0%, rgba(11, 13, 17, 0.98) 72%)',
        'radial-gradient(circle at 75% 25%, rgba(16, 185, 129, 0.38) 0%, rgba(11, 13, 17, 0.98) 72%)'
    ];

    const ADULT_REGEX = /(\bxxx\b|\badulto|\badultos|\b18\+|\+18|\bporn|\bsex\b|\berotico|\berótico|\bplayboy|\bsexy\b|\bhot\b|\bbrazzers|\bpenthouse|\bvenus\b|\bsexprive|\bsex\s*prive)/i;

    function isAdultContent(name, group) {
        return ADULT_REGEX.test(name || '') || ADULT_REGEX.test(group || '');
    }

    /**
     * Faz fetch direto (em TV Tizen) e, caso esteja em localhost no navegador e bloqueado por CORS,
     * usa automaticamente a rota /__proxy do dev_server local.
     */
    async function smartFetchText(targetUrl) {
        try {
            const resp = await fetch(targetUrl);
            if (resp.ok) {
                return await resp.text();
            }
        } catch (err) {
            // Se falhar por CORS no navegador PC (localhost), tenta via proxy local de desenvolvimento
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                const proxyUrl = `/__proxy?url=${encodeURIComponent(targetUrl)}`;
                const proxyResp = await fetch(proxyUrl);
                if (proxyResp.ok) {
                    return await proxyResp.text();
                }
            }
            throw err;
        }
        throw new Error(`Falha ao buscar: ${targetUrl}`);
    }

    async function smartFetchJson(targetUrl) {
        const text = await smartFetchText(targetUrl);
        return JSON.parse(text);
    }

    function extractXtreamEndpoints(rawUrl) {
        if (!rawUrl) return null;
        const url = rawUrl.trim();

        const ssMatch = url.match(/^(https?:\/\/[^\/]+)\/(?:ss-ts|ss-hls|ss)\/([^\/?#]+)\/([^\/?#]+)/i);
        if (ssMatch) {
            const origin = ssMatch[1];
            const user = encodeURIComponent(ssMatch[2]);
            const pass = encodeURIComponent(ssMatch[3]);
            return {
                origin,
                user,
                pass,
                live: `${origin}/playlist.php?username=${user}&password=${pass}&type=m3u_plus&output=m3u8&key=live`,
                movies: `${origin}/playlist.php?username=${user}&password=${pass}&type=m3u_plus&output=ts&key=movie`,
                series: `${origin}/playlist.php?username=${user}&password=${pass}&type=m3u_plus&output=ts&key=series`,
                apiBase: `${origin}/player_api.php?username=${user}&password=${pass}`,
                epg: `${origin}/xmltv.php?username=${user}&password=${pass}`
            };
        }

        const userMatch = url.match(/[?&]username=([^&#]+)/i);
        const passMatch = url.match(/[?&]password=([^&#]+)/i);
        const originMatch = url.match(/^(https?:\/\/[^\/]+)/i);

        if (originMatch && userMatch && passMatch) {
            const origin = originMatch[1];
            const user = userMatch[1];
            const pass = passMatch[1];
            return {
                origin,
                user,
                pass,
                live: `${origin}/playlist.php?username=${user}&password=${pass}&type=m3u_plus&output=m3u8&key=live`,
                movies: `${origin}/playlist.php?username=${user}&password=${pass}&type=m3u_plus&output=ts&key=movie`,
                series: `${origin}/playlist.php?username=${user}&password=${pass}&type=m3u_plus&output=ts&key=series`,
                apiBase: `${origin}/player_api.php?username=${user}&password=${pass}`,
                epg: `${origin}/xmltv.php?username=${user}&password=${pass}`
            };
        }

        return null;
    }

    /**
     * ========================================================================
     * CATÁLOGO DE SÉRIES VIA XTREAM PLAYER_API (Com Pôster Oficial TMDB, Sinopse, Elenco e Episódios Reais)
     * ========================================================================
     */
    async function fetchXtreamSeriesCatalog(endpoints) {
        const categoriesUrl = `${endpoints.apiBase}&action=get_series_categories`;
        const allSeriesUrl = `${endpoints.apiBase}&action=get_series`;

        const [categoriesJson, seriesListJson] = await Promise.all([
            smartFetchJson(categoriesUrl),
            smartFetchJson(allSeriesUrl)
        ]);

        const catMap = new Map();
        if (Array.isArray(categoriesJson)) {
            categoriesJson.forEach(c => {
                catMap.set(String(c.category_id), c.category_name || 'Séries');
            });
        }

        if (!Array.isArray(seriesListJson)) {
            return [];
        }

        return seriesListJson.map((s, idx) => {
            const groupName = catMap.get(String(s.category_id)) || 'Séries';
            const cleanGenre = s.genre || groupName.replace(/^(Series|Séries)\s*\|\s*/i, '');
            const yearStr = s.year || (s.releaseDate ? String(s.releaseDate).slice(0, 4) : '2025');
            const ratingStr = s.rating && Number(s.rating) > 0 ? `★ ${Number(s.rating).toFixed(1)}` : 'HD';
            const coverUrl = (s.cover || '').replace(/\\\//g, '/');
            const backdropUrl = (Array.isArray(s.backdrop_path) && s.backdrop_path.length > 0)
                ? String(s.backdrop_path[0]).replace(/\\\//g, '/')
                : coverUrl;

            const showName = (s.name || s.title || `Série ${idx + 1}`).trim();
            const plotText = (s.plot && s.plot.trim())
                ? s.plot.trim()
                : `Assista a todos os episódios de "${showName}" na categoria ${groupName}.`;

            return {
                id: `xtream_series_${s.series_id}`,
                seriesId: s.series_id,
                xtreamOrigin: endpoints.origin,
                xtreamUser: endpoints.user,
                xtreamPass: endpoints.pass,
                xtreamApiBase: endpoints.apiBase,
                name: showName,
                section: 'series',
                group: groupName,
                logo: coverUrl,
                backdrop: backdropUrl,
                badge: `${yearStr} • ${ratingStr} • ${cleanGenre}`,
                cast: s.cast || '',
                url: `xtream://series/${s.series_id}`,
                isSeriesGroup: true,
                seasons: null, // Carregado instantaneamente via get_series_info ao abrir a série
                isAdult: isAdultContent(showName, groupName),
                synopsis: plotText,
                backdropGradient: GRADIENTS[idx % GRADIENTS.length]
            };
        });
    }

    /**
     * Carrega todas as Temporadas e Episódios reais de uma série via get_series_info
     */
    async function fetchSeriesEpisodesOnDemand(showItem) {
        if (!showItem) return null;
        if (showItem.seasons && Object.keys(showItem.seasons).length > 0) {
            return showItem.seasons;
        }
        if (!showItem.seriesId || !showItem.xtreamApiBase) {
            return {};
        }

        const infoUrl = `${showItem.xtreamApiBase}&action=get_series_info&series_id=${encodeURIComponent(showItem.seriesId)}`;
        const data = await smartFetchJson(infoUrl);

        const seasonsObj = {};
        const episodesBySeason = (data && data.episodes) ? data.episodes : {};

        Object.keys(episodesBySeason).forEach(seasonKey => {
            const seasonNum = parseInt(seasonKey, 10) || 1;
            const rawEps = episodesBySeason[seasonKey];
            if (!Array.isArray(rawEps)) return;

            seasonsObj[seasonNum] = rawEps.map(ep => {
                const epNum = parseInt(ep.episode_num || ep.episode || '1', 10);
                const ext = (ep.container_extension || 'mp4').replace(/^\./, '');
                const streamUrl = `${showItem.xtreamOrigin}/series/${showItem.xtreamUser}/${showItem.xtreamPass}/${ep.id}.${ext}`;
                const duration = (ep.info && ep.info.duration) ? ep.info.duration : '';
                const rawEpTitle = (ep.title || '').trim();
                const cleanEpTitle = rawEpTitle && !/^S\d+E\d+$/i.test(rawEpTitle)
                    ? `T${seasonNum}:E${String(epNum).padStart(2, '0')} - ${rawEpTitle}`
                    : `Temporada ${seasonNum} • Episódio ${String(epNum).padStart(2, '0')}`;

                return {
                    id: `ep_${ep.id}`,
                    season: seasonNum,
                    episode: epNum,
                    title: cleanEpTitle,
                    duration: duration,
                    name: `${showItem.name} - T${seasonNum}:E${String(epNum).padStart(2, '0')}`,
                    group: showItem.group,
                    section: 'series',
                    logo: (ep.info && (ep.info.movie_image || ep.info.cover_big)) || showItem.logo,
                    url: streamUrl,
                    isAdult: showItem.isAdult
                };
            });

            seasonsObj[seasonNum].sort((a, b) => a.episode - b.episode);
        });

        showItem.seasons = seasonsObj;
        return seasonsObj;
    }

    function inferSection(name, group, streamUrl, forcedSection) {
        if (forcedSection) return forcedSection;

        const g = (group || '').toLowerCase();
        const n = (name || '').toLowerCase();
        const u = (streamUrl || '').toLowerCase();

        if (u.includes('/series/') || g.includes('serie') || g.includes('série') || g.includes('novela') || g.includes('dorama') || /s\d{1,2}\s*e\d{1,3}/i.test(n)) {
            return 'series';
        }
        if (u.includes('/movie/') || g.includes('filme') || g.includes('lancamento') || g.includes('lançamento') || g.includes('cinema') || /\.(mp4|mkv|avi)$/i.test(u)) {
            return 'movies';
        }
        return 'live';
    }

    function buildMetaBadge(name, group, section) {
        const cleanGroup = (group || '').replace(/^(Canais|Filmes|Series|Séries)\s*\|\s*/i, '').trim() || 'Destaque';

        if (section === 'movies') {
            return `2025 • 01:45:00 • ${cleanGroup}`;
        }
        if (section === 'series') {
            const epMatch = (name || '').match(/S(\d{1,2})\s*E(\d{1,3})/i);
            const epTag = epMatch ? `T${parseInt(epMatch[1], 10)}:E${parseInt(epMatch[2], 10)}` : 'Série';
            return `${epTag} • ${cleanGroup}`;
        }

        const upper = (name || '').toUpperCase();
        if (upper.includes('4K')) return `AO VIVO • 4K UHD • ${cleanGroup}`;
        if (upper.includes('FHD')) return `AO VIVO • FHD 1080P • ${cleanGroup}`;
        return `AO VIVO • ${cleanGroup}`;
    }

    function generateSynopsis(name, group, section) {
        const cleanGroup = (group || '').replace(/^(Canais|Filmes|Series|Séries)\s*\|\s*/i, '').trim();
        if (section === 'movies') {
            return `Assista a "${name}" em alta definição no MPKA Iptv. Produção selecionada do catálogo de ${cleanGroup || 'Filmes'}, com retomada automática de reprodução.`;
        }
        if (section === 'series') {
            return `Temporadas completas de "${name}" (${cleanGroup || 'Séries'}). Selecione a temporada e o episódio desejado para maratonar na sua Smart TV.`;
        }
        return `Transmissão ao vivo de ${name} na categoria ${cleanGroup || 'Canais Ao Vivo'}. Suporte a troca rápida de qualidade (4K / FHD / HD / SD) e guia EPG integrado.`;
    }

    function extractAttribute(line, attrName) {
        const regex = new RegExp(attrName + '\\s*=\\s*"([^"]*)"', 'i');
        const match = line.match(regex);
        return match ? match[1].trim() : '';
    }

    /**
     * Unificação de qualidades de Canais Ao Vivo (4K, FHD, HD, SD, H265)
     */
    function extractLiveVariantInfo(rawName) {
        const name = (rawName || '').trim();
        let label = 'HD';

        const isH265 = /h\.?265|hevc/i.test(name);
        if (/\b4k\b|\buhd\b/i.test(name)) {
            label = isH265 ? '4K H265' : '4K UHD';
        } else if (/\bfhd\b|\b1080p?\b/i.test(name)) {
            label = isH265 ? 'FHD H265' : 'FHD';
        } else if (/\bhd\b|\b720p?\b/i.test(name)) {
            label = isH265 ? 'HD H265' : 'HD';
        } else if (/\bsd\b|\b480p?\b/i.test(name)) {
            label = 'SD';
        } else if (isH265) {
            label = 'H265';
        }

        let cleanTitle = name
            .replace(/\[\s*(h\.?265|hevc|4k|fhd|hd|sd|uhd|dual|leg)\s*\]/gi, '')
            .replace(/\(\s*(h\.?265|hevc|4k|fhd|hd|sd|uhd)\s*\)/gi, '')
            .replace(/\s+\b(4k|uhd|fhd|hd|sd|h265|hevc)\b$/gi, '')
            .replace(/\s+\b(4k|uhd|fhd|hd|sd|h265|hevc)\b$/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        if (!cleanTitle) cleanTitle = name;
        return { cleanTitle, label };
    }

    function deduplicateLiveChannels(liveItems) {
        const groupedMap = new Map();
        const result = [];

        for (let i = 0; i < liveItems.length; i++) {
            const item = liveItems[i];
            const { cleanTitle, label } = extractLiveVariantInfo(item.name);
            const key = `${(item.group || '').toLowerCase()}__${cleanTitle.toLowerCase()}`;

            if (!groupedMap.has(key)) {
                const masterChannel = {
                    ...item,
                    name: cleanTitle,
                    variants: [{ label: label, url: item.url, rawName: item.name }]
                };
                groupedMap.set(key, masterChannel);
                result.push(masterChannel);
            } else {
                const existing = groupedMap.get(key);
                if (!existing.variants.some(v => v.url === item.url)) {
                    let uniqueLabel = label;
                    if (existing.variants.some(v => v.label === uniqueLabel)) {
                        uniqueLabel = `${label} #${existing.variants.length + 1}`;
                    }
                    existing.variants.push({ label: uniqueLabel, url: item.url, rawName: item.name });
                }
                if (!existing.logo && item.logo) existing.logo = item.logo;
            }
        }

        const rankOrder = ['FHD', 'HD', '4K UHD', 'FHD H265', '4K H265', 'SD'];
        result.forEach(ch => {
            if (ch.variants && ch.variants.length > 1) {
                ch.variants.sort((a, b) => {
                    const idxA = rankOrder.indexOf(a.label);
                    const idxB = rankOrder.indexOf(b.label);
                    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
                });
                ch.url = ch.variants[0].url;
                const cleanGroup = (ch.group || '').replace(/^Canais\s*\|\s*/i, '').trim();
                ch.badge = `AO VIVO • ${ch.variants.length} QUALIDADES (${ch.variants.map(v => v.label).slice(0, 3).join('/')}) • ${cleanGroup}`;
            }
        });

        return result;
    }

    /**
     * Fallback de agrupamento de Séries para listas M3U coladas manualmente (usa regex não-guloso)
     */
    function extractSeriesEpisodeMeta(rawName) {
        const name = (rawName || '').trim();
        // Regex não-guloso (.*?) para capturar o nome completo da série antes de S01E02
        const seMatch = name.match(/^(.*?)\s+(?:S(\d{1,2})\s*E(\d{1,4})|T(\d{1,2})\s*E(\d{1,4})|(\d{1,2})x(\d{1,3})|\bEp\.?\s*(\d{1,4}))(?:\b|\s|$)(.*)$/i);

        if (seMatch) {
            let showTitle = (seMatch[1] || '').replace(/[-–:]\s*$/, '').trim();
            const seasonNum = parseInt(seMatch[2] || seMatch[4] || seMatch[6] || '1', 10);
            const epNum = parseInt(seMatch[3] || seMatch[5] || seMatch[7] || seMatch[8] || '1', 10);
            const suffix = (seMatch[9] || '').trim();

            if (!showTitle) showTitle = name;
            return {
                showTitle,
                season: isNaN(seasonNum) ? 1 : seasonNum,
                episode: isNaN(epNum) ? 1 : epNum,
                epTitle: suffix ? `T${seasonNum}:E${String(epNum).padStart(2, '0')} - ${suffix.replace(/^[-–:]\s*/, '')}` : `Temporada ${seasonNum} • Episódio ${String(epNum).padStart(2, '0')}`
            };
        }

        return {
            showTitle: name,
            season: 1,
            episode: 1,
            epTitle: `Episódio 01 - ${name}`
        };
    }

    function groupSeriesByShow(seriesItems) {
        const showsMap = new Map();
        const result = [];

        for (let i = 0; i < seriesItems.length; i++) {
            const item = seriesItems[i];
            if (item.isSeriesGroup) {
                result.push(item);
                continue;
            }

            const meta = extractSeriesEpisodeMeta(item.name);
            const showKey = `${(item.group || '').toLowerCase()}__${meta.showTitle.toLowerCase()}`;

            if (!showsMap.has(showKey)) {
                const showObj = {
                    ...item,
                    id: `show_${Math.abs(hashCode(showKey))}`,
                    name: meta.showTitle,
                    isSeriesGroup: true,
                    seasons: {},
                    totalEpisodes: 0,
                    synopsis: generateSynopsis(meta.showTitle, item.group, 'series')
                };
                showsMap.set(showKey, showObj);
                result.push(showObj);
            }

            const show = showsMap.get(showKey);
            if (!show.seasons[meta.season]) show.seasons[meta.season] = [];

            show.seasons[meta.season].push({
                id: item.id,
                season: meta.season,
                episode: meta.episode,
                title: meta.epTitle,
                name: `${meta.showTitle} - T${meta.season}:E${String(meta.episode).padStart(2, '0')}`,
                group: item.group,
                section: 'series',
                logo: item.logo || show.logo,
                url: item.url,
                isAdult: item.isAdult
            });

            show.totalEpisodes++;
            if (!show.logo && item.logo) show.logo = item.logo;
        }

        result.forEach(show => {
            if (!show.seasons) return;
            const seasonKeys = Object.keys(show.seasons).map(Number).sort((a, b) => a - b);
            seasonKeys.forEach(sKey => {
                show.seasons[sKey].sort((a, b) => a.episode - b.episode);
            });

            if (seasonKeys.length > 0 && show.seasons[seasonKeys[0]].length > 0) {
                show.url = show.seasons[seasonKeys[0]][0].url;
            }

            const cleanGroup = (show.group || '').replace(/^(Series|Séries)\s*\|\s*/i, '').trim();
            const sCount = seasonKeys.length;
            const eCount = show.totalEpisodes || 1;
            show.badge = `${sCount} Temp · ${eCount} Episódio${eCount > 1 ? 's' : ''} · ${cleanGroup}`;
        });

        return result;
    }

    function parse(rawText, forcedSection = null) {
        if (!rawText || typeof rawText !== 'string') return [];

        const lines = rawText.split(/\r?\n/);
        const rawItems = [];
        let currentMeta = null;
        let counter = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.toUpperCase().startsWith('#EXTINF:')) {
                const logo = extractAttribute(line, 'tvg-logo');
                const groupTitle = extractAttribute(line, 'group-title') || 'Geral';
                const tvgName = extractAttribute(line, 'tvg-name');
                const tvgId = extractAttribute(line, 'tvg-id');
                const itemType = extractAttribute(line, 'type');

                const commaIndex = line.lastIndexOf(',');
                let displayName = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : '';
                if (!displayName) displayName = tvgName || `Item ${counter}`;

                currentMeta = {
                    name: displayName,
                    tvgId: tvgId,
                    group: groupTitle,
                    logo: logo,
                    isSubPlaylist: itemType.toLowerCase() === 'playlist'
                };
            } else if (!line.startsWith('#')) {
                if (/^https?:\/\//i.test(line)) {
                    const name = currentMeta ? currentMeta.name : `Stream ${counter}`;
                    const tvgId = currentMeta ? currentMeta.tvgId : '';
                    const group = currentMeta ? currentMeta.group : 'Geral';
                    const logo = currentMeta ? currentMeta.logo : '';
                    const isSubPlaylist = currentMeta ? currentMeta.isSubPlaylist : false;

                    const section = inferSection(name, group, line, forcedSection);
                    const adultFlag = isAdultContent(name, group);

                    let streamUrl = line;
                    if (!isSubPlaylist && section === 'live' && /^https?:\/\/[^\/]+\/[^\/]+\/[^\/]+\/\d+\.ts$/i.test(streamUrl)) {
                        streamUrl = streamUrl.replace(/\.ts$/i, '.m3u8');
                    }

                    rawItems.push({
                        id: `${section}_${counter}_${Math.abs(hashCode(streamUrl))}`,
                        name: name,
                        tvgId: tvgId,
                        section: section,
                        group: group,
                        logo: logo,
                        badge: buildMetaBadge(name, group, section),
                        url: streamUrl,
                        isAdult: adultFlag,
                        isSubPlaylist: isSubPlaylist,
                        synopsis: generateSynopsis(name, group, section),
                        backdropGradient: GRADIENTS[counter % GRADIENTS.length]
                    });

                    counter++;
                    currentMeta = null;
                }
            }
        }

        if (rawItems.length > 0 && rawItems.every(it => it.isSubPlaylist)) {
            return rawItems;
        }

        if (forcedSection === 'live') return deduplicateLiveChannels(rawItems);
        if (forcedSection === 'series') return groupSeriesByShow(rawItems);
        if (forcedSection === 'movies') return rawItems;

        const livePart = deduplicateLiveChannels(rawItems.filter(i => i.section === 'live'));
        const moviePart = rawItems.filter(i => i.section === 'movies');
        const seriesPart = groupSeriesByShow(rawItems.filter(i => i.section === 'series'));

        return [...livePart, ...moviePart, ...seriesPart];
    }

    /**
     * Carrega uma seção ('live', 'movies' ou 'series').
     * Para 'series' em servidores Xtream, utiliza a API oficial player_api.php para trazer pôsteres TMDB, sinopses e nomes exatos!
     */
    async function fetchSectionFromUrl(rawUrl, sectionKey = 'live') {
        const endpoints = extractXtreamEndpoints(rawUrl);

        if (endpoints) {
            // Para Séries, busca o catálogo rico com capas TMDB via player_api.php (com fallback para M3U se necessário)
            if (sectionKey === 'series') {
                try {
                    const richSeries = await fetchXtreamSeriesCatalog(endpoints);
                    if (richSeries && richSeries.length > 0) {
                        return richSeries;
                    }
                } catch (err) {
                    console.warn('Fallback para lista M3U de séries:', err);
                }
            }

            if (endpoints[sectionKey]) {
                const text = await smartFetchText(endpoints[sectionKey]);
                return parse(text, sectionKey);
            }
        }

        const text = await smartFetchText(rawUrl.trim());
        let items = parse(text, null);

        const subPlaylists = items.filter(item => item.isSubPlaylist || /playlist\.php\?/i.test(item.url));
        if (subPlaylists.length > 0 && subPlaylists.length === items.length) {
            const subText = await smartFetchText(subPlaylists[0].url.replace(/output=ts/i, 'output=m3u8'));
            items = parse(subText, 'live');
        }

        return items;
    }

    /**
     * ========================================================================
     * MOTOR DE PARSING EPG (XMLTV)
     * ========================================================================
     */
    function normalizeChannelKey(name) {
        if (!name) return '';
        return name
            .toLowerCase()
            .replace(/\[.*?\]|\(.*?\)/g, '')
            .replace(/\b(4k|uhd|fhd|hd|sd|h265|hevc|full\s*hd|ao\s*vivo|live)\b/gi, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();
    }

    function parseXmltvDate(dateStr) {
        if (!dateStr) return 0;
        const m = dateStr.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
        if (!m) return 0;
        const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ? m[7].slice(0, 3) + ':' + m[7].slice(3) : 'Z'}`;
        const ms = Date.parse(iso);
        return isNaN(ms) ? 0 : Math.floor(ms / 1000);
    }

    function decodeXmlEntities(str) {
        if (!str) return '';
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .trim();
    }

    function parseXMLTV(xmlText) {
        const nameToXmlId = new Map();
        const programmesByChannelId = new Map();

        if (!xmlText || typeof xmlText !== 'string') {
            return { nameToXmlId, programmesByChannelId, count: 0 };
        }

        const channelRegex = /<channel\s+[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/channel>/gi;
        let chMatch;
        while ((chMatch = channelRegex.exec(xmlText)) !== null) {
            const xmlId = decodeXmlEntities(chMatch[1]).trim();
            if (!xmlId) continue;

            const body = chMatch[2];
            const dnRegex = /<display-name[^>]*>([\s\S]*?)<\/display-name>/gi;
            let dnMatch;
            while ((dnMatch = dnRegex.exec(body)) !== null) {
                const displayName = decodeXmlEntities(dnMatch[1]);
                const cleanKey = normalizeChannelKey(displayName);
                if (cleanKey) nameToXmlId.set(cleanKey, xmlId.toLowerCase());
            }
            const idBase = normalizeChannelKey(xmlId.split('.')[0]);
            if (idBase && !nameToXmlId.has(idBase)) {
                nameToXmlId.set(idBase, xmlId.toLowerCase());
            }
        }

        const progRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/gi;
        let pMatch;
        let totalProgrammes = 0;

        while ((pMatch = progRegex.exec(xmlText)) !== null) {
            const attrs = pMatch[1];
            const body = pMatch[2];

            const chAttr = extractAttribute(attrs, 'channel');
            if (!chAttr) continue;
            const chKey = chAttr.toLowerCase();

            let startTs = parseInt(extractAttribute(attrs, 'start_timestamp'), 10);
            let stopTs = parseInt(extractAttribute(attrs, 'stop_timestamp'), 10);

            if (!startTs || isNaN(startTs)) startTs = parseXmltvDate(extractAttribute(attrs, 'start'));
            if (!stopTs || isNaN(stopTs)) stopTs = parseXmltvDate(extractAttribute(attrs, 'stop'));
            if (!startTs || !stopTs) continue;

            const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const descMatch = body.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);

            const title = titleMatch ? decodeXmlEntities(titleMatch[1]) : 'Programação Ao Vivo';
            const desc = descMatch ? decodeXmlEntities(descMatch[1]) : '';

            if (!programmesByChannelId.has(chKey)) programmesByChannelId.set(chKey, []);
            programmesByChannelId.get(chKey).push({ start: startTs, stop: stopTs, title, desc });
            totalProgrammes++;
        }

        programmesByChannelId.forEach(list => list.sort((a, b) => a.start - b.start));
        return { nameToXmlId, programmesByChannelId, count: totalProgrammes };
    }

    function getChannelEPG(channel, epgData) {
        if (!channel || channel.section !== 'live') return null;

        if (epgData && epgData.programmesByChannelId && epgData.programmesByChannelId.size > 0) {
            const cleanName = normalizeChannelKey(channel.name);
            let xmlId = (channel.tvgId || '').toLowerCase();

            if (!xmlId || !epgData.programmesByChannelId.has(xmlId)) {
                xmlId = epgData.nameToXmlId.get(cleanName) || '';
            }

            if (!xmlId) {
                for (const [k, val] of epgData.nameToXmlId.entries()) {
                    if (cleanName && (cleanName.startsWith(k) || k.startsWith(cleanName)) && k.length >= 3) {
                        xmlId = val;
                        break;
                    }
                }
            }

            const list = xmlId ? epgData.programmesByChannelId.get(xmlId) : null;
            if (list && list.length > 0) return buildCurrentAndUpcomingFromList(list);
        }

        return buildSimulatedSchedule(channel);
    }

    function buildCurrentAndUpcomingFromList(list) {
        const nowSec = Math.floor(Date.now() / 1000);
        let currentIndex = list.findIndex(p => nowSec >= p.start && nowSec < p.stop);

        if (currentIndex === -1) {
            const nowDate = new Date();
            const nowMinutesOfDay = nowDate.getHours() * 60 + nowDate.getMinutes();

            currentIndex = list.findIndex(p => {
                const dStart = new Date(p.start * 1000);
                const dStop = new Date(p.stop * 1000);
                const startMin = dStart.getHours() * 60 + dStart.getMinutes();
                let stopMin = dStop.getHours() * 60 + dStop.getMinutes();
                if (stopMin < startMin) stopMin += 1440;
                return nowMinutesOfDay >= startMin && nowMinutesOfDay < stopMin;
            });
        }

        if (currentIndex === -1) currentIndex = 0;

        const currentProg = list[currentIndex];
        const nextProg = list[currentIndex + 1] || list[0];

        const duration = Math.max(60, currentProg.stop - currentProg.start);
        let progress = Math.round(((nowSec - currentProg.start) / duration) * 100);
        if (progress < 5 || progress > 98) {
            const mins = new Date().getMinutes();
            progress = Math.min(95, Math.max(10, Math.round((mins / 60) * 100)));
        }

        const upcoming = [];
        for (let i = currentIndex; i < Math.min(list.length, currentIndex + 6); i++) {
            const p = list[i];
            upcoming.push({
                timeRange: `${formatTime(p.start)} - ${formatTime(p.stop)}`,
                title: p.title,
                desc: p.desc || 'Transmissão programada na grade oficial do canal.',
                isCurrent: i === currentIndex
            });
        }

        return {
            now: {
                title: currentProg.title,
                desc: currentProg.desc || 'Programação em exibição ao vivo.',
                timeRange: `${formatTime(currentProg.start)} - ${formatTime(currentProg.stop)}`,
                progress
            },
            next: nextProg ? {
                title: nextProg.title,
                timeRange: `${formatTime(nextProg.start)} - ${formatTime(nextProg.stop)}`
            } : null,
            schedule: upcoming
        };
    }

    function buildSimulatedSchedule(channel) {
        const now = new Date();
        const hour = now.getHours();
        const min = now.getMinutes();
        const progress = Math.min(95, Math.max(8, Math.round((min / 60) * 100)));

        const cleanName = channel.name.replace(/\b(4K|FHD|HD|SD|\[H265\])\b/gi, '').trim();
        const pad = n => String(n % 24).padStart(2, '0');

        const slots = [
            {
                timeRange: `${pad(hour)}:00 - ${pad(hour + 1)}:00`,
                title: `${cleanName} • Programação Ao Vivo`,
                desc: `Transmissão principal de ${cleanName} com cobertura em tempo real.`,
                isCurrent: true
            },
            {
                timeRange: `${pad(hour + 1)}:00 - ${pad(hour + 2)}:00`,
                title: `Destaque ${cleanName}`,
                desc: `Destaques da programação e blocos especiais da grade de ${channel.group}.`,
                isCurrent: false
            },
            {
                timeRange: `${pad(hour + 2)}:00 - ${pad(hour + 3)}:00`,
                title: `Sessão Contínua • ${cleanName}`,
                desc: `Programação sequencial na grade oficial do canal.`,
                isCurrent: false
            }
        ];

        return {
            now: {
                title: slots[0].title,
                desc: slots[0].desc,
                timeRange: slots[0].timeRange,
                progress
            },
            next: {
                title: slots[1].title,
                timeRange: slots[1].timeRange
            },
            schedule: slots
        };
    }

    function formatTime(tsSeconds) {
        const d = new Date(tsSeconds * 1000);
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function isMultiSectionXtreamUrl(rawUrl) {
        return Boolean(extractXtreamEndpoints(rawUrl));
    }

    function hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }

    function getDefaultChannels() {
        return JSON.parse(JSON.stringify(DEFAULT_CHANNELS));
    }

    return {
        parse,
        isAdultContent,
        extractXtreamEndpoints,
        isMultiSectionXtreamUrl,
        fetchSectionFromUrl,
        fetchSeriesEpisodesOnDemand,
        parseXMLTV,
        getChannelEPG,
        getDefaultChannels
    };
})();
