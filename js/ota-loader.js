/**
 * ============================================================================
 * MPKA Iptv - Smart OTA Bootloader (GitHub Over-The-Air Hot Update Engine)
 * ============================================================================
 * Permite que a TV Samsung Tizen baixe e execute atualizações de CSS e JS
 * diretamente do GitHub sem precisar reinstalar o pacote .wgt via PC/Pendrive.
 * Se houver qualquer falha no código baixado, faz fallback automático para
 * os arquivos originais de fábrica do pacote .wgt.
 */
(function () {
    'use strict';

    window.MPKA_FACTORY_VERSION = '2.4.0';
    var OTA_STORAGE_KEY = 'mpka_ota_bundle_v1';

    function compareSemver(a, b) {
        var pa = String(a || '0.0.0').replace(/^v/i, '').split('.').map(Number);
        var pb = String(b || '0.0.0').replace(/^v/i, '').split('.').map(Number);
        for (var i = 0; i < 3; i++) {
            var na = pa[i] || 0;
            var nb = pb[i] || 0;
            if (na > nb) return 1;
            if (na < nb) return -1;
        }
        return 0;
    }

    function loadFactoryScripts() {
        window.MPKA_ACTIVE_VERSION = window.MPKA_FACTORY_VERSION;
        window.MPKA_OTA_SOURCE = 'Fábrica (.wgt)';
        var s1 = document.createElement('script');
        s1.src = 'js/parser.js';
        s1.onload = function () {
            var s2 = document.createElement('script');
            s2.src = 'js/app.js';
            document.body.appendChild(s2);
        };
        document.body.appendChild(s1);
    }

    try {
        var rawBundle = localStorage.getItem(OTA_STORAGE_KEY);
        if (!rawBundle) {
            loadFactoryScripts();
            return;
        }

        var bundle = JSON.parse(rawBundle);
        if (
            !bundle ||
            !bundle.version ||
            !bundle.parserJs ||
            !bundle.appJs ||
            compareSemver(bundle.version, window.MPKA_FACTORY_VERSION) < 0
        ) {
            loadFactoryScripts();
            return;
        }

        // Injeta CSS atualizado do GitHub OTA, se presente
        if (bundle.css) {
            var styleEl = document.createElement('style');
            styleEl.id = 'mpka-ota-css';
            styleEl.textContent = bundle.css;
            document.head.appendChild(styleEl);
        }

        window.MPKA_ACTIVE_VERSION = bundle.version;
        window.MPKA_OTA_SOURCE = 'GitHub OTA (' + (bundle.updatedAt || 'Ativo') + ')';

        // Executa parser.js e app.js da versão OTA com fallback seguro
        var parserScript = document.createElement('script');
        parserScript.text = bundle.parserJs;
        document.body.appendChild(parserScript);

        var appScript = document.createElement('script');
        appScript.text = bundle.appJs;
        document.body.appendChild(appScript);

        console.log('[MPKA OTA] Inicializado via GitHub OTA v' + bundle.version);
    } catch (err) {
        console.error('[MPKA OTA] Erro ao carregar pacote OTA, restaurando versão de fábrica:', err);
        localStorage.removeItem(OTA_STORAGE_KEY);
        loadFactoryScripts();
    }
})();
