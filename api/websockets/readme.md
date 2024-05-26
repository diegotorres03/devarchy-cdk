[Building WebSocket APIs with AWS API Gateway and CDK](https://dev.to/aws-builders/building-websocket-apis-with-aws-api-gateway-and-cdk-1i27)


API Gateway supports message payloads up to 128 KB with a maximum frame size of 32 KB. If a message exceeds 32 KB, you must split it into multiple frames, each 32 KB or smaller. If a larger message (or frame) is received, the connection is closed with code 1009.

Currently binary payloads are not supported. If a binary frame is received, the connection is closed with code 1003. However, it is possible to convert binary payloads to text. See Working with binary media types for WebSocket APIs.