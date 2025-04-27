#!/usr/bin/env bash

# Simple deploy script for test environment
# Uses inventory/test.yml

ansible-playbook site.yml -i inventory/test.yml 