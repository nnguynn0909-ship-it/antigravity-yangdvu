/**
 * Antigravity Cockpit - OAuth Service
 * Google OAuth 认证服务
 * 处理 OAuth 授权流程、Token 交换和刷新
 */

import * as vscode from 'vscode';
import * as http from 'http';
import { URL } from 'url';
import { OAuthCredential } from './types';
import { credentialStorage } from './credential_storage';
import { logger } from '../shared/log_service';
import { t } from '../shared/i18n';

// Antigravity OAuth Cấu hình (YangDvu)
const _d = (arr: number[], k = 42): string => arr.map(c => String.fromCharCode(c ^ k)).join('');
const ANTIGRAVITY_CLIENT_ID = _d([27,26,29,27,26,26,28,26,28,26,31,19,27,7,94,71,66,89,89,67,68,24,66,24,27,70,73,88,79,24,25,31,92,94,69,70,69,64,66,30,77,30,26,25,79,90,4,75,90,90,89,4,77,69,69,77,70,79,95,89,79,88,73,69,68,94,79,68,94,4,73,69,71]);
const ANTIGRAVITY_CLIENT_SECRET = _d([109,101,105,121,122,114,7,97,31,18,108,125,120,30,18,28,102,78,102,96,27,71,102,104,18,89,114,105,30,80,28,91,110,107,76]);
const ANTIGRAVITY_SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/cclog',
    'https://www.googleapis.com/auth/experimentsandconfigs',
];
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// 回调服务器配置
const CALLBACK_HOST_IPV4 = '127.0.0.1';
const CALLBACK_HOST_IPV6 = '::1';
const CALLBACK_PORT_START = 11451;
const CALLBACK_PORT_RANGE = 100;
const OAUTH_HTTP_TIMEOUT_MS = 15000;

/**
 * OAuth 服务类
 */
class OAuthService {
    private callbackServer?: http.Server;
    private callbackBaseUrl: string = `http://${CALLBACK_HOST_IPV4}`;
    private pendingAuth?: {
        state: string;
        resolve: (code: string) => void;
        reject: (error: Error) => void;
    };
    private pendingAuthSession?: {
        authUrl: string;
        redirectUri: string;
        promise: Promise<string>;
    };

    /**
     * 开始 OAuth 授权流程
     * @returns 授权成功返回 true，失败返回 false
     */
    async startAuthorization(): Promise<boolean> {
        logger.info('[OAuthService] Starting authorization flow');

        try {
            // 1. 生成授权 URL 并启动回调服务器
            const authUrl = await this.prepareAuthorizationSession();

            // 2. 打开浏览器
            const opened = await vscode.env.openExternal(vscode.Uri.parse(authUrl));
            if (!opened) {
                logger.warn('[OAuthService] Failed to open browser, falling back to clipboard');
                try {
                    await vscode.env.clipboard.writeText(authUrl);
                } catch (copyError) {
                    logger.warn('[OAuthService] Failed to copy auth URL to clipboard', copyError);
                }
                vscode.window.showWarningMessage(t('oauth.browserOpenFailed'));
            }

            // 5. 显示等待提示
            vscode.window.showInformationMessage(
                t('oauth.waiting'),
                t('common.cancel'),
            ).then(selection => {
                if (selection === t('common.cancel')) {
                    this.cancelPendingAuth();
                }
            });

            // 3. 等待回调并完成授权
            const session = this.pendingAuthSession;
            if (!session) {
                throw new Error('OAuth session not initialized');
            }
            const code = await session.promise;
            return await this.finalizeAuthorization(code, session.redirectUri);

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error(`[OAuthService] Authorization failed: ${err.message}`);
            vscode.window.showErrorMessage(t('oauth.authFailed', { message: err.message }));
            return false;

        } finally {
            this.cancelAuthorizationSession();
        }
    }

    /**
     * 生成授权链接并启动回调服务器（不自动打开浏览器）
     */
    async prepareAuthorizationSession(): Promise<string> {
        if (this.pendingAuthSession) {
            return this.pendingAuthSession.authUrl;
        }

        const port = await this.startCallbackServer();
        const redirectUri = `${this.callbackBaseUrl}:${port}`;
        const state = this.generateState();
        const authUrl = this.buildAuthUrl(redirectUri, state);
        const promise = this.waitForCallback(state, 5 * 60 * 1000);
        promise.catch(() => undefined);

        this.pendingAuthSession = {
            authUrl,
            redirectUri,
            promise,
        };

        return authUrl;
    }

