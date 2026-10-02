(() => {
    const root = document.documentElement;
    const storageKey = 'landppt-theme-mode';
    const modes = new Set(['light', 'dark', 'system']);
    const labels = {
        light: '浅色',
        dark: '深色',
        system: '系统',
    };

    const readMode = () => {
        try {
            const storedMode = window.localStorage.getItem(storageKey);
            return modes.has(storedMode) ? storedMode : 'system';
        } catch (error) {
            // Keep the in-memory mode when storage is unavailable.
            return modes.has(root.dataset.themeMode) ? root.dataset.themeMode : 'system';
        }
    };

    const prefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;

    const apply = (requestedMode, persist = false) => {
        const mode = modes.has(requestedMode) ? requestedMode : 'system';
        if (persist) {
            try {
                window.localStorage.setItem(storageKey, mode);
            } catch (error) {
                // A theme still works for the current page if persistence is blocked.
            }
        }

        const resolved = mode === 'dark' || (mode === 'system' && prefersDark()) ? 'dark' : 'light';
        root.dataset.themeMode = mode;
        root.dataset.resolvedTheme = resolved;
        root.classList.toggle('dark', resolved === 'dark');
        root.style.colorScheme = resolved;

        document.querySelectorAll('[data-theme-current]').forEach((element) => {
            element.textContent = labels[mode];
            element.setAttribute('title', `当前主题：${labels[mode]}`);
        });
        document.querySelectorAll('[data-theme-choice]').forEach((button) => {
            const isActive = button.dataset.themeChoice === mode;
            button.classList.toggle('is-active', isActive);
            const check = button.querySelector('[data-theme-check]');
            if (check) check.hidden = !isActive;
            if (button.getAttribute('role') === 'menuitemradio') {
                button.setAttribute('aria-checked', String(isActive));
            } else {
                button.setAttribute('aria-pressed', String(isActive));
            }
        });

        window.dispatchEvent(new CustomEvent('landppt:themechange', {
            detail: { mode, resolved },
        }));
    };

    const init = () => {
        apply(readMode());
        document.querySelectorAll('[data-theme-choice]').forEach((button) => {
            button.addEventListener('click', () => {
                apply(button.dataset.themeChoice, true);
                const menu = button.closest('details');
                if (menu) {
                    menu.open = false;
                }
            });
        });
    };

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (mediaQuery) {
        const onSystemPreferenceChange = () => {
            if (readMode() === 'system') {
                apply('system');
            }
        };
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', onSystemPreferenceChange);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(onSystemPreferenceChange);
        }
    }

    window.addEventListener('storage', (event) => {
        if (event.key === storageKey || event.key === null) {
            apply(readMode());
        }
    });

    window.LandPPTTheme = {
        getMode: readMode,
        setMode: (mode) => apply(mode, true),
        apply,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
