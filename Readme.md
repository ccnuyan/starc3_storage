# 云存储服务业务流程
> 上传下载会话服务采用Http Basic Authentication认证流程，云存储服务为每个租户分配单独的容器，租户A无法直接访问租户B容器中的文件，也不能在租户B的容器中上传文件，除非调用租户B的服务创建相应的操作会话。

强烈反对不同的应用共用租户信息共用同一容器！！！

服务地址

```
baseUrl: /storage/api
```

## 1上传业务流程
### step 1 请求
客户端请求子业务系统的服务，通过子业务系统的服务内部，调用云存储request服务开启上传会话获取上传任务信息。

云存储request服务调用方式

地址:/request

```
{
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    //Http Basic认证方式
    'Authorization': 'Basic ' + authenticationString
  },
  body: {
    //会话类型类型,固定
    requestType: 'upload',
    //回调方法，用户自定义
    requestMethod: 'POST',
    //回调地址，用户自定义
    requestUri: uri,
    //回调Body，用户自定义
    requestBody: body,
    //回调认证字段，用户自定义
    authorization: token,
  }
}
```

返回

```status:201
{
  _id: transactionId
}
```

### step 2 上传
地址 /upload/:uploadTransactionId

客户端携带上传任务id调用云存储的上传服务。上传即普通的Form Upload

若上传单个文件，则在上传结束后回调，若上传多个文件，则在上传最后一个文件成功后产生回调，而上传之前的文件成功后只返回事务信息。

回调Body

```
{
  callbackBody:{},
  file:{
    "storage_object_id": "some_explicit_id",
    "storage_box_id": "some_container_id",
    "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "size": "1317546",
    "name": "cyberhouse.docx",
    "etag": "3c0f76edd03d855c8661ff53014cacb7"
  }
｝
```
返回事务信息

```
status:200
{
  _id: transactionId
  ...
}
```

上传成功后 业务系统返回的响应将返回给客户端

## 2 下载业务流程
### step 1 请求
客户端请求子业务系统的服务，通过子业务系统的服务内部，调用云存储request服务开启下载会话获取下载任务信息。

地址:/request

```
{
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    //Http Basic认证方式
    'Authorization': 'Basic ' + authenticationString
  },
  body: {
    //会话类型类型,固定
    requestType: 'download',
    //文件id
    storage_object_id: 'some_explicit_id',
    //文件名
    fileName: 'abc.txt',
  }
}
```

返回

```
status:201
{
  _id: transactionId
}
```

## 2 复制业务流程
### step 1 请求
子业务系统的服务内部，调用云存储request服务开启复制会话获取下载任务信息。

地址:/request

```
{
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    //Http Basic认证方式
    'Authorization': 'Basic ' + authenticationString
  },
  body: {
    //会话类型类型,固定
    requestType: 'copy',
    //文件id
    storage_object_id: 'some_explicit_id',
  }
}
```

返回

```
status:201
{
  _id: transactionId
}
```

### step 2 复制
地址 /copy/:copyTransactionId

子业务系统（可以与第一步子系统不是统同一个系统）的服务内部，调用云存储copy服务将文件复制到自己的容器中。

```
{
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    //Http Basic认证方式
    'Authorization': 'Basic ' + authenticationString
  },
  body: {}
}
```

返回

```
status:201
{
    "storage_object_id": "249dfb44-83c3-4650-98b4-2352faff937e",
    "storage_box_id": "starc3_local_test",
    "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "size": "1317546",
    "name": "cyberhouse.docx",
    "etag": "3c0f76edd03d855c8661ff53014cacb7"
}
```

## 技术方案
- 数据库:Mongodb
- 服务:Express
- 服务建构:Gulp
- 服务测试方案:mocha + supertest
- 服务部署:Docker+Ubuntu
