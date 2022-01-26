# token-swap
## Table of Contents

* [專案描述](#專案描述)
* [執行專案](#執行專案)

## 專案描述

### 交易token
1. 建立訂單
2. 取消訂單
3. 交易


## 執行專案

### Installation
```shell
yarn install
```

### Compile program
```shell
#編譯program,編譯後在target裡
$ anchor build
```

### Deploy program(local)
```shell
#啟動測試練
$ solana-test-validator
#部署program
$ anchor deploy
```

### Test program
```shell
$ anchor test
```

### 建立本地端的測試鏈
```shell
#產生錢包
$ solana-keygen new
#啟動測試練
$ solana-test-validator
```
