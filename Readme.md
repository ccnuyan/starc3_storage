# 云存储服务业务流程

## 1上传业务流程

baseUrl: /storage/api

#### step 1 请求

客户端请求子业务系统的服务，通过子业务系统的服务内部，调用云存储request服务开启上传会话获取上传任务信息。

云存储request服务调用方式

地址:/request

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

返回

    status:201
    {
      _id: transactionId
    }

#### step 2 上传

地址 /upload/:uploadTransactionId

客户端携带上传任务id调用云存储的上传服务。上传即普通的Form Upload

## 2 下载业务流程
#### step 1 请求

客户端请求子业务系统的服务，通过子业务系统的服务内部，调用云存储request服务开启下载会话获取下载任务信息。

地址:/request

    {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        //Http Basic认证方式
        'Authorization': 'Basic ' + authenticationString
      },
      body: {
        //文件id
        storage_object_id: 'some_explicit_id',
        //文件名
        fileName: 'abc.txt',
      }
    }

返回

    status:201
    {
      _id: transactionId
    }


#### step 2 下载

地址 /download/:downloadTransactionId

客户端携带上下载任务id调用云存储的下载服务。下载即普通的浏览器下载
