- Is Test
- For Key

## 直接在 **Cloudflare 网页控制台** 上操作，具体步骤如下：

---

### 第一步：创建 R2 存储桶 (Bucket)

1. 打开并登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 在左侧导航栏点击 **存储与数据库 (Storage & Databases)** -> **R2**（首次使用可能需开通 R2 计划）。
3. 点击 **创建存储桶 (Create bucket)**：
   - **存储桶名称 (Bucket Name)**：填入 `linkey-codehub`
   - **位置 (Location)**：默认自动即可
4. 点击右下角 **创建存储桶 (Create Bucket)** 完成。

---

### 第二步：创建 Worker

1. 在左侧导航栏点击 **计算与网络 (Compute & Networking)** -> **Workers & Pages**。
2. 点击 **创建 (Create)** -> 选择 **创建 Worker (Create Worker)**。
3. 输入 Worker 名称，例如 `linkey-codehub-sync`。
4. 点击右下角 **部署 (Deploy)**（先部署默认的 Hello World 模板）。

---

### 第三步：粘贴代码

1. 部署完成后，在当前页面点击 **编辑代码 (Edit code)** 进入网页版编辑器。
2. 清空左侧编辑器中的原有内容，把 `codehub-sync-worker.js` 的全部代码复制粘贴进去：
3. 点击右上角 **保存并部署 (Save and deploy)**。
4. 点击左上角的返回箭头，回到该 Worker 的管理详情页。

---

### 第四步：绑定 R2 存储桶

这一步让 Worker 有权限读写第一步创建的 R2。

1. 在 Worker 详情页面，点击上方的 **设置 (Settings)** 标签。
2. 在左侧菜单点击 **绑定 (Bindings)**。
3. 找到 **R2 存储桶绑定 (R2 Bucket Bindings)**，点击 **添加 (Add)**：
   - **变量名称 (Variable name)**：必须填 `CODEHUB_BUCKET`（区分大小写，需与代码中 `env.CODEHUB_BUCKET` 完全一致）
   - **R2 存储桶 (R2 bucket)**：下拉选择刚创建的 `linkey-codehub`
4. 点击 **保存并部署 (Save and deploy)**。

---

### 第五步：设置同步密钥 (SYNC_TOKEN)

1. 同样在 **设置 (Settings)** 页面，左侧点击 **变量与密钥 (Variables and Secrets)**。
2. 点击 **添加 (Add)**：
   - **类型 (Type)**：选择 **机密 (Secret)**
   - **变量名称 (Variable name)**：必须填 `SYNC_TOKEN`
   - **值 (Value)**：输入你自己定义的长密码/随机字符串（例如 `my-secret-token-123456`）
3. 点击 **保存并部署 (Save and deploy)**。

---

### 第六步：在网站里填入配置

1. 回到该 Worker 的概览页，复制分配给它的访问地址（形如 `https://xxxx.workers.dev`）。
2. 打开你项目的页面，进入 **设置 (Settings)**。
3. 滚动到 **Code Hub CF 云同步** 分组：
   - **Worker 地址**：粘贴上面的完整地址（例如 `https://xxxx.workers.dev`）
   - **同步密钥**：填入第五步设置的 `SYNC_TOKEN` 内容
4. 点击 **保存云同步配置**。
5. 前往 `EditCode` 打开文件列表，即可点击 **上传CF** 或 **恢复CF** 进行同步。
