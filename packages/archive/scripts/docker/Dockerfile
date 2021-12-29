FROM emscripten/emsdk

WORKDIR /opt

ADD https://github.com/libarchive/libarchive/releases/download/v3.5.2/libarchive-3.5.2.zip /opt
ADD https://github.com/libarchive/zlib/archive/refs/tags/v1.2.11.zip /opt
ADD https://github.com/libarchive/xz/archive/refs/tags/v5.2.5.zip /opt
ADD https://github.com/libarchive/bzip2/archive/refs/heads/master.zip /opt
ADD https://github.com/openssl/openssl/archive/refs/tags/OpenSSL_1_1_1m.zip /opt

RUN unzip /opt/libarchive-3.5.2.zip && rm /opt/libarchive-3.5.2.zip && \
    unzip /opt/v1.2.11.zip && rm /opt/v1.2.11.zip && \
    unzip /opt/v5.2.5.zip && rm /opt/v5.2.5.zip && \
    unzip /opt/master.zip && rm /opt/master.zip && \
    unzip /opt/OpenSSL_1_1_1m.zip  && rm /opt/OpenSSL_1_1_1m.zip

RUN apt-get update && \
    apt-get install -y autoconf libtool gettext cmake

ENV CPPFLAGS "-I/usr/local/include/ -I/opt/zlib-1.2.11 -I/opt/bzip2-master -I/opt/libarchive-3.5.2 -I/opt/openssl-OpenSSL_1_1_1m/include -I/opt/openssl-OpenSSL_1_1_1m/test"
ENV LDLIBS "-lz -lbz2 -lssl -lcrypto"
ENV LDFLAGS "-L/usr/local/lib -L/opt/zlib-1.2.11 -L/opt/bzip2-master -L/opt/xz-5.2.5 -L/opt/libarchive-3.5.2 -L/opt/opensso-OpenSSL_1_1_1m"

# compile ZLIB to LLVM
WORKDIR /opt/zlib-1.2.11
RUN cd /opt/zlib-1.2.11 && \
    emconfigure ./configure && \
    emmake make 2>&1

# compile BZIP2 to LLVM
WORKDIR /opt/bzip2-master
RUN cd /opt/bzip2-master  && \
    emcmake cmake . -DENABLE_STATIC_LIB=1 -DENABLE_SHARED_LIB=0 -DENABLE_LIB_ONLY=1 && \
    cmake --build . --config Release 2>&1 && \
    ls -l

# compile openSSL to LLVM
WORKDIR /opt/openssl-OpenSSL_1_1_1m
RUN cd /opt/openssl-OpenSSL_1_1_1m && \
    emmake bash -c "./Configure no-asm no-ssl2 no-tests no-ssl3 no-hw no-deprecated no-dso linux-generic32" && \
    sed -i 's/$(CROSS_COMPILE)//' Makefile && \
    emmake make

# compile LZMA to LLVM
WORKDIR /opt/xz-5.2.5
RUN cd /opt/xz-5.2.5 && \
    echo "set(CMAKE_MODULE_PATH \"${CMAKE_MODULE_PATH};/emsdk/upstream/emscripten/cmake/Modules/\")" | cat - cmake/tuklib_integer.cmake > temp && mv temp cmake/tuklib_integer.cmake && \
    emcmake cmake . && emmake make 2>&1

# compile libarchive to LLVM
WORKDIR /opt/libarchive-3.5.2
RUN cd /opt/libarchive-3.5.2 && emconfigure ./configure --enable-static --disable-shared --enable-bsdtar=static --enable-bsdcat=static \
    --enable-bsdcpio=static --enable-posix-regex-lib=libc \
    --disable-xattr --disable-acl --without-nettle --without-lzo2 \
    --without-cng  --without-lz4 \
    --without-xml2 --without-expat 2>&1 | tee conf.out && \
    emmake make 2>&1

#--without-openssl
#--without-bz2lib --without-iconv --without-libiconv-prefix --without-lzma 

WORKDIR /var/local/scripts/
CMD ["bash","/var/local/scripts/build.sh"]