/**
 * Antigravity Cockpit - Update Service
 * Dịch vụ kiểm tra và tự động cập nhật tiện ích trực tiếp từ GitHub Releases (Bản quyền YangDvu)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
import { logger } from '../shared/log_service';
import * as packageJson from '../../package.json';

const GITHUB_REPO = 'nnguynn0909-ship-it/antigravity-yangdvu';
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

const SKIPPED_VERSION_KEY = 'update.skippedVersion';
const REMIND_LATER_KEY = 'update.remindLaterTime';
const REMIND_LATER_INTERVAL_MS = 4 * 3600 * 1000; // 4 giờ nhắc lại nếu chọn "Để sau"

interface GitHubAsset {
    name: string;
    browser_download_url: string;
    size: number;
}

interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string;
    assets: GitHubAsset[];
}

/**
 * So sánh 2 phiên bản theo semver (trả về true nếu remote > current)
 */
function isNewerVersion(remote: string, current: string): boolean {
    const parse = (v: string): number[] => {
        return v.replace(/^[^\d]*/, '').split('.').map(n => parseInt(n, 10) || 0);
    };

    const r = parse(remote);
    const c = parse(current);

    for (let i = 0; i < Math.max(r.length, c.length); i++) {
        const rv = r[i] || 0;
        const cv = c[i] || 0;
        if (rv > cv) {return true;}
        if (rv < cv) {return false;}
    }
    return false;
}

export class UpdateService {
    private context!: vscode.ExtensionContext;
    private timer?: NodeJS.Timeout;
    private checking = false;

    initialize(context: vscode.ExtensionContext): void {
        this.context = context;

        // Đăng ký lệnh kiểm tra cập nhật thủ công từ Command Palette
        context.subscriptions.push(
            vscode.commands.registerCommand('agCockpit.checkUpdate', async () => {
                await this.checkForUpdates(true);
            }),
        );

        // Chờ 10 giây sau khi khởi động IDE rồi mới kiểm tra cập nhật ngầm
        setTimeout(() => {
            void this.checkForUpdates(false);
        }, 10000);

        // Định kỳ kiểm tra mỗi 4 giờ
        this.timer = setInterval(() => {
            void this.checkForUpdates(false);
        }, REMIND_LATER_INTERVAL_MS);

        context.subscriptions.push({
            dispose: () => {
                if (this.timer) {
                    clearInterval(this.timer);
                }
            },
        });
    }

