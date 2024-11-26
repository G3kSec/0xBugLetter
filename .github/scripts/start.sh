#!/bin/bash

go version
export PATH=$PATH:/usr/local/go/bin
source ~/.profile
mkdir -p ~/go/{bin,src,pkg}
ls -l ~/go
export GOROOT=/usr/local/go
export GOPATH="$HOME/go"
export GOBIN="$GOPATH/bin"
source ~/.profile
go version
go env
