#!/bin/bash

if [ "$#" == "0" ]
  then 
    echo ERROR: pass device number
    exit 1
fi

watch -n .2 sudo hcitool -i hci$1 con
