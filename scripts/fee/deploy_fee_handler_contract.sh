#!/bin/bash

# Deployment script for fee_handler.cairo

# Declare the contract and capture the command output
command_output=$(starkli declare ../../target/dev/satoru_FeeHandler.sierra.json --network=sepolia --compiler-version=2.6.0 --account $1 --keystore $2)

from_string="Class hash declared:"
class_hash="${command_output#*$from_string}"

# Deploy the contract using the extracted class hash
starkli deploy $class_hash $3 $4 $5 --network=sepolia --account $1 --keystore $2
