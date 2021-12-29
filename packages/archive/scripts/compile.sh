emcc ./main.c /opt/xz-5.2.5/liblzma.a /opt/libarchive-3.5.2/.libs/libarchive.a /opt/openssl-OpenSSL_1_1_1m/libssl.a /opt/openssl-OpenSSL_1_1_1m/libcrypto.a -I /usr/local/include/ -I /opt/libarchive-3.5.2/libarchive\
    -o ./output/libarchive.js \
    -s USE_ZLIB=1 -s USE_BZIP2=1 -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=libarchive -s WASM=1 -O3 -s ALLOW_MEMORY_GROWTH=1 \
    -s EXPORTED_RUNTIME_METHODS='["cwrap","allocate","intArrayFromString"]' -s EXPORTED_FUNCTIONS=@$PWD/libarchive.exports -s ERROR_ON_UNDEFINED_SYMBOLS=0

echo Done