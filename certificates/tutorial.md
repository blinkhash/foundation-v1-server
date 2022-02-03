Setting up SSL/TLS Support
=============

Foundation supports secure communication to Redis as well as between miners and the stratum server. This guide helps you to create a self-signed key/certificate pair using openssl, which will help you to leverage these features.

Creating the Root Authority
--------------------
The root key is used to sign certificate requests, so keep it safe! If you want to create a key without password protection, you can remove the -des3 option.

```
openssl genrsa -des3 -out rootCA.key 2048
```

Next, create and self sign the root certificate which identifies your root certificate authority (CA). It is valid for three years and by then it might be a good idea to check if 2048 bits is still secure enough for your needs. If you want to change this behavior, alter or remove the -days 1095 option.

```
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1095 -out rootCA.crt
```

Creating the Server Certificate
-------------------------------
First, create a new key for the server.

```
openssl genrsa -out server.key 2048
```

Use the generated key to create the certificate signing request (CSR).

```
openssl req -new -sha256 -key server.key -out server.csr
```

Generate the server certificate.

```
openssl x509 -req -in server.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out server.crt -days 500 -sha256
```

Configuring with Foundation
------------------------------------
To use the generated files with Foundation, copy the server key, the server certificate, and the root certificate to the './certificates' folder. Then set the following options in the config.js file.

```
config.tls.rootCA = 'rootCA.crt';
config.tls.serverKey = 'server.key';
config.tls.serverCert = 'server.crt';
```

Using TLS with Redis
-----------------------
Redis supports TLS connections since v6. For configuration options, see https://redis.io/topics/encryption. Four of the generated files are linked to redis parameters:

```
tls-cert-file: /path/to/server.crt
tls-key-file: /path/to/server.key
tls-ca-cert-file: /path/to/rootCA.crt
tls-dh-params-file: /path/to/dhparam.pem
```

In order to enable TLS with Redis, set the `config.redis.tls` flag to `true`.

Using TLS with Ports
-----------------------
In order to enable TLS on any established port, set the `ports[x].ssl` flag to `true`.
