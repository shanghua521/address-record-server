## 使用方式

可以自己部署或者直接导入 deno deploy 中部署，无论是自己部署还是 deno deploy 都需提供两个环境变量（[参考这里](#maints)），默认只提供 vmess 的订阅格式输出，这里提供这个 vmess 的 v2ray 参考配置。

```json
{
  "inbounds": [
    {
      "listen": "0.0.0.0",
      "port": 10001,
      "protocol": "vmess",
      "settings": {
        "clients": [
          {
            "id": "your-id"
          }
        ]
      },
      "streamSettings": {
        "network": "tcp"
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "tag": "block"
    }
  ]
}
```

选中vmess作为默认协议的原因
- 加密，大部分部署在家中的服务都是http，连打洞回家的流量请求肯定加密会更好
- vmess的tcp支持在各个软件中支持比较好
- 配置简单，速度也足够快


## 接口文档

目前程序提供了三个接口，都是需要使用 token 鉴权（[token 为代码 TOKEN 环境变量](#maints)）。其中id用于区分存入的不同地址，在存入和取出时要保存一致，也可以不用此时都是同一个地址。

- `/ddns/address/:id?` POST 请求，使用 Bearer token 鉴权，请求内容格式为 json，内容为`{ "value": "$address" }`，其中`$address`为 ip 地址和端口（例如`127.0.0.1:1234`），一般由打洞成功之后的脚本提供。
- `/ddns/address/:id?` GET 请求，使用 Bearer token 鉴权，获取最新的地址数据。
- `/ddns/subscription?token=xxx&id=xxx` GET 请求，使用 token 查询参数鉴权，用于获取 vmess 订阅（v2rayn 格式），token 查询参数订阅指将 token 放入查询参数中，例如`http://127.0.0.1:1234/ddns/subscription?token=xxxx`。id为可选参数与存入时一致。


## 文件描述

- `mian.ts`为部署的代码文件
- `callback.sh`是 natter 打洞成功之后的通知脚本

### `main.ts`

可以使用 deno deploy 或者自行使用 deno 部署都可以。

使用 deno 自己部署运行命令`deno task start:prod`或者`deno run -A main.ts`，数据使用了 deno kv 存储，默认是存储在运行的当前目录的`kv.db`中，如果是 deno deploy 则是托管到他的 kv 存储中可以通过他的 dashboard 查看。

使用必须提供至少两个环境变量

- `TOKEN`用于接口鉴权
- `VMESS_UUID`用于订阅的 vmess uuid

### `callback.sh`

这个是 natter 通知脚本的示例，deno 程序使用标准的 http 接口，接口详情请看接口文档。

## 开发

- 安装 deno
- 使用`deno task start:dev`启动，代码变更后会自动重启
