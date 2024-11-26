#!/bin/bash
 
which go
go version
export GOROOT=/usr/bin/go
export GOPATH="$HOME/go_projects"
export GOBIN="$GOPATH/bin"
source ~/.profile
go env
