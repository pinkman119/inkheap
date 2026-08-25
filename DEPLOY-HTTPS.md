# INKHEAP HTTPS 部署指南

## 前置条件

- 已完成 HTTP 部署（参考 `DEPLOY.md`）
- 域名已解析到服务器 IP
- SSL 证书已申请（腾讯云/阿里云/Let's Encrypt 等）

## 一、下载证书

在证书颁发平台下载 **Nginx** 版本的证书，会得到两个文件：

| 文件 | 说明 | 重命名为 |
|------|------|----------|
| `xxx.pem` 或 `fullchain.cer` | 证书链（含完整证书） | `fullchain.pem` |
| `xxx.key` | 私钥 | `privkey.key` |

> 不同平台下载的文件名不同，但内容一样。关键是：
> - **pem/cer 文件** → 重命名为 `fullchain.pem`
> - **key 文件** → 重命名为 `privkey.key`

## 二、上传证书到服务器

在服务器上创建证书目录并上传：

```bash
# 1. 在服务器上创建证书目录
ssh user@服务器IP
sudo mkdir -p /etc/inkheap-certs

# 2. 把证书文件传到服务器（在本地执行）
scp fullchain.pem user@服务器IP:/tmp/
scp privkey.key user@服务器IP:/tmp/

# 3. 在服务器上移动到证书目录并设置权限
ssh user@服务器IP
sudo mv /tmp/fullchain.pem /etc/inkheap-certs/
sudo mv /tmp/privkey.key /etc/inkheap-certs/
sudo chmod 644 /etc/inkheap-certs/fullchain.pem
sudo chmod 600 /etc/inkheap-certs/privkey.key
```

## 三、更新前端镜像（含新 nginx 配置）

新的 `nginx.conf` 已包含 443 SSL 配置和 80 跳转。需要重新构建前端镜像并导出：

```bash
# 在本地项目根目录执行
# 1. 重新构建前端镜像
docker-compose build frontend

# 2. 导出更新后的前端镜像
docker save -o inkheap-frontend.tar inkheap-frontend:latest

# 3. 传到服务器
scp inkheap-frontend.tar docker-compose.yml user@服务器IP:/opt/inkheap/
```

## 四、服务器重启服务

```bash
ssh user@服务器IP
cd /opt/inkheap

# 1. 加载新镜像
docker load -i inkheap-frontend.tar

# 2. 确认证书文件在位
ls -la /etc/inkheap-certs/
# 应该看到 fullchain.pem 和 privkey.key

# 3. 重启前端容器（应用新的 nginx.conf + 证书挂载）
docker-compose up -d frontend

# 4. 验证
curl -I https://你的域名/
# 应该返回 200 OK
```

## 五、验证

浏览器访问：
- `https://你的域名/` — 前台首页
- `https://你的域名/#/about` — 关于我
- `https://你的域名/#/admin/login` — 后台管理

HTTP 自动跳转：
- `http://你的域名/` → 自动 301 到 `https://你的域名/`

## 六、证书更新

证书到期前重新申请，替换 `/etc/inkheap-certs/` 下的文件后重启：

```bash
# 替换证书文件后
docker-compose restart frontend
```

## 故障排查

**Nginx 启动失败（日志报找不到证书）**：
```bash
docker-compose logs frontend
# 检查证书文件是否在 /etc/inkheap-certs/ 下
# 检查文件名是否为 fullchain.pem 和 privkey.key
ls -la /etc/inkheap-certs/
```

**证书格式错误**：
```bash
# 验证证书是否有效
openssl x509 -in /etc/inkheap-certs/fullchain.pem -noout -text
# 验证私钥是否匹配
openssl rsa -in /etc/inkheap-certs/privkey.key -check -noout
```

**443 端口未开放**：
```bash
# 检查服务器安全组/防火墙是否放行 443 端口
# 腾讯云/阿里云：控制台 → 安全组 → 添加入站规则 → 443 端口
```