    /**
     * 等待回调并完成授权
     */
    async completeAuthorizationSession(): Promise<boolean> {
        if (!this.pendingAuthSession) {
            throw new Error('No pending OAuth session');
        }

        try {
            const { promise, redirectUri } = this.pendingAuthSession;
            const code = await promise;
            return await this.finalizeAuthorization(code, redirectUri);
        } finally {
            this.cancelAuthorizationSession();
        }
    }

    /**
     * 取消正在进行的授权
     */
    cancelAuthorizationSession(): void {
        this.cancelPendingAuth();
        this.pendingAuthSession = undefined;
    }

    /**
     * 撤销授权 (removes all accounts)
     */
    async revokeAuthorization(): Promise<void> {
        await credentialStorage.deleteCredential();
        logger.info('[OAuthService] All authorizations revoked');
        vscode.window.showInformationMessage(t('oauth.allRevoked'));
    }

    /**
     * 撤销指定账号的授权
     * @param email 要撤销的账号邮箱
     */
    async revokeAccount(email: string): Promise<void> {
        await credentialStorage.deleteCredentialForAccount(email);
        logger.info(`[OAuthService] Account ${email} revoked`);
        vscode.window.showInformationMessage(t('autoTrigger.accountRemoved', { email }));
    }

    /**
     * 刷新 access_token
     * @returns 新的 access_token，失败返回 null
     */
    async refreshAccessToken(): Promise<string | null> {
        const result = await this.refreshAccessTokenDetailed();
        if (result.state === 'ok') {
            return result.token ?? null;
        }
        return null;
    }

    /**
     * 获取有效的 access_token（必要时自动刷新）
     */
    async getValidAccessToken(): Promise<string | null> {
        const result = await this.getAccessTokenStatus();
        return result.state === 'ok' ? result.token ?? null : null;
    }

    async getAccessTokenStatus(): Promise<AccessTokenResult> {
        const credential = await credentialStorage.getCredential();
        if (!credential) {
            return { state: 'missing' };
        }

        // 检查是否过期（提前 5 分钟刷新）
        const expiresAt = new Date(credential.expiresAt);
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 分钟
        const isExpired = expiresAt.getTime() <= now.getTime();

        if (expiresAt.getTime() - now.getTime() < bufferTime) {
            logger.info('[OAuthService] Token expiring soon, refreshing...');
            const refreshed = await this.refreshAccessTokenDetailed();
            if (refreshed.state === 'missing' && isExpired) {
                return { state: 'expired', error: 'Access token expired' };
            }
            return refreshed;
        }

        return { state: 'ok', token: credential.accessToken };
    }

    /**
     * 从已有 Token 数据构建凭证（不触发网络请求）
     */
    buildCredentialFromTokenData(params: {
        accessToken: string;
        refreshToken: string;
        expiresAt: string;
        email: string;
        projectId?: string;
        isInvalid?: boolean;
    }): OAuthCredential {
        return {
            clientId: ANTIGRAVITY_CLIENT_ID,
            clientSecret: ANTIGRAVITY_CLIENT_SECRET,
            accessToken: params.accessToken,
            refreshToken: params.refreshToken,
            expiresAt: params.expiresAt,
            projectId: params.projectId,
            scopes: ANTIGRAVITY_SCOPES,
            email: params.email,
            isInvalid: params.isInvalid ?? false,
        };
    }

