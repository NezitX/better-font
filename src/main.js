import plugin from "../plugin.json";

const appSettings = acode.require("settings");
const fs = acode.require("fs");

class BetterFont {
    static FONT_TYPES = ['ttf'];
    async init() {
        if (!appSettings.value[plugin.id]) {
            appSettings.value[plugin.id] = {};
            appSettings.update(false);
        }
    }

    async destroy() {
        delete appSettings.value[plugin.id];
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
            select: [
              "choose file",
              "raw url"
            ]
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

        this.type = fontType;
        this.name = file.filename;
 
        const content = await fs(file.uri).readFile();
        await fs(window.DATA_STORAGE).createFile("font." + fontType, content);
    }
    
    async onRawUrl() {
      
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
