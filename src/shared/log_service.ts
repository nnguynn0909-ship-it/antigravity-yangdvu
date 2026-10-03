/**
 * Antigravity Cockpit - 日志服务
 * 支持配置化日志级别，输出到 VS Code OutputChannel
 */

import * as vscode from 'vscode';
import { LOG_LEVELS } from './constants';

/** 日志级别枚举 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/** 日志级别字符串到枚举的映射 */
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
    [LOG_LEVELS.DEBUG]: LogLevel.DEBUG,
    [LOG_LEVELS.INFO]: LogLevel.INFO,
    [LOG_LEVELS.WARN]: LogLevel.WARN,
    [LOG_LEVELS.ERROR]: LogLevel.ERROR,
};

/** 日志服务类 */
class Logger {
    private outputChannel: vscode.OutputChannel | null = null;
    private logLevel: LogLevel = LogLevel.INFO;
    private isInitialized = false;
    private configDisposable?: vscode.Disposable;

    /**
     * 初始化日志频道
     */
    init(): void {
        if (this.isInitialized) {
            return;
        }
        
        this.outputChannel = vscode.window.createOutputChannel('Antigravity YangDvu');
        this.isInitialized = true;

        // 监听配置变化（保存 Disposable 以便清理）
        this.configDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('agCockpit.logLevel')) {
                this.updateLogLevel();
            }
        });

        // 初始化日志级别
        this.updateLogLevel();
    }

    /**
     * 从配置更新日志级别
     */
    private updateLogLevel(): void {
        const config = vscode.workspace.getConfiguration('agCockpit');
        const levelStr = config.get<string>('logLevel', LOG_LEVELS.INFO);
        this.logLevel = LOG_LEVEL_MAP[levelStr] ?? LogLevel.INFO;
    }

    /**
     * 设置日志级别
     */
    setLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * 获取当前日志级别
     */
    getLevel(): LogLevel {
        return this.logLevel;
    }

    /**
     * 获取当前时间戳
     */
    private getTimestamp(): string {
        const now = new Date();
        return now.toISOString().replace('T', ' ').substring(0, 19);
    }

    /**
     * 格式化日志消息
     */
    private formatMessage(level: string, message: string, ...args: unknown[]): string {
        const timestamp = this.getTimestamp();
        let formatted = `[${timestamp}] [${level}] ${message}`;

        if (args.length > 0) {
            const argsStr = args.map(arg => {
                if (arg instanceof Error) {
                    return `${arg.message}\n${arg.stack || ''}`;
                }
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
            formatted += ` ${argsStr}`;
        }

        return formatted;
    }

    /**
     * 输出日志
     */
    private log(level: LogLevel, levelStr: string, message: string, ...args: unknown[]): void {
        if (level < this.logLevel) {
            return;
        }

        const formatted = this.formatMessage(levelStr, message, ...args);

        if (this.outputChannel) {
            this.outputChannel.appendLine(formatted);
        }

        // 同时输出到控制台（开发者工具）
        switch (level) {
            case LogLevel.DEBUG:
                console.log(formatted);
                break;
            case LogLevel.INFO:
                console.info(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            case LogLevel.ERROR:
                console.error(formatted);
                break;
        }
    }

    /**
     * 调试日志
     */
    debug(message: string, ...args: unknown[]): void {
        this.log(LogLevel.DEBUG, 'DEBUG', message, ...args);
    }

    /**
     * 信息日志
     */
    info(message: string, ...args: unknown[]): void {
        this.log(LogLevel.INFO, 'INFO', message, ...args);
    }

    /**
     * 警告日志
     */
    warn(message: string, ...args: unknown[]): void {
        this.log(LogLevel.WARN, 'WARN', message, ...args);
    }

    /**
     * 错误日志
     */
    error(message: string, ...args: unknown[]): void {
        this.log(LogLevel.ERROR, 'ERROR', message, ...args);
    }

    /**
     * 显示日志面板
     */
    show(): void {
        this.outputChannel?.show();
    }

    /**
     * 隐藏日志面板
     */
    hide(): void {
        this.outputChannel?.hide();
    }

    /**
     * 清空日志
     */
    clear(): void {
        this.outputChannel?.clear();
    }

    /**
     * 销毁日志频道
     */
    dispose(): void {
        this.configDisposable?.dispose();
        this.configDisposable = undefined;
        this.outputChannel?.dispose();
        this.outputChannel = null;
        this.isInitialized = false;
    }

    /**
     * 分组日志开始
     */
    group(label: string): void {
        this.outputChannel?.appendLine(`\n${'='.repeat(50)}`);
        this.outputChannel?.appendLine(`📁 ${label}`);
        this.outputChannel?.appendLine('='.repeat(50));
    }

    /**
     * 分组日志结束
     */
    groupEnd(): void {
        this.outputChannel?.appendLine('-'.repeat(50) + '\n');
    }
}

// 导出单例
export const logger = new Logger();
