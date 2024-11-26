#!/bin/bash
 
which go
go version
export GOPATH="$HOME/go"
export GOBIN="$GOPATH/bin"
source ~/.profile
go env
