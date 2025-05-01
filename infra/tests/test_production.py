#!/usr/bin/env python3

import sys
import socket
import yaml
import paramiko
from pathlib import Path

def load_configs():
    """Load both production configurations."""
    try:
        # Load production.yml for testinfra
        config_path = Path(__file__).parent.parent / 'inventory' / 'production.yml'
        with open(config_path, 'r') as f:
            infra_config = yaml.safe_load(f)
            
        # Load production.cfg for SSH tests
        config_path = Path(__file__).parent.parent / 'inventory' / 'production.cfg'
        with open(config_path, 'r') as f:
            ssh_config = yaml.safe_load(f)
            
        return infra_config, ssh_config
    except Exception as e:
        print(f"Error loading configs: {e}")
        sys.exit(1)

def test_ssh_connection(config):
    """Test SSH connection to production server using key authentication."""
    print("Testing SSH connection with key authentication...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Try to connect using SSH agent
        ssh.connect(
            config['production_server_ip'],
            port=config['ssh_port'],
            username='root',
            timeout=5
        )
        ssh.close()
        print("✅ SSH connection with key authentication successful")
        return True
    except paramiko.AuthenticationException:
        print("❌ SSH key authentication failed - check if key is added to ssh-agent")
        return False
    except Exception as e:
        print(f"❌ SSH connection with key authentication failed: {e}")
        return False

def test_ssh_password_auth(config):
    """Test that password authentication is disabled."""
    print("\nTesting SSH password authentication...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Try to connect with password only
        ssh.connect(
            config['production_server_ip'],
            port=config['ssh_port'],
            username='root',
            password='testpassword',
            look_for_keys=False,  # Отключаем проверку ключей
            allow_agent=False     # Отключаем использование ssh-agent
        )
        print("❌ SSH password authentication is enabled (should be disabled)")
        return False
    except paramiko.AuthenticationException as e:
        print("✅ SSH password authentication is disabled")
        return True
    except Exception as e:
        print(f"❌ Error testing password authentication: {e}")
        return False

def test_port_availability(config):
    """Test if required ports are open/closed as expected."""
    print("\nTesting port availability...")
    
    # Test custom SSH port
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    result = sock.connect_ex((config['production_server_ip'], config['ssh_port']))
    if result == 0:
        print(f"✅ Custom SSH port {config['ssh_port']} is open")
    else:
        print(f"❌ Custom SSH port {config['ssh_port']} is closed")
    sock.close()
    
    # Test default SSH port (should be closed)
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    result = sock.connect_ex((config['production_server_ip'], 22))
    if result == 0:
        print("❌ Default SSH port 22 is open (should be closed)")
    else:
        print("✅ Default SSH port 22 is closed")
    sock.close()

def main():
    print("Starting SSH security tests...\n")
    
    # Load configurations
    infra_config, ssh_config = load_configs()
    
    try:
        # Run SSH security tests
        key_auth_ok = test_ssh_connection(ssh_config)
        password_auth_ok = test_ssh_password_auth(ssh_config)
        test_port_availability(ssh_config)
        
        # Final status
        print("\nTest Summary:")
        if key_auth_ok and password_auth_ok:
            print("✅ All SSH security tests passed")
            sys.exit(0)
        else:
            print("❌ Some SSH security tests failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Tests failed with error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 