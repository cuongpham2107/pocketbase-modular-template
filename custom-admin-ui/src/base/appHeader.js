import { t as i18nT, setLang } from "../i18n";

export function appHeader() {
    return () => {
        if (!app.store._ready || !app.store.showHeader || !app.store.superuser?.id) {
            return;
        }

        return t.header(
            {
                pbEvent: "appHeader",
                rid: "appHeader",
                className: "app-header accent-surface",
                onmount: async (el) => {
                    await new Promise((r) => setTimeout(r, 0));

                    el._scrollToActiveMenuItem = function() {
                        el?.querySelector(".app-main-nav .header-link.active")?.scrollIntoView();
                    };
                    el._scrollToActiveMenuItem();
                    window.addEventListener("hashchange", el._scrollToActiveMenuItem);
                },
                onunmount: (el) => {
                    window.removeEventListener("hashchange", el?._scrollToActiveMenuItem);
                },
            },
            t.a(
                { href: "#/", className: "logo" },
                t.img({ src: () => app.store.headerLogo, alt: "App logo" }),
                t.span({ style: "font-weight: 700; font-size: 14px; margin-left: 6px; color: #fff; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 6px;" }, "CuongPham Admin"),
            ),
            t.nav(
                {
                    pbEvent: "mainNav",
                    className: "app-main-nav",
                },
                () => {
                    return app.store.headerLinks.map((link) => {
                        const isLocal = link.href.startsWith("#/");

                        return t.a(
                            {
                                href: () => link.href,
                                target: () => !isLocal ? "_blank" : undefined,
                                rel: () => !isLocal ? "noopener noreferrer" : undefined,
                                className: (el) => {
                                    const isActive = link.isActive?.(el) || app.utils.isActivePath(link.href);
                                    return `header-link ${isActive ? "active" : ""}`;
                                },
                            },
                            () => {
                                if (link.icon) {
                                    return t.i({ className: link.icon, ariaHidden: true });
                                }
                            },
                            t.span({ className: "txt" }, () => link.label),
                        );
                    });
                },
            ),
            t.div({ className: "flex-fill app-header-separator" }),
            langPickerButton(),
            colorSchemeButton(),
            t.button(
                {
                    type: "button",
                    className: "header-link logged-user txt-normal",
                    "html-popovertarget": "logged-user-dropdown",
                },
                t.span({ className: "superuser-name txt-ellipsis" }, () => app.store.superuser?.email),
                t.i({ className: "ri-arrow-drop-down-line", ariaHidden: true }),
            ),
            t.div(
                {
                    pbEvent: "loggedUserDropdown",
                    id: "logged-user-dropdown",
                    className: "dropdown sm nowrap logged-user-dropdown",
                    popover: "auto",
                },
                t.a(
                    {
                        className: "dropdown-item dropdown-item-manage",
                        href: "#/collections?collection=_superusers",
                        onclick: (e) => {
                            e.target.closest(".dropdown").hidePopover();
                        },
                    },
                    t.i({ className: "ri-group-line", ariaHidden: true }),
                    t.span({ className: "txt" }, () => i18nT("manageSuperusers", "Manage superusers")),
                ),
                t.hr(),
                t.button(
                    {
                        type: "button",
                        className: "dropdown-item txt-danger dropdown-item-logout",
                        onclick: () => app.pb.authStore.clear(),
                    },
                    t.i({ className: "ri-logout-circle-line", ariaHidden: true }),
                    t.span({ className: "txt" }, () => i18nT("logout", "Logout")),
                ),
            ),
        );
    };
}

function colorSchemeButton() {
    const options = [
        { value: "light", icon: "ri-sun-line", label: "Light" },
        { value: "dark", icon: "ri-moon-line", label: "Dark" },
        { value: "", icon: "ri-subtract-line", label: "Auto" },
    ];

    return [
        t.button(
            {
                type: "button",
                className: "header-link color-scheme-picker",
                "html-popovertarget": "color-scheme-dropdown",
                title: "Color scheme",
            },
            t.i({
                className: () => app.store.activeColorScheme == "dark" ? "ri-moon-line" : "ri-sun-line",
                ariaHidden: true,
            }),
        ),
        t.div(
            {
                pbEvent: "colorSchemeDropdown",
                id: "color-scheme-dropdown",
                className: "dropdown sm nowrap color-scheme-dropdown",
                popover: "auto",
            },
            () => {
                return options.map((opt) => {
                    return t.button(
                        {
                            type: "button",
                            className: () =>
                                `dropdown-item dropdown-item-light ${
                                    app.store.userColorScheme == opt.value ? "active" : ""
                                }`,
                            onclick: (e) => {
                                e.target.closest(".dropdown").hidePopover();
                                app.store.userColorScheme = opt.value;
                            },
                        },
                        t.i({ className: opt.icon, ariaHidden: true }),
                        t.span({ className: "txt" }, opt.label),
                    );
                });
            },
        ),
    ];
}

function langPickerButton() {
    const options = [
        { value: "vi", flag: "🇻🇳", label: "Tiếng Việt" },
        { value: "en", flag: "🇬🇧", label: "English" },
    ];

    return [
        t.button(
            {
                type: "button",
                className: "header-link lang-picker-btn",
                "html-popovertarget": "lang-picker-dropdown",
                title: () => i18nT("language", "Language"),
                style: "display: inline-flex; align-items: center; gap: 3px; font-weight: 600;",
            },
            t.span({ style: "font-size: 13px;" }, () => (app.store.lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN")),
            t.i({ className: "ri-arrow-drop-down-line", ariaHidden: true }),
        ),
        t.div(
            {
                pbEvent: "langPickerDropdown",
                id: "lang-picker-dropdown",
                className: "dropdown sm nowrap lang-picker-dropdown",
                popover: "auto",
            },
            () => {
                return options.map((opt) => {
                    return t.button(
                        {
                            type: "button",
                            className: () =>
                                `dropdown-item ${
                                    app.store.lang == opt.value ? "active" : ""
                                }`,
                            style: "display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 14px;",
                            onclick: (e) => {
                                e.target.closest(".dropdown").hidePopover();
                                setLang(opt.value);
                            },
                        },
                        t.span({ style: "font-size: 16px;" }, opt.flag),
                        t.span({ className: "txt" }, opt.label),
                    );
                });
            },
        ),
    ];
}
