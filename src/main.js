import plugin from "../plugin.json";

const appSettings = acode.require("settings");
const fs = acode.require("fs");
const prompt = acode.require("prompt");

class BetterFont {
    static FONT_TYPES = ["ttf", "url"];

    type = null;
    async init() {
        if (!appSettings.value[plugin.id]) {
            appSettings.value[plugin.id] = {};
            appSettings.update(false);
        }
    }

    async destroy() {
        delete appSettings.value[plugin.id];
        this.$style?.remove();

        if (this.type) {
            await fs(window.DATA_STORAGE + `font.${this.type}`).delete();
        }
    }

    get settings() {
        return appSettings.value[plugin.id];
    }

    settingsList() {
        return [
            {
                key: "change_font",
                text: "Change app font",
                value: this.settings?.fontname,
                select: ["choose file", "raw url"]
            }
        ];
    }

    async onSettingCallback(_, value) {
        if (value === "choose file") {
            await this.onChooseFile();
        } else {
            await this.onRawUrl();
        }
    }

    async onChooseFile() {
        const file = await acode.fileBrowser("file", "Select a font");
        const fontType = file.type.split("/").pop();

        if (this.type) {
            await fs(window.DATA_STORAGE + `font.${this.type}`).delete();
        }

        const content = await fs(file.uri).readFile();
        await fs(window.DATA_STORAGE).createFile(`font.${fontType}`, content);

        this.type = fontType;
        this.settings.font = file.filename.slice(
            0,
            file.filename.lastIndexOf(".")
        );

        appSettings.update(true);
        await this.loadFont();
    }

    async onRawUrl() {
        const url = await prompt("font url", "", "url", {
            required: true,
            placeholder: "https://..."
        });

        if (this.type) {
            await fs(window.DATA_STORAGE + `font.${this.type}`).delete();
        }

        const fontType = "url";
        await fs(window.DATA_STORAGE).createFile(`font.${fontType}`, url);

        this.type = fontType;
        this.settings.font = `url:${url}`;

        appSettings.update(true);
        await this.loadFont();
    }

    async loadFont() {
        this.$style?.remove();

        if (this.type === "url") {
            const url = await fs(
                window.DATA_STORAGE + `font.${this.type}`
            ).readFile("utf-8");
            this.$style = tag("style", {
                innerHTML: `
                    @font-face {
                        font-family: 'better-font';
                        src: url('${url}');
                    }

                    body {
                        font-family: 'better-font';
                    }`
            });
        } else {
            const content = await fs(
                window.DATA_STORAGE + `font.${this.type}`
            ).readFile("base64");
            this.$style = tag("style", {
                innerHTML: `
                    @font-face {
                        font-family: 'better-font';
                        src: url(data:font/${this.type};base64,${content}) format('${this.type}');
                    }

                    body {
                        font-family: 'better-font';
                    }`
            });
        }

        document.head.append(this.$style);
    }
}

if (window.acode) {
    const acodePlugin = new BetterFont();
    acode.setPluginInit(
        plugin.id,
        async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
            acodePlugin.baseUrl = baseUrl.endsWith("/")
                ? baseUrl
                : baseUrl + "/";
            await acodePlugin.init($page, cacheFile, cacheFileUrl);
        },
        {
            list: acodePlugin.settingsList(),
            cb: acodePlugin.onSettingCallback.bind(acodePlugin)
        }
    );

    acode.setPluginUnmount(plugin.id, () => {
        acodePlugin.destroy();
    });
}
