# slack-dumper

Slackのメッセージ / ファイルをダンプするツール。
Denoが必要です。

## 使い方

1. Slack API Tokenを取得する
   1. [Slack API](https://api.slack.com/apps)でアプリケーションを作成する
   2. OAuth & Permissionsページで以下のUser Token Scopesを付与する
      - channels:history
      - channels:read
      - files:read
      - groups:history
      - groups:read
      - im:history
      - im:read
      - mpim:history
      - mpim:read
      - users:read
      - team:read
      - emoji:read
   3. ワークスペースにインストールする
   4. OAuth & PermissionsページでUser OAuth Tokenを入手する
2. 以下のコマンドを実行する
    ```bash
    $ deno run --allow-env --allow-read --allow-net --allow-write --allow-run --unstable index.js <slack-token>
    ```