    /**
     * Kiểm tra bản cập nhật
     * @param manual Người dùng bấm kiểm tra thủ công hay do hệ thống tự kiểm tra
     */
    async checkForUpdates(manual = false): Promise<void> {
        if (this.checking) {
            return;
        }
        this.checking = true;

        try {
            const currentVersion = this.getCurrentVersion();
            logger.info(`[UpdateService] Checking updates... (Current: v${currentVersion})`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const res = await fetch(RELEASES_API, {
                headers: {
                    'User-Agent': 'Antigravity-YangDvu-Extension',
                    'Accept': 'application/vnd.github.v3+json',
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!res.ok) {
                if (manual) {
                    void vscode.window.showWarningMessage(
                        `Không thể kiểm tra bản cập nhật (HTTP ${res.status}). Vui lòng thử lại sau!`,
                    );
                }
                return;
            }

            const release = (await res.json()) as GitHubRelease;
            const latestTag = release.tag_name || '';
            const vsixAsset = release.assets?.find(a => a.name.toLowerCase().endsWith('.vsix'));

            if (!latestTag || !vsixAsset) {
                if (manual) {
                    void vscode.window.showInformationMessage('Không tìm thấy gói cập nhật hợp lệ trên GitHub.');
                }
                return;
            }

            const hasNewer = isNewerVersion(latestTag, currentVersion);
            if (!hasNewer) {
                if (manual) {
                    void vscode.window.showInformationMessage(
                        `Bạn đang sử dụng phiên bản mới nhất (v${currentVersion})!`,
                    );
                }
                return;
            }

            // Kiểm tra trạng thái nếu kiểm tra tự động
            if (!manual) {
                // 1. Kiểm tra xem người dùng đã chọn "Không nhắc lại" cho phiên bản này chưa
                const skippedVersion = this.context.globalState.get<string>(SKIPPED_VERSION_KEY);
                if (skippedVersion === latestTag) {
                    logger.info(`[UpdateService] Version ${latestTag} was marked as skipped by user.`);
                    return;
                }

                // 2. Kiểm tra nếu người dùng vừa chọn "Để sau" trong vòng 4 tiếng
                const remindLaterTime = this.context.globalState.get<number>(REMIND_LATER_KEY) || 0;
                if (Date.now() - remindLaterTime < REMIND_LATER_INTERVAL_MS) {
                    logger.info('[UpdateService] Reminder postponed by user.');
                    return;
                }
            }

            // Hiển thị thông báo với 3 lựa chọn
            const ACTION_UPDATE = 'Cập nhật ngay';
            const ACTION_LATER = 'Để sau';
            const ACTION_SKIP = 'Không nhắc lại';

            const userChoice = await vscode.window.showInformationMessage(
                `🎉 Antigravity YangDvu đã có phiên bản mới (${latestTag})! Bạn có muốn cập nhật không?`,
                ACTION_UPDATE,
                ACTION_LATER,
                ACTION_SKIP,
            );

            if (userChoice === ACTION_UPDATE) {
                await this.performUpdate(vsixAsset, latestTag);
            } else if (userChoice === ACTION_LATER) {
                await this.context.globalState.update(REMIND_LATER_KEY, Date.now());
                logger.info(`[UpdateService] User chose to remind later for ${latestTag}`);
            } else if (userChoice === ACTION_SKIP) {
                await this.context.globalState.update(SKIPPED_VERSION_KEY, latestTag);
                logger.info(`[UpdateService] User chose to skip version ${latestTag}`);
                void vscode.window.showInformationMessage(
                    `Đã bỏ qua nhắc nhở phiên bản ${latestTag}. Tiện ích sẽ không nhắc lại cho đến khi có bản mới hơn.`,
                );
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.warn(`[UpdateService] Update check failed: ${err.message}`);
            if (manual) {
                void vscode.window.showErrorMessage(`Kiểm tra cập nhật thất bại: ${err.message}`);
            }
        } finally {
            this.checking = false;
        }
    }

    /**
     * Tải file .vsix và thực hiện cài đặt
     */
    private async performUpdate(asset: GitHubAsset, targetTag: string): Promise<void> {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Đang cập nhật Antigravity YangDvu lên ${targetTag}...`,
                cancellable: false,
            },
            async (progress) => {
                progress.report({ message: 'Đang tải bản cập nhật...' });

                const tempDir = os.tmpdir();
                const tempFilePath = path.join(tempDir, asset.name);

                try {
                    // Tải file .vsix
                    const res = await fetch(asset.browser_download_url, {
                        headers: { 'User-Agent': 'Antigravity-YangDvu-Extension' },
                    });

                    if (!res.ok) {
                        throw new Error(`Tải tệp thất bại: HTTP ${res.status}`);
                    }

                    const arrayBuffer = await res.arrayBuffer();
                    await fs.promises.writeFile(tempFilePath, Buffer.from(arrayBuffer));
                    progress.report({ message: 'Đang cài đặt tiện ích...' });

                    // Tiến hành cài đặt
                    let installed = false;
                    try {
                        // Thử qua VS Code API nội bộ
                        await vscode.commands.executeCommand(
                            'workbench.extensions.installExtension',
                            vscode.Uri.file(tempFilePath),
                        );
                        installed = true;
                    } catch (cmdErr) {
                        logger.warn(`[UpdateService] Internal install command failed, trying CLI fallback: ${cmdErr}`);
                    }

                    // Nếu lệnh nội bộ thất bại, thử qua CLI
                    if (!installed) {
                        await this.installViaCli(tempFilePath);
                    }

                    // Xóa file tạm
                    try {
                        await fs.promises.unlink(tempFilePath);
                    } catch {
                        // Bỏ qua lỗi xóa file tạm
                    }

                    // Thông báo hoàn thành
                    const reloadAction = 'Khởi động lại ngay';
                    const answer = await vscode.window.showInformationMessage(
                        `🎉 Đã cập nhật Antigravity YangDvu lên ${targetTag} thành công!`,
                        reloadAction,
                    );

                    if (answer === reloadAction) {
                        await vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }

                } catch (installErr) {
                    const msg = installErr instanceof Error ? installErr.message : String(installErr);
                    logger.error(`[UpdateService] Update failed: ${msg}`);
                    void vscode.window.showErrorMessage(`Cập nhật thất bại: ${msg}`);
                }
            },
        );
    }

    /**
     * Cài đặt qua CLI dự phòng
     */
    private installViaCli(vsixPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const ideBin = path.join(
                process.env.LOCALAPPDATA || '',
                'Programs',
                'Antigravity IDE',
                'bin',
                'antigravity-ide.cmd',
            );

            let cmd = `antigravity-ide --install-extension "${vsixPath}" --force`;
            if (fs.existsSync(ideBin)) {
                cmd = `"${ideBin}" --install-extension "${vsixPath}" --force`;
            }

            exec(cmd, (error) => {
                if (error) {
                    // Thử với code CLI
                    exec(`code --install-extension "${vsixPath}" --force`, (codeError) => {
                        if (codeError) {
                            reject(new Error(`Lỗi cài đặt CLI: ${error.message}`));
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    private getCurrentVersion(): string {
        return (packageJson && packageJson.version) ? packageJson.version : '1.0.0';
    }
}

export const updateService = new UpdateService();
