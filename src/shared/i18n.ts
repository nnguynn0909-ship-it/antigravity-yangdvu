/**
 * Antigravity Cockpit - 国际化支持
 * i18n implementation supporting 15 languages
 */

import * as vscode from 'vscode';
import { en, zhCN, ja, es, de, fr, ptBR, ru, ko, it, zhTW, tr, pl, cs, ar, vi } from './translations';

/** 支持的语言 */
export type SupportedLocale = 
    | 'en' 
    | 'zh-cn' 
    | 'ja' 
    | 'es' 
    | 'de' 
    | 'fr' 
    | 'pt-br' 
    | 'ru' 
    | 'ko' 
    | 'it' 
    | 'zh-tw' 
    | 'tr' 
    | 'pl' 
    | 'cs'
    | 'ar'
    | 'vi';

/** 语言显示名称映射 */
export const localeDisplayNames: Record<SupportedLocale, string> = {
    'en': 'English',
    'zh-cn': '简体中文',
    'zh-tw': '繁體中文',
    'ja': '日本語',
    'ko': '한국어',
    'de': 'Deutsch',
    'fr': 'Français',
    'es': 'Español',
    'pt-br': 'Português (Brasil)',
    'ru': 'Русский',
    'it': 'Italiano',
    'tr': 'Türkçe',
    'pl': 'Polski',
    'cs': 'Čeština',
    'ar': 'اللغة العربية',
    'vi': 'Tiếng Việt',
};

/** 翻译键值对 */
interface TranslationMap {
    [key: string]: string;
}

/** 翻译资源 */
const translations: Record<SupportedLocale, TranslationMap> = {
    'en': en,
    'zh-cn': zhCN,
    'ja': ja,
    'es': es,
    'de': de,
    'fr': fr,
    'pt-br': ptBR,
    'ru': ru,
    'ko': ko,
    'it': it,
    'zh-tw': zhTW,
    'tr': tr,
    'pl': pl,
    'cs': cs,
    'ar': ar,
    'vi': vi,
};

/** 语言代码映射 - 将 VSCode 语言代码映射到我们支持的语言 */
const localeMapping: Record<string, SupportedLocale> = {
    'en': 'en',
    'en-us': 'en',
    'en-gb': 'en',
    'zh-cn': 'zh-cn',
    'zh-hans': 'zh-cn',
    'zh-tw': 'zh-tw',
    'zh-hant': 'zh-tw',
    'ja': 'ja',
    'es': 'es',
    'de': 'de',
    'fr': 'fr',
    'pt-br': 'pt-br',
    'pt': 'pt-br',
    'ru': 'ru',
    'ko': 'ko',
    'it': 'it',
    'tr': 'tr',
    'pl': 'pl',
    'cs': 'cs',
    'ar': 'ar',
    'vi': 'vi',
    'vi-vn': 'vi',
};

/**
 * 规范化外部传入的语言值
 */
export function normalizeLocaleInput(languageSetting: string): string {
    const trimmed = languageSetting.trim().toLowerCase();
    if (!trimmed) {
        return languageSetting;
    }
    if (trimmed === 'auto') {
        return 'auto';
    }
    if (localeMapping[trimmed]) {
        return localeMapping[trimmed];
    }
    const prefix = trimmed.split('-')[0];
    if (localeMapping[prefix]) {
        return localeMapping[prefix];
    }
    return trimmed;
}

/** i18n 服务类 */
class I18nService {
    private currentLocale: SupportedLocale = 'vi';
    private manualLocale: string = 'vi'; // Mặc định Tiếng Việt

    constructor() {
        this.detectLocale();
    }

    /**
     * 检测当前语言环境（基于 VS Code 设置）
     */
    private detectLocale(): void {
        const vscodeLocale = vscode.env.language.toLowerCase();
        
        // Nếu người dùng cấu hình thủ công khác auto, giữ nguyên
        if (this.manualLocale !== 'auto' && this.manualLocale !== 'vi') {
            return;
        }

        // Mặc định luôn ưu tiên Tiếng Việt
        if (vscodeLocale.startsWith('vi')) {
            this.currentLocale = 'vi';
            return;
        }

        // Mặc định dùng Tiếng Việt
        this.currentLocale = 'vi';
    }

    /**
     * 应用语言设置
     * @param languageSetting 语言设置值，'auto' 跟随 VS Code，其他为具体语言代码
     */
    applyLanguageSetting(languageSetting: string): boolean {
        const previousLocale = this.currentLocale;
        this.manualLocale = languageSetting;
        
        if (languageSetting === 'auto') {
            // 跟随 VS Code
            this.detectLocale();
        } else {
            // 验证是否为支持的语言
            const supportedLocales = Object.keys(translations) as SupportedLocale[];
            if (supportedLocales.includes(languageSetting as SupportedLocale)) {
                this.currentLocale = languageSetting as SupportedLocale;
            } else {
                // 不支持的语言，回退到 VS Code
                this.detectLocale();
            }
        }

        return this.currentLocale !== previousLocale;
    }

    /**
     * 获取当前手动设置的语言
     */
    getManualLocale(): string {
        return this.manualLocale;
    }

    /**
     * 获取翻译文本
     * @param key 翻译键
     * @param params 替换参数
     */
    t(key: string, params?: Record<string, string | number>): string {
        const translation = translations[this.currentLocale]?.[key] 
            || translations['en'][key] 
            || key;

        if (!params) {
            return translation;
        }

        // 替换参数 {param} -> value
        return Object.entries(params).reduce(
            (text, [paramKey, paramValue]) => 
                text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)),
            translation,
        );
    }

    /**
     * 获取当前语言
     */
    getLocale(): SupportedLocale {
        return this.currentLocale;
    }

    /**
     * 设置语言
     */
    setLocale(locale: SupportedLocale): void {
        this.currentLocale = locale;
    }

    /**
     * 获取所有翻译（用于 Webview）
     */
    getAllTranslations(): TranslationMap {
        return { ...translations['en'], ...translations[this.currentLocale] };
    }

    /**
     * 获取所有支持的语言列表
     */
    getSupportedLocales(): SupportedLocale[] {
        return Object.keys(translations) as SupportedLocale[];
    }

    /**
     * 获取语言显示名称
     */
    getLocaleDisplayName(locale: SupportedLocale): string {
        return localeDisplayNames[locale] || locale;
    }
}

// 导出单例
export const i18n = new I18nService();

// 便捷函数
export const t = (key: string, params?: Record<string, string | number>) => i18n.t(key, params);