    /**
     * 使用 refresh_token 直接构造完整 OAuth 凭证（无需用户交互）
     * 适用于从 Antigravity Tools 导入的 token
     */
    async buildCredentialFromRefreshToken(refreshToken: string, fallbackEmail?: string): Promise<OAuthCredential> {
        try {
            const response = await this.fetchWithTimeout(TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: ANTIGRAVITY_CLIENT_ID,
                    client_secret: ANTIGRAVITY_CLIENT_SECRET,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                }).toString(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                const lowered = errorText.toLowerCase();
                if (lowered.includes('invalid_grant')) {
                    throw new Error('refresh_token 已失效 (invalid_grant)');
                }
                throw new Error(`刷新失败: ${response.status} - ${errorText}`);
            }

            const data = await response.json() as {
                access_token: string;
                expires_in: number;
                scope?: string;
            };

            const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
            const scopes = data.scope ? data.scope.split(' ') : ANTIGRAVITY_SCOPES;

            let email = fallbackEmail;
            try {
                email = await this.fetchUserEmail(data.access_token);
            } catch (e) {
                const err = e instanceof Error ? e.message : String(e);
                logger.warn(`[OAuthService] 获取用户邮箱失败，使用备用邮箱: ${err}`);
            }

            if (!email) {
                throw new Error('无法确定账号邮箱，拒绝同步');
            }

            return {
                clientId: ANTIGRAVITY_CLIENT_ID,
                clientSecret: ANTIGRAVITY_CLIENT_SECRET,
                accessToken: data.access_token,
                refreshToken,
                expiresAt,
                scopes,
                email,
                projectId: undefined,
                isInvalid: false,
            };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error(`[OAuthService] 通过 refresh_token 构造凭证失败: ${err.message}`);
            throw err;
        }
    }

    /**
     * 获取指定账号的 access_token 状态
     */
    async getAccessTokenStatusForAccount(email: string): Promise<AccessTokenResult> {
        const credential = await credentialStorage.getCredentialForAccount(email);
        if (!credential) {
            return { state: 'missing' };
        }

        // 检查是否过期（提前 5 分钟刷新）
        const expiresAt = new Date(credential.expiresAt);
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 分钟
        const isExpired = expiresAt.getTime() <= now.getTime();

        if (expiresAt.getTime() - now.getTime() < bufferTime) {
            logger.info(`[OAuthService] Token expiring soon for ${email}, refreshing...`);
            const refreshed = await this.refreshAccessTokenDetailedForAccount(email);
            if (refreshed.state === 'missing' && isExpired) {
                return { state: 'expired', error: 'Access token expired' };
            }
            return refreshed;
        }

        return { state: 'ok', token: credential.accessToken };
    }

    /**
     * 启动回调服务器
     */
    private async startCallbackServer(): Promise<number> {
        return new Promise((resolve, reject) => {
            let port = CALLBACK_PORT_START;
            let attempts = 0;

            const tryListen = (host: string, onError: (err: NodeJS.ErrnoException) => void) => {
                const server = http.createServer((req, res) => {
                    this.handleCallback(req, res);
                });

                server.on('error', (err: NodeJS.ErrnoException) => {
                    server.close();
                    onError(err);
                });

                server.listen(port, host, () => {
                    this.callbackServer = server;
                    this.setCallbackHost(host);
                    logger.info(`[OAuthService] Callback server started on ${host}:${port}`);
                    resolve(port);
                });
            };

            const tryPort = () => {
                if (attempts >= CALLBACK_PORT_RANGE) {
                    reject(new Error('No available port for OAuth callback'));
                    return;
                }

                tryListen(CALLBACK_HOST_IPV4, (err) => {
                    if (err.code === 'EADDRINUSE') {
                        port++;
                        attempts++;
                        tryPort();
                        return;
                    }
                    if (err.code === 'EADDRNOTAVAIL' || err.code === 'EINVAL' || err.code === 'EACCES') {
                        tryListen(CALLBACK_HOST_IPV6, (v6Err) => {
                            if (v6Err.code === 'EADDRINUSE') {
                                port++;
                                attempts++;
                                tryPort();
                                return;
                            }
                            reject(v6Err);
                        });
                        return;
                    }
                    reject(err);
                });
            };

            tryPort();
        });
    }

    /**
     * 停止回调服务器
     */
    private stopCallbackServer(): void {
        if (this.callbackServer) {
            this.callbackServer.close();
            this.callbackServer = undefined;
            logger.info('[OAuthService] Callback server stopped');
        }
    }

    /**
     * 处理 OAuth 回调
     */
    private handleCallback(req: http.IncomingMessage, res: http.ServerResponse): void {
        const url = new URL(req.url || '', this.callbackBaseUrl);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <html>
                <head><title>授权失败</title></head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>❌ 授权失败</h1>
                    <p>错误: ${error}</p>
                    <p>请关闭此页面并重试。</p>
                </body>
                </html>
            `);
            if (this.pendingAuth) {
                this.pendingAuth.reject(new Error(`OAuth error: ${error}`));
                this.pendingAuth = undefined;
            }
            return;
        }

        if (code && state && this.pendingAuth && this.pendingAuth.state === state) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <html>
                <head><title>授权成功</title></head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>✅ 授权成功！</h1>
                    <p>您可以关闭此页面，返回 VS Code。</p>
                    <script>setTimeout(() => window.close(), 2000);</script>
                </body>
                </html>
            `);
            this.pendingAuth.resolve(code);
            this.pendingAuth = undefined;
        } else {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <html>
                <head><title>无效请求</title></head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>⚠️ 无效请求</h1>
                    <p>请重新发起授权。</p>
                </body>
                </html>
            `);
        }
    }

    /**
     * 等待回调
     */
    private waitForCallback(state: string, timeout: number): Promise<string> {
        return new Promise((resolve, reject) => {
            this.pendingAuth = { state, resolve, reject };

            setTimeout(() => {
                if (this.pendingAuth && this.pendingAuth.state === state) {
                    this.pendingAuth.reject(new Error('Authorization timeout'));
                    this.pendingAuth = undefined;
                    this.pendingAuthSession = undefined;
                    this.stopCallbackServer();
                }
            }, timeout);
        });
    }

    /**
     * 取消待处理的授权
     */
    private cancelPendingAuth(): void {
        if (this.pendingAuth) {
            this.pendingAuth.reject(new Error('Authorization cancelled by user'));
            this.pendingAuth = undefined;
        }
        this.pendingAuthSession = undefined;
        this.stopCallbackServer();
    }

    /**
     * 完成授权流程（换取 token、保存账号）
     */
    private async finalizeAuthorization(code: string, redirectUri: string): Promise<boolean> {
        // 1. 用 code 换取 token
        const credential = await this.exchangeCodeForToken(code, redirectUri);

        // 2. 获取用户信息
        const email = await this.fetchUserEmail(credential.accessToken);
        credential.email = email;

        // 3. Check for duplicate account
        const isDuplicate = await credentialStorage.hasAccount(email);
        if (isDuplicate) {
            // Account exists - this is a re-authorization, update credentials
            logger.info(`[OAuthService] Account ${email} exists, updating credentials`);
            await credentialStorage.saveCredential(credential);
            await credentialStorage.clearAccountInvalid(email);
            vscode.window.showInformationMessage(t('oauth.reauthSuccess', { email }));
            return true;
        }

        // 4. 保存凭证 (new account)
        const result = await credentialStorage.saveCredentialForAccount(email, credential);

        // 5. 显示成功提示
        if (result === 'added') {
            vscode.window.showInformationMessage(t('oauth.authSuccess', { email }));
        }

        logger.info(`[OAuthService] Authorization successful: ${email}`);
        return true;
    }

    /**
     * 生成状态码
     */
    private generateState(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let state = '';
        for (let i = 0; i < 32; i++) {
            state += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return state;
    }

    private setCallbackHost(host: string): void {
        this.callbackBaseUrl = this.formatCallbackBaseUrl(host);
    }

    private formatCallbackBaseUrl(host: string): string {
        if (host.includes(':')) {
            return `http://[${host}]`;
        }
        return `http://${host}`;
    }

    /**
     * 构建授权 URL
     */
    private buildAuthUrl(redirectUri: string, state: string): string {
        const params = new URLSearchParams({
            client_id: ANTIGRAVITY_CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: ANTIGRAVITY_SCOPES.join(' '),
            state: state,
            access_type: 'offline',
            prompt: 'consent',  // 强制显示授权确认，确保获得 refresh_token
            include_granted_scopes: 'true',
        });
        return `${AUTH_URL}?${params.toString()}`;
    }

    /**
     * 用 authorization code 换取 token
     */
    private async exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthCredential> {
        const response = await this.fetchWithTimeout(TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: ANTIGRAVITY_CLIENT_ID,
                client_secret: ANTIGRAVITY_CLIENT_SECRET,
                code: code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as {
            access_token: string;
            refresh_token: string;
            expires_in: number;
            scope: string;
            token_type: string;
        };

        if (!data.refresh_token) {
            throw new Error('No refresh_token received. Please try again.');
        }

        const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

        return {
            clientId: ANTIGRAVITY_CLIENT_ID,
            clientSecret: ANTIGRAVITY_CLIENT_SECRET,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: expiresAt,
            scopes: data.scope.split(' '),
        };
    }

    /**
     * 获取用户邮箱
     */
    private async fetchUserEmail(accessToken: string): Promise<string> {
        const response = await this.fetchWithTimeout(USERINFO_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user info: ${response.status}`);
        }

        const data = await response.json() as { email: string };
        return data.email;
    }

    private async refreshAccessTokenDetailed(): Promise<AccessTokenResult> {
        const credential = await credentialStorage.getCredential();
        if (!credential || !credential.refreshToken) {
            logger.warn('[OAuthService] No refresh token available');
            return { state: 'missing' };
        }

        try {
            const response = await this.fetchWithTimeout(TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: ANTIGRAVITY_CLIENT_ID,
                    client_secret: ANTIGRAVITY_CLIENT_SECRET,
                    refresh_token: credential.refreshToken,
                    grant_type: 'refresh_token',
                }).toString(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                const lowered = errorText.toLowerCase();
                if (lowered.includes('invalid_grant')) {
                    logger.warn('[OAuthService] Refresh token invalid (invalid_grant)');
                    // Mark the account as invalid
                    if (credential.email) {
                        await credentialStorage.markAccountInvalid(credential.email, true);
                    }
                    return { state: 'invalid_grant', error: errorText };
                }
                const message = `Token refresh failed: ${response.status} - ${errorText}`;
                logger.error(`[OAuthService] ${message}`);
                return { state: 'refresh_failed', error: message };
            }

            const data = await response.json() as {
                access_token: string;
                expires_in: number;
            };

            const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
            await credentialStorage.updateAccessToken(data.access_token, expiresAt);

            logger.info('[OAuthService] Access token refreshed');
            return { state: 'ok', token: data.access_token };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error(`[OAuthService] Token refresh failed: ${err.message}`);
            return { state: 'refresh_failed', error: err.message };
        }
    }

    private async refreshAccessTokenDetailedForAccount(email: string): Promise<AccessTokenResult> {
        const credential = await credentialStorage.getCredentialForAccount(email);
        if (!credential || !credential.refreshToken) {
            logger.warn(`[OAuthService] No refresh token available for ${email}`);
            return { state: 'missing' };
        }

        try {
            const response = await this.fetchWithTimeout(TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: ANTIGRAVITY_CLIENT_ID,
                    client_secret: ANTIGRAVITY_CLIENT_SECRET,
                    refresh_token: credential.refreshToken,
                    grant_type: 'refresh_token',
                }).toString(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                const lowered = errorText.toLowerCase();
                if (lowered.includes('invalid_grant')) {
                    logger.warn(`[OAuthService] Refresh token invalid (invalid_grant) for ${email}`);
                    await credentialStorage.markAccountInvalid(email, true);
                    return { state: 'invalid_grant', error: errorText };
                }
                const message = `Token refresh failed: ${response.status} - ${errorText}`;
                logger.error(`[OAuthService] ${message}`);
                return { state: 'refresh_failed', error: message };
            }

            const data = await response.json() as {
                access_token: string;
                expires_in: number;
            };

            const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
            await credentialStorage.updateAccessTokenForAccount(email, data.access_token, expiresAt);

            logger.info(`[OAuthService] Access token refreshed for ${email}`);
            return { state: 'ok', token: data.access_token };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error(`[OAuthService] Token refresh failed for ${email}: ${err.message}`);
            return { state: 'refresh_failed', error: err.message };
        }
    }

    private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OAUTH_HTTP_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            return response;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

// 导出单例
export const oauthService = new OAuthService();

export type AccessTokenState =
    | 'ok'
    | 'missing'
    | 'expired'
    | 'invalid_grant'
    | 'refresh_failed';

export interface AccessTokenResult {
    state: AccessTokenState;
    token?: string;
    error?: string;
}
